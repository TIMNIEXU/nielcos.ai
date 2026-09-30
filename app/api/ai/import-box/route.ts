import { NextRequest, NextResponse } from "next/server";
import { checkRate, clientIpHash, saveImportPlan } from "@/lib/rateLimit";
import {
  chatCompletion,
  isConfigured,
  type ChatMsg,
} from "@/lib/ai/provider";
import { IMPORT_BOX_TOOLS, runTool } from "@/lib/ai/tools";

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
  if (!isConfigured()) {
    return NextResponse.json(
      { ok: false, error: "not_configured" },
      { status: 503 }
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
