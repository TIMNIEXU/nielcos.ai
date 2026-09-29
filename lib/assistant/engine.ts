/* AI 助手问答引擎 — grounded Q&A over the site's own databases.
   No LLM: every answer is computed from live tables and carries sources.
   Intents: duty rates (USITC 2026 + 232/301), shipment tracking (own
   shipments), regulations (compliance_updates), products (own catalog),
   help, and a scoped fallback. Thread context enables follow-ups like
   "那越南呢？" after a duty query. */

import { suggestHts } from "@/lib/hts";
import { suggestAdditionalDuties, type DutyRule } from "@/lib/additionalDuties";

export type Source = { label: string; detail?: string };
export type ThreadCtx = { lastHts?: string; lastOrigin?: string; lastGttid?: string };
export type Answer = { text: string; sources: Source[]; context: ThreadCtx };

type Sb = {
  from: (t: string) => any;
};

/* ---------- country aliases: zh / en -> canonical DB name ---------- */
const COUNTRIES: [string[], string][] = [
  [["中国", "china", "prc"], "China"],
  [["越南", "vietnam"], "Vietnam"],
  [["泰国", "thailand"], "Thailand"],
  [["台湾", "taiwan"], "Taiwan"],
  [["日本", "japan"], "Japan"],
  [["韩国", "south korea", "korea"], "South Korea"],
  [["印度", "india"], "India"],
  [["马来西亚", "malaysia"], "Malaysia"],
  [["印度尼西亚", "印尼", "indonesia"], "Indonesia"],
  [["菲律宾", "philippines"], "Philippines"],
  [["柬埔寨", "cambodia"], "Cambodia"],
  [["孟加拉", "bangladesh"], "Bangladesh"],
  [["巴基斯坦", "pakistan"], "Pakistan"],
  [["土耳其", "turkey", "turkiye"], "Turkey"],
  [["巴西", "brazil"], "Brazil"],
  [["墨西哥", "mexico"], "Mexico"],
  [["加拿大", "canada"], "Canada"],
  [["欧盟", "eu", "european union"], "European Union"],
  [["德国", "germany"], "Germany"],
  [["英国", "united kingdom", "uk"], "United Kingdom"],
  [["法国", "france"], "France"],
  [["意大利", "italy"], "Italy"],
  [["西班牙", "spain"], "Spain"],
  [["荷兰", "netherlands"], "Netherlands"],
  [["美国", "united states", "usa"], "United States"],
  [["澳大利亚", "australia"], "Australia"],
  [["新加坡", "singapore"], "Singapore"],
  [["马来", "malaysia"], "Malaysia"],
  [["老挝", "laos"], "Laos"],
  [["缅甸", "myanmar"], "Myanmar"],
  [["斯里兰卡", "sri lanka"], "Sri Lanka"],
];

function findOrigin(q: string): string | null {
  const low = q.toLowerCase();
  for (const [aliases, canonical] of COUNTRIES) {
    for (const a of aliases) {
      if (a.length <= 2 ? q.includes(a) : low.includes(a)) return canonical;
    }
  }
  return null;
}

function findHts(q: string): string | null {
  const m = q.replace(/,/g, "").match(/(\d{4})[.\s-]?(\d{2})(?:[.\s-]?(\d{2}))?(?:[.\s-]?(\d{2}))?/);
  if (!m) return null;
  // Up to 10 digits: classic Section 301 (China) rates are 10-digit specific.
  const digits = (m[1] + m[2] + (m[3] ?? "") + (m[4] ?? "")).slice(0, 10);
  if (digits.length < 6) return null;
  return digits.length >= 10
    ? `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}.${digits.slice(8, 10)}`
    : digits.length >= 8
      ? `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`
      : `${digits.slice(0, 4)}.${digits.slice(4)}`;
}

const DUTY_WORDS = /(税率|关税|duty|duties|tariff|加征|232|301)/i;
const SHIP_WORDS = /(柜|货到|到哪|track|shipment|milestone|eta|到港|船期)/i;
const REG_WORDS = /(法规|regulation|制裁|sanction|ofac|公告|federal register|合规|compliance|反倾销|antidumping)/i;
const PROD_WORDS = /(产品|product|sku)/i;
const HELLO = /^(你好|您好|hi|hello|hey|嗨|帮助|help|你能|功能|怎么用)\b/i;

/* ================= main entry ================= */
export async function answerQuestion(
  sb: Sb, question: string, locale: string, ctx: ThreadCtx
): Promise<Answer> {
  const q = question.trim();
  const zh = locale === "zh-CN";

  if (!q) return fallback(zh, ctx);
  if (HELLO.test(q) || (q.length < 12 && /(你|you).*(能|can)/i.test(q))) return help(zh);

  // Follow-up: new origin, same HTS ("那越南呢？")
  const originOnly = findOrigin(q);
  const htsInQ = findHts(q);
  if (!htsInQ && originOnly && ctx.lastHts && q.length < 24) {
    return dutyAnswer(sb, ctx.lastHts, originOnly, zh, ctx);
  }

  // Container / GTTID / MBL anywhere in the question wins for tracking
  const cntr = q.toUpperCase().match(/[A-Z]{4}\d{7}/);
  const gttid = q.toUpperCase().match(/NIEL-\d{4}-\d{4,}/);
  if (cntr || gttid) return shipmentAnswer(sb, (cntr ?? gttid)![0], zh, ctx);

  if (DUTY_WORDS.test(q)) {
    if (htsInQ) return dutyAnswer(sb, htsInQ, originOnly ?? ctx.lastOrigin ?? "China", zh, ctx);
    // keyword HTS mode: "bar steel 税率"
    const kw = q.replace(/(税率|关税|duty|duties|tariff|多少|what|is|the|for|from|import|进口|查询|查一下|查|？|\?)/gi, " ").trim();
    if (kw.replace(/\s+/g, "").length >= 3) return htsKeywordAnswer(sb, kw, originOnly ?? "China", zh, ctx);
    return needHts(zh, ctx);
  }

  if (SHIP_WORDS.test(q)) return shipmentHint(zh, ctx);
  if (REG_WORDS.test(q)) return regulationAnswer(sb, q, zh, ctx);
  if (PROD_WORDS.test(q)) return productAnswer(sb, q, zh, ctx);

  // Bare HTS digits with no duty words
  if (htsInQ) return dutyAnswer(sb, htsInQ, originOnly ?? "China", zh, ctx);

  return fallback(zh, ctx);
}

/* ================= duty ================= */
async function dutyAnswer(sb: Sb, htsNo: string, origin: string, zh: boolean, ctx: ThreadCtx): Promise<Answer> {
  // MFN schedule is 8-digit; the duty matcher gets the full (up to 10-digit) code.
  const digits = htsNo.replace(/[^0-9]/g, "");
  const hts8 = digits.length >= 8
    ? `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`
    : htsNo;
  const { data: row } = await sb.from("hts_schedule")
    .select("hts_no, description, general_rate, rate_text, revision")
    .eq("hts_no", hts8).maybeSingle();
  const { data: rules } = await sb.from("additional_duties").select("*");
  const allSugg = suggestAdditionalDuties(htsNo, origin, "", (rules ?? []) as DutyRule[]);
  const suggestions = allSugg.filter((s) => s.kind === "rate") as { duty_type: string; rate: number; source: string }[];
  const warnings = allSugg.filter((s) => s.kind === "warning") as { text: string }[];

  const sources: Source[] = [
    { label: zh ? "USITC HTS 2026 Rev 19" : "USITC HTS 2026 Rev 19", detail: htsNo },
    ...suggestions.map((s) => ({ label: s.source, detail: `${s.duty_type} ${s.rate}%` })),
  ];
  if (warnings.some((w) => w.text.includes("Classic Section 301"))) {
    sources.push({
      label: "USTR Section 301 tariff actions",
      detail: zh ? "List 1–4A（2018–2019，仍然有效）" : "Lists 1–4A (2018–2019, still in effect)",
    });
  }

  if (!row) {
    return {
      text: zh
        ? `税库里没找到 ${htsNo}。检查下编码对不对（6–10 位数字），或者换个相近的编码再问我。`
        : `No match for ${htsNo} in the tariff library. Double-check the code (6–10 digits) or try a nearby one.`,
      sources: [], context: { ...ctx, lastHts: htsNo, lastOrigin: origin },
    };
  }

  const mfn = row.general_rate != null ? Number(row.general_rate) : null;
  const addRate = suggestions.reduce((a, s) => a + Number(s.rate || 0), 0);
  const lines: string[] = zh ? [
    `${htsNo}（${origin}）预估进口税率：`,
    `• 最惠国税率 MFN：${row.rate_text ?? (mfn != null ? mfn + "%" : "—")}`,
    ...suggestions.map((s) => `• ${s.duty_type} 附加：${s.rate}%（${s.source}）`),
    `合计约 ${(mfn ?? 0) + addRate}%（按货值计）。`,
    `为估算值，正式申报前请核实 232 衍生品名单与 301 豁免。`,
  ] : [
    `Estimated import duty for ${htsNo} (${origin}):`,
    `• MFN: ${row.rate_text ?? (mfn != null ? mfn + "%" : "—")}`,
    ...suggestions.map((s) => `• ${s.duty_type} additional: ${s.rate}% (${s.source})`),
    `Total ≈ ${(mfn ?? 0) + addRate}% of entered value.`,
    `Advisory only — verify the 232 derivative list and 301 exclusions before filing.`,
  ];
  if (row.description) lines.splice(1, 0, zh ? `品名：${row.description}` : `Description: ${row.description}`);
  for (const w of warnings) lines.push(zh ? `⚠️ 注意：${w.text}` : `⚠️ Note: ${w.text}`);

  return { text: lines.join("\n"), sources, context: { ...ctx, lastHts: htsNo, lastOrigin: origin } };
}

async function htsKeywordAnswer(sb: Sb, kw: string, origin: string, zh: boolean, ctx: ThreadCtx): Promise<Answer> {
  const { data: rows } = await sb.from("hts_schedule").select("hts_no, description, general_rate, keywords, rate_text");
  const cands = suggestHts(kw, (rows ?? []) as any[]).slice(0, 3);
  if (!cands.length) return fallback(zh, ctx);
  const lines: string[] = zh
    ? [`“${kw}” 匹配到 ${cands.length} 个税号：`]
    : [`${cands.length} HTS candidates for "${kw}":`];
  cands.forEach((c: any, i: number) => {
    lines.push(`${i + 1}. ${c.hts_no} — ${c.rate != null ? c.rate + "%" : "—"}${c.description ? `（${c.description.slice(0, 60)}）` : ""}`);
  });
  lines.push(zh
    ? `告诉我编号（比如第 1 个），我按${origin}给你算完整税率。`
    : `Tell me which one (e.g. the 1st) and I'll compute the full rate for ${origin}.`);
  return {
    text: lines.join("\n"),
    sources: [{ label: "USITC HTS 2026 Rev 19", detail: zh ? "关键词匹配" : "keyword match" }],
    context: ctx,
  };
}

function needHts(zh: boolean, ctx: ThreadCtx): Answer {
  return {
    text: zh
      ? `想查哪个产品的税率？给我 HTS 编码（比如 9506.91.00）+ 原产国（比如 中国），我直接调税率库给你算。`
      : `Which product's duty rate? Give me the HTS code (e.g. 9506.91.00) + origin country and I'll look it up live.`,
    sources: [], context: ctx,
  };
}

/* ================= shipment ================= */
async function shipmentAnswer(sb: Sb, key: string, zh: boolean, ctx: ThreadCtx): Promise<Answer> {
  const k = key.toUpperCase();
  const { data } = await sb.from("shipments")
    .select("id, gttid, mbl_no, container_number, containers, status, origin, destination, current_location, eta, milestones, updated_at")
    .or(`mbl_no.ilike.%${k}%,container_number.ilike.%${k}%,gttid.ilike.%${k}%`)
    .order("updated_at", { ascending: false }).limit(20);
  let list: any[] = data ?? [];
  if (list.length < 20) {
    const { data: all } = await sb.from("shipments")
      .select("id, gttid, mbl_no, container_number, containers, status, origin, destination, current_location, eta, milestones, updated_at")
      .order("updated_at", { ascending: false }).limit(50);
    const ids = new Set(list.map((s: any) => s.id));
    list = list.concat((all ?? []).filter((s: any) => {
      if (ids.has(s.id)) return false;
      const cs: any[] = Array.isArray(s.containers) ? s.containers : [];
      return cs.some((c) => String(c?.container ?? c ?? "").toUpperCase().includes(k));
    }));
  }
  if (!list.length) {
    return {
      text: zh ? `没找到 ${k}。确认下柜号/GTTID 对不对，或者它是不是在别的公司名下。` : `No shipment found for ${k}. Check the number or whether it belongs to another company.`,
      sources: [], context: ctx,
    };
  }
  const s = list[0];
  const ms: any[] = Array.isArray(s.milestones) ? s.milestones : [];
  const last = ms.slice(-3).map((m: any) => `• ${m?.at ?? m?.date ?? ""} ${m?.title ?? m?.event ?? ""}`.trim()).filter(Boolean);
  const lines: string[] = zh ? [
    `${s.gttid ?? ""} ${k} 当前状态：${s.status ?? "—"}`,
    `路线：${s.origin ?? "—"} → ${s.destination ?? "—"}`,
    ...(s.current_location ? [`当前位置：${s.current_location}`] : []),
    ...(s.eta ? [`预计到港：${s.eta}`] : []),
    ...(s.mbl_no ? [`MB/L：${s.mbl_no}`] : []),
    ...last,
  ] : [
    `${s.gttid ?? ""} ${k} — status: ${s.status ?? "—"}`,
    `Route: ${s.origin ?? "—"} → ${s.destination ?? "—"}`,
    ...(s.current_location ? [`Current location: ${s.current_location}`] : []),
    ...(s.eta ? [`ETA: ${s.eta}`] : []),
    ...(s.mbl_no ? [`MB/L: ${s.mbl_no}`] : []),
    ...last,
  ];
  return {
    text: lines.join("\n"),
    sources: [{ label: zh ? "货运模块" : "Freight module", detail: s.gttid ?? k }],
    context: { ...ctx, lastGttid: s.gttid ?? undefined },
  };
}

function shipmentHint(zh: boolean, ctx: ThreadCtx): Answer {
  return {
    text: zh
      ? `把柜号（比如 CWNU2262061）或 GTTID（比如 NIEL-2026-000001）发我，我查这票货的状态、位置和节点。`
      : `Send me a container number (e.g. CWNU2262061) or GTTID (e.g. NIEL-2026-000001) and I'll pull its status, location and milestones.`,
    sources: [], context: ctx,
  };
}

/* ================= regulation ================= */
async function regulationAnswer(sb: Sb, q: string, zh: boolean, ctx: ThreadCtx): Promise<Answer> {
  const kws = q.replace(/(法规|regulation|制裁|sanction|公告|federal register|合规|compliance|查|查询|一下|最新|最近|有|什么|吗|？|\?)/gi, " ")
    .split(/\s+/).map((s) => s.trim()).filter((s) => s.length >= 2).slice(0, 3);
  let query = sb.from("compliance_updates")
    .select("title, title_zh, body, body_zh, source, effective_date")
    .order("effective_date", { ascending: false }).limit(30);
  const { data } = await query;
  const rows: any[] = data ?? [];
  const scored = rows.map((r) => {
    const hay = `${r.title ?? ""} ${r.title_zh ?? ""} ${r.body ?? ""} ${r.body_zh ?? ""}`.toLowerCase();
    let score = 0;
    for (const k of kws) if (hay.includes(k.toLowerCase())) score += 2;
    if (/232/.test(q) && hay.includes("232")) score += 3;
    if (/301/.test(q) && hay.includes("301")) score += 3;
    return { r, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

  if (!scored.length) {
    return {
      text: zh
        ? `法规库里没找到相关的。换个关键词试试（比如"232 钢铝"、"301 附加税"、"OFAC 制裁"），或者去合规模块看完整列表。`
        : `Nothing matching in the regulation library. Try another keyword (e.g. "232 steel", "301 additional", "OFAC sanctions") or browse the Compliance module.`,
      sources: [], context: ctx,
    };
  }
  const lines: string[] = zh ? [`找到 ${scored.length} 条相关法规：`] : [`${scored.length} matching regulations:`];
  const sources: Source[] = [];
  scored.forEach(({ r }, i: number) => {
    const title = (zh && r.title_zh) ? r.title_zh : r.title;
    const body = (zh && r.body_zh ? r.body_zh : r.body ?? "").slice(0, 160);
    lines.push(`\n${i + 1}. ${title}${r.effective_date ? `（${r.effective_date} 生效）` : ""}\n   ${body}${body.length >= 160 ? "…" : ""}`);
    sources.push({ label: title, detail: r.source ?? (zh ? "联邦公报同步" : "Federal Register sync") });
  });
  lines.push(zh ? `\n以上为库内摘要，正式引用以原文为准。` : `\nSummaries from the library; refer to the original text for formal citation.`);
  return { text: lines.join("\n"), sources, context: ctx };
}

/* ================= product ================= */
async function productAnswer(sb: Sb, q: string, zh: boolean, ctx: ThreadCtx): Promise<Answer> {
  const kw = q.replace(/(产品|product|sku|查|查询|一下|税率|关税|的|？|\?)/gi, " ").trim().split(/\s+/).filter(Boolean)[0] ?? "";
  if (kw.length < 2) {
    return {
      text: zh ? `告诉我 SKU 或产品名关键词，我查你产品库里的 HTS 和原产国。` : `Give me a SKU or product name keyword and I'll look up its HTS and origin in your catalog.`,
      sources: [], context: ctx,
    };
  }
  const { data } = await sb.from("products")
    .select("sku, name_en, name_zh, hts_code, origin_country")
    .or(`sku.ilike.%${kw}%,name_en.ilike.%${kw}%,name_zh.ilike.%${kw}%`)
    .limit(5);
  const rows: any[] = data ?? [];
  if (!rows.length) {
    return {
      text: zh ? `产品库里没找到“${kw}”。去产品模块确认下 SKU 或名称。` : `No product matching "${kw}" in your catalog. Check the SKU or name in the Products module.`,
      sources: [], context: ctx,
    };
  }
  const lines: string[] = zh ? [`找到 ${rows.length} 个产品：`] : [`${rows.length} products found:`];
  rows.forEach((p: any, i: number) => {
    const name = (zh && p.name_zh ? p.name_zh : p.name_en) ?? "";
    lines.push(`${i + 1}. ${p.sku}${name ? ` — ${name}` : ""}${p.hts_code ? `（HTS ${p.hts_code}）` : ""}${p.origin_country ? ` ${p.origin_country}` : ""}`);
  });
  const first = rows[0];
  if (first?.hts_code) {
    lines.push(zh
      ? `\n想算关税的话直接问我"${first.hts_code} ${first.origin_country ?? ""} 税率多少"。`
      : `\nAsk me "${first.hts_code} ${first.origin_country ?? ""} duty rate" for the full calculation.`);
  }
  return {
    text: lines.join("\n"),
    sources: [{ label: zh ? "产品模块" : "Products module", detail: zh ? "自有产品库" : "own catalog" }],
    context: { ...ctx, lastHts: first?.hts_code ?? ctx.lastHts, lastOrigin: first?.origin_country ?? ctx.lastOrigin },
  };
}

/* ================= help & fallback ================= */
function help(zh: boolean): Answer {
  return {
    text: zh ? [
      `我是你的贸易助手，直接问就行：`,
      `• 查税率："9506.91.00 从中国进口税率多少？"`,
      `• 查货运："柜 CWNU2262061 到哪了？"`,
      `• 查法规："232 钢铝关税有什么新规？"`,
      `• 查产品："查产品 9506910030"`,
      `每条回答都带出处。追问可以直接说"怎么算的"、"那越南呢？"。`,
    ].join("\n") : [
      `I'm your trade assistant — just ask:`,
      `• Duty: "duty rate for 9506.91.00 from China?"`,
      `• Tracking: "where is container CWNU2262061?"`,
      `• Regulations: "any new 232 steel rules?"`,
      `• Products: "look up product 9506910030"`,
      `Every answer comes with sources. Follow-ups like "and from Vietnam?" work too.`,
    ].join("\n"),
    sources: [], context: {},
  };
}

function fallback(zh: boolean, ctx: ThreadCtx): Answer {
  return {
    text: zh
      ? `这个问题我暂时答不上来。我现在能做的是：查税率（HTS+原产国）、查货运（柜号/GTTID）、查法规（关键词）、查产品（SKU）。换个问法试试？`
      : `I can't answer that yet. What I do now: duty rates (HTS + origin), tracking (container/GTTID), regulations (keywords), products (SKU). Try rephrasing?`,
    sources: [], context: ctx,
  };
}
