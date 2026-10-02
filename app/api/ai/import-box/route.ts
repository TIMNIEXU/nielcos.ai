import { NextRequest, NextResponse } from "next/server";
import { checkRate, clientIpHash, saveImportPlan } from "@/lib/rateLimit";
import {
  chatCompletion,
  isConfigured,
  type ChatMsg,
} from "@/lib/ai/provider";
import { IMPORT_BOX_TOOLS, runTool } from "@/lib/ai/tools";
import { suggestHts, matchPga } from "@/lib/hts";
import { suggestAdditionalDuties, type DutyRule } from "@/lib/additionalDuties";

/* POST /api/ai/import-box — GRI-001 V2, public, no login.
   Body: JSON { text, locale } or multipart { text?, locale?, file? }.
   Server-side LLM (OpenAI-compatible) with deterministic tools:
   the model organizes; every rate/fee figure comes from a tool result.
   Rate-limited (20/hour/IP, DB-backed) and archived to ai_import_plans. */

const RATE_LIMIT = 20;
const RATE_WINDOW_MIN = 60;
const MAX_ROUNDS = 6;

const LANG: Record<string, string> = {
  en: "English",
  "zh-CN": "Simplified Chinese",
  "zh-TW": "Traditional Chinese",
  vi: "Vietnamese",
  ko: "Korean",
  ja: "Japanese",
};

function systemPrompt(lang: string): string {
  return `You are NIEL AI, the import planning assistant of NIEL COS (nielcos.ai), a US import trade platform.
The user describes what they want to import into the United States in free text (any language) and may attach a commercial document.
Your job: build a structured Import Plan as a single JSON object.

STRICT RULES:
1. ALL duty rates, fees, and monetary figures MUST come from tool results. NEVER invent, estimate, or recall a rate from memory. If a tool returns no data, say so honestly in the plan.
2. Always call lookup_duty for the product (description and/or HTS from the user or the document). Always call estimate_fees with the shipment value and mode. Call search_regulations when the product may touch PGA agencies (food, electronics, textiles, chemicals, children's products, etc.).
3. HTS candidates: up to 3, each with confidence 0-100 and a one-line "why" grounded in the tool result. hts_note must say candidates are suggestions and final classification must be confirmed by a licensed customs broker before filing.
4. next_steps: 3-4 actions. "href" must be one of exactly: /landed-cost, /classify, /insurance, /bond, /contact (the client adds the locale prefix). Each needs a short "why".
5. Write every user-facing string in ${lang}. Keep each string under 200 characters.
6. Output ONLY the JSON object. No markdown, no code fences.

JSON SCHEMA:
{
  "summary": "2-3 sentence overview of the import plan",
  "product": {
    "name": "product name",
    "material": "main material if known",
    "intended_use": "intended use if known",
    "origin": "country of origin",
    "value_usd": 0,
    "hts_candidates": [ { "hts_no": "8-digit code", "description": "official description", "confidence": 0, "why": "one line" } ],
    "hts_note": "candidates disclaimer"
  },
  "cost_estimate": {
    "value_usd": 0,
    "lines": [ { "label": "duty line label", "rate_pct": 0, "amount_usd": 0 } ],
    "total_duty_usd": 0,
    "fees": { "mpf_usd": 0, "hmf_usd": 0 },
    "landed_usd": 0,
    "disclaimer": "estimate disclaimer"
  },
  "compliance": {
    "pga_flags": ["possible PGA requirements, or empty"],
    "ad_cvd_note": "AD/CVD risk note or 'no data'",
    "regulatory_notes": ["recent regulatory notes, or empty"]
  },
  "next_steps": [ { "label": "action label", "href": "/landed-cost", "why": "short reason" } ],
  "disclaimer": "Estimates only. Verify with a licensed customs broker before filing."
}`;
}

function extractJson(raw: string | null): any | null {
  if (!raw) return null;
  let s = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(s.slice(a, b + 1));
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const ipHash = clientIpHash(req);
  const allowed = await checkRate(ipHash, "import-box", RATE_LIMIT, RATE_WINDOW_MIN);
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", message: "Too many requests — please try again in an hour." },
      { status: 429 }
    );
  }
  // ---- input: JSON or multipart ----
  let text = "";
  let locale = "en";
  let file: File | null = null;
  const ctype = req.headers.get("content-type") ?? "";
  try {
    if (ctype.includes("multipart/form-data")) {
      const form = await req.formData();
      const t = form.get("text");
      const l = form.get("locale");
      const f = form.get("file");
      if (typeof t === "string") text = t;
      if (typeof l === "string") locale = l;
      if (f instanceof File) file = f;
    } else {
      const body = await req.json().catch(() => ({}));
      text = String(body.text ?? "");
      locale = String(body.locale ?? "en");
    }
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  text = text.slice(0, 2000).trim();
  const lang = LANG[locale] ?? "English";
  const baseUrl = new URL(req.url).origin;

  // ---- document context via the existing deterministic extractor ----
  let docCtx = "";
  if (file && file.size > 0) {
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch(`${baseUrl}/api/public/extract`, { method: "POST", body: form });
      const d = await r.json();
      if (d.ok) {
        docCtx =
          `Extracted commercial document (${d.lineCount} line(s)): ` +
          `product="${d.productName ?? ""}", material="${d.material ?? ""}", ` +
          `intended use="${d.intendedUse ?? ""}", origin="${d.origin ?? ""}", ` +
          `total invoice value=${d.invValue ?? 0} USD, ` +
          (d.hts
            ? `HTS printed on document: ${d.hts}.`
            : `HTS candidates from document: ${(d.htsCandidates ?? []).map((c: any) => c.hts_no).join(", ") || "none"}.`);
      } else {
        docCtx = `Document upload could not be read (${d.error}). Proceed with the text description only.`;
      }
    } catch (e) {
      docCtx = `Document extraction failed (${(e as Error)?.message}). Proceed with the text description only.`;
    }
  }
  if (!text && !docCtx) {
    return NextResponse.json({ ok: false, error: "empty_input" }, { status: 400 });
  }

  // ---- Golden Path honesty: when no LLM key is configured, fall back to the
  //    deterministic rules engine instead of failing. Same plan shape, clearly
  //    labeled as rule-based. Upgrades to full AI automatically once configured.
  if (!isConfigured()) {
    const rulePlan = await buildRulePlan(text, docCtx, locale);
    void saveImportPlan(text || docCtx.slice(0, 500), locale, rulePlan, ipHash);
    return NextResponse.json({ ok: true, plan: rulePlan, source: "rules" });
  }

  // ---- tool loop ----
  const messages: ChatMsg[] = [
    { role: "system", content: systemPrompt(lang) },
    {
      role: "user",
      content:
        `User import request: ${text || "(no text — see document)"}\n` +
        (docCtx ? `${docCtx}\n` : "") +
        `Locale: ${locale}. Build the Import Plan JSON now.`,
    },
  ];

  let finalText: string | null = null;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await chatCompletion({ messages, tools: IMPORT_BOX_TOOLS });
    if (!res.ok) {
      const status = res.error === "timeout" ? 504 : 502;
      return NextResponse.json(
        { ok: false, error: res.error, detail: res.detail },
        { status }
      );
    }
    const msg = res.message;
    messages.push({
      role: "assistant",
      content: msg.content ?? null,
      tool_calls: msg.tool_calls,
    });
    const calls = msg.tool_calls ?? [];
    if (!calls.length) {
      finalText = msg.content;
      break;
    }
    for (const c of calls) {
      const out = await runTool(c.function?.name ?? "", c.function?.arguments ?? "{}", { baseUrl });
      messages.push({
        role: "tool",
        tool_call_id: c.id,
        name: c.function?.name,
        content: out,
      });
    }
  }

  const plan = extractJson(finalText);
  if (!plan || typeof plan !== "object" || !plan.summary) {
    console.error("ai import-box: bad plan JSON");
    return NextResponse.json({ ok: false, error: "bad_plan" }, { status: 502 });
  }

  // Archive (best effort, never blocks the response).
  void saveImportPlan(text || docCtx.slice(0, 500), locale, plan, ipHash);

  return NextResponse.json({ ok: true, plan });
}

/* ---------- rules-engine fallback (no LLM key) ---------- */

const RULES_DISCLAIMER: Record<string, string> = {
  en: "Rule-based draft — no AI key is configured on this site yet. HTS candidates, duties and fees come from the same deterministic tables the AI uses. Confirm the HTS with a licensed customs broker before filing.",
  "zh-CN": "规则引擎草稿版——本站尚未配置 AI 密钥。HTS 候选、关税和费用均来自与 AI 相同的数据表。正式申报前请由持证报关行确认 HTS。",
  "zh-TW": "規則引擎草稿版——本站尚未設定 AI 金鑰。HTS 候選、關稅和費用均來自與 AI 相同的資料表。正式申報前請由持證報關行確認 HTS。",
  vi: "Bản nháp theo quy tắc — trang này chưa cấu hình AI key. Mã HTS, thuế và phí đều từ cùng bảng dữ liệu mà AI dùng. Hãy xác nhận HTS với customs broker được cấp phép trước khi khai báo.",
  ko: "규칙 엔진 초안 — 이 사이트에 아직 AI 키가 설정되지 않았습니다. HTS 후보·관세·수수료는 AI와 동일한 데이터 테이블에서 가져옵니다. 신고 전 반드시 licensed customs broker에게 HTS를 확인받으세요.",
  ja: "ルールエンジンのドラフト版 — このサイトにはまだAIキーが設定されていません。HTS候補・関税・手数料はAIと同じデータテーブル由来です。申告前にlicensed customs brokerにHTSを確認してください。",
};

const RULES_WHY: Record<string, string> = {
  en: "Keyword match against the USITC HTS library",
  "zh-CN": "与 USITC HTS 库的关键词匹配",
  "zh-TW": "與 USITC HTS 庫的關鍵詞匹配",
  vi: "Khớp từ khóa với thư viện HTS của USITC",
  ko: "USITC HTS 라이브러리와의 키워드 매칭",
  ja: "USITC HTSライブラリとのキーワードマッチ",
};

const COUNTRIES = [
  "China", "Vietnam", "Mexico", "India", "Taiwan", "Thailand", "Malaysia",
  "Indonesia", "Philippines", "Bangladesh", "Pakistan", "South Korea", "Korea",
  "Japan", "Germany", "Italy", "France", "Spain", "Canada", "Turkey", "Brazil",
  "Cambodia", "Sri Lanka", "Myanmar", "United Kingdom", "Netherlands",
];

function parseOrigin(q: string): string {
  for (const c of COUNTRIES) {
    if (new RegExp(`\\b${c.replace(/ /g, "\\s+")}\\b`, "i").test(q)) {
      return c === "Korea" ? "South Korea" : c;
    }
  }
  return "";
}

function parseValue(q: string): number | null {
  const m =
    q.match(/(?:US\$|\$)\s*([\d,]+(?:\.\d{1,2})?)/i) ||
    q.match(/([\d,]+(?:\.\d{1,2})?)\s*USD/i);
  if (!m) return null;
  const v = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(v) && v > 0 ? v : null;
}

function mpfFor(entryDate: string) {
  const fy27 = entryDate >= "2026-10-01"; // FY2027 begins 2026-10-01
  return { rate: 0.3464, min: fy27 ? 34.58 : 33.58, max: fy27 ? 670.86 : 651.5 };
}

async function buildRulePlan(text: string, docCtx: string, locale: string) {
  const q = `${text} ${docCtx}`.slice(0, 2000);
  const loc = RULES_DISCLAIMER[locale] ? locale : "en";
  const origin = parseOrigin(q);
  const value = parseValue(q);
  const name = (text.split(/[.\n,;]/)[0] || "Imported goods").trim().slice(0, 120) || "Imported goods";

  const { createClient } = await import("@/lib/supabase/server");
  const sb = await createClient();
  const [{ data: htsRows }, { data: dutyRules }, { data: pgaRules }] = await Promise.all([
    sb.from("hts_schedule").select("hts_no, description, general_rate, keywords, rate_text"),
    sb.from("additional_duties").select("*"),
    sb.from("pga_rules").select("hts_prefix, agency, agency_cn, note"),
  ]);

  const cands = suggestHts(q, ((htsRows ?? []) as any[]).slice(0, 20000), 3);
  const top = cands[0] ?? null;
  const digits = top ? top.hts_no.replace(/[^0-9]/g, "") : "";
  const dutySugs = suggestAdditionalDuties(digits || null, origin, "", (dutyRules ?? []) as DutyRule[]);
  const pga = top ? matchPga(top.hts_no, (pgaRules ?? []) as any[]) : [];

  const v = value ?? 0;
  const lines: { label?: string; rate_pct?: number | null; amount_usd?: number }[] = [];
  let totalDuty = 0;
  if (top && typeof top.rate === "number" && Number.isFinite(top.rate)) {
    const amt = (v * top.rate) / 100;
    totalDuty += amt;
    lines.push({ label: `MFN duty — HTS ${top.hts_no}`, rate_pct: top.rate, amount_usd: Math.round(amt * 100) / 100 });
  }
  for (const d of dutySugs) {
    if (d.kind === "rate") {
      const amt = (v * d.rate) / 100;
      totalDuty += amt;
      lines.push({
        label: `${d.duty_type} (${d.source})`,
        rate_pct: d.rate,
        amount_usd: Math.round(amt * 100) / 100,
      });
    }
  }
  const warnings = dutySugs.filter((d) => d.kind === "warning").map((d: any) => d.text_zh && loc.startsWith("zh") ? d.text_zh : d.text);

  const sched = mpfFor(new Date().toISOString().slice(0, 10));
  const mpfRaw = (v * sched.rate) / 100;
  const mpf = v > 0 ? Math.min(sched.max, Math.max(sched.min, mpfRaw)) : 0;
  const hmf = v > 0 ? (v * 0.125) / 100 : 0; // ocean default
  const landed = v + totalDuty + mpf + hmf;

  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    summary: `${name}${origin ? ` — origin ${origin}` : ""}${v ? `, customs value $${v.toLocaleString()}` : ""}. ${RULES_DISCLAIMER[loc]}`,
    product: {
      name,
      origin: origin || undefined,
      value_usd: v || undefined,
      hts_candidates: cands.map((c) => ({
        hts_no: c.hts_no,
        description: c.description,
        confidence: Math.min(0.95, c.score / 100),
        why: RULES_WHY[loc],
      })),
      hts_note: RULES_DISCLAIMER[loc],
    },
    cost_estimate: {
      value_usd: v || undefined,
      lines,
      total_duty_usd: r2(totalDuty),
      fees: { mpf_usd: r2(mpf), hmf_usd: r2(hmf) },
      landed_usd: r2(landed),
      disclaimer: RULES_DISCLAIMER[loc],
    },
    compliance: {
      pga_flags: pga.map((r: any) => r.agency),
      ad_cvd_note: warnings[0] ?? undefined,
      regulatory_notes: warnings.slice(1, 3),
    },
    next_steps: [
      { label: "Refine HTS", href: "/classify", why: "Top-3 candidates with confidence" },
      { label: "Full duty breakdown", href: "/landed-cost", why: "Line-by-line landed cost" },
      { label: "Get service quotes", href: "/quote", why: "Real human quotes" },
    ],
    disclaimer: RULES_DISCLAIMER[loc],
  };
}
