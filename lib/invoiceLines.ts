/* Heuristic line-item extraction for commercial invoices / packing lists.
   Rule-based (no LLM): finds the item table, splits rows, and pulls
   description / quantity / amounts / printed HTS# / material / origin.
   Results are ALWAYS shown in a preview UI for human confirmation. */

import { classifyDoc, type DocType } from "./docExtract";

export type ImportLine = {
  description: string;
  quantity: number | null;
  unit: string;
  unit_price: number | null;
  value_usd: number;
  hts: string | null;
  material: string;
  origin: string;
  confidence: "high" | "medium" | "low";
};

const MONEY = /(\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2})/g;
const HTS_RE = /\b(\d{4}\.\d{2}(?:\.\d{2})?)\b/;
const QTY_RE =
  /([\d,]+(?:\.\d+)?)\s*(PCS|PC|PIECES|CTNS|CARTONS?|SETS?|UNITS?|PAIRS?|PRS?|DOZ|DOZEN|KG|KGS|MTRS?|YDS?|YARDS?)\b/i;

const MATERIALS: [RegExp, string][] = [
  [/100%\s*cotton|cotton/i, "Cotton 棉"],
  [/polyester/i, "Polyester 涤纶"],
  [/nylon/i, "Nylon 尼龙"],
  [/spandex|elastane/i, "Spandex 氨纶"],
  [/silk/i, "Silk 真丝"],
  [/wool/i, "Wool 羊毛"],
  [/linen/i, "Linen 亚麻"],
  [/rayon|viscose/i, "Rayon 粘胶"],
  [/stainless\s*steel/i, "Stainless steel 不锈钢"],
  [/carbon\s*steel/i, "Carbon steel 碳钢"],
  [/\bsteel\b/i, "Steel 钢"],
  [/\biron\b/i, "Iron 铁"],
  [/alumin(i|u)m/i, "Aluminum 铝"],
  [/copper/i, "Copper 铜"],
  [/\bbrass\b/i, "Brass 黄铜"],
  [/\bplastic\b|pvc\b|abs\b|polypropylene/i, "Plastic 塑料"],
  [/\bwood(en)?\b/i, "Wood 木"],
  [/bamboo/i, "Bamboo 竹"],
  [/\bglass\b/i, "Glass 玻璃"],
  [/ceramic/i, "Ceramic 陶瓷"],
  [/leather/i, "Leather 皮革"],
  [/rubber/i, "Rubber 橡胶"],
  [/\bpaper\b/i, "Paper 纸"],
];

export function detectMaterial(desc: string): string {
  for (const [re, label] of MATERIALS) if (re.test(desc)) return label;
  return "";
}

function detectOrigin(text: string): string {
  const pats = [
    /COUNTRY\s*OF\s*ORIGIN\s*[:\-]?\s*([A-Z][A-Z .&'\-]{1,28})/i,
    /MADE\s*IN\s+([A-Z][A-Z .&'\-]{1,28})/i,
    /\bORIGIN\s*[:\-]\s*([A-Z][A-Z .&'\-]{1,28})/i,
  ];
  const votes = new Map<string, number>();
  for (const p of pats) {
    const g = new RegExp(p.source, p.flags.includes("g") ? p.flags : p.flags + "g");
    let m: RegExpExecArray | null;
    while ((m = g.exec(text)) !== null) {
      const v = m[1].replace(/[.\-:\s]+$/, "").trim().toUpperCase();
      if (v.length >= 2 && v.length <= 30 && !/^(THE|AND|WITH|FOR)\b/.test(v))
        votes.set(v, (votes.get(v) ?? 0) + 1);
    }
  }
  let best = "", bestN = 0;
  for (const [v, n] of votes) if (n > bestN) { best = v; bestN = n; }
  return best;
}

const HEADER_RE = /DESCRIPTION/i;
const HEADER_COLS = /(QTY|QUANTITY|PCS|QTN)/i;
const HEADER_AMT = /(AMOUNT|TOTAL|PRICE|VALUE)/i;
const STOP_RE =
  /^(TOTAL|SUBTOTAL|SUB\s*TOTAL|GRAND\s*TOTAL|REMARKS?|DECLARATION|SIGNATURE|AUTHORIZED|BANK\s*(DETAILS|INFO)|PAYMENT\s*TERMS|FREIGHT|INSURANCE)\b/i;

function cleanDesc(raw: string): string {
  let s = raw
    .replace(/^\s*\d{1,3}\s*[.)\-]\s*/, "") // leading item number
    .replace(HTS_RE, "") // HTS kept separately
    .replace(QTY_RE, "")
    .replace(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2})/g, "") // money tokens
    .replace(/\s{2,}/g, " ")
    .replace(/^[.\-:,;()\s]+|[.\-:,;()\s]+$/g, "")
    .trim();
  return s;
}

function parseRow(rowText: string, origin: string): ImportLine | null {
  const hts = rowText.match(HTS_RE)?.[1] ?? null;
  const moneys = [...rowText.matchAll(MONEY)].map((m) => parseFloat(m[1].replace(/,/g, "")));
  const qm = rowText.match(QTY_RE);
  const quantity = qm ? parseFloat(qm[1].replace(/,/g, "")) : null;
  const unit = qm ? qm[2].toUpperCase() : "";
  const value_usd = moneys.length ? moneys[moneys.length - 1] : 0;
  const unit_price = moneys.length >= 2 ? moneys[moneys.length - 2] : null;
  const description = cleanDesc(rowText);
  if (description.replace(/[^A-Za-z\u4e00-\u9fa5]/g, "").length < 3) return null;
  const confidence =
    hts && quantity != null && value_usd > 0 ? "high" : quantity != null && value_usd > 0 ? "medium" : "low";
  return {
    description,
    quantity,
    unit,
    unit_price,
    value_usd,
    hts,
    material: detectMaterial(description),
    origin,
    confidence,
  };
}

/* Fallback for docs without a detectable table header:
   lines shaped like "1  description ... qty ... amount". */
function fallbackRows(lines: string[], origin: string): ImportLine[] {
  const out: ImportLine[] = [];
  for (const ln of lines) {
    const m = ln.match(/^\s*\d{1,3}\s*[.)\-]\s*(.+)/);
    if (!m) continue;
    const row = parseRow(m[1], origin);
    if (row && row.value_usd > 0) out.push(row);
  }
  return out;
}

export function extractLineItems(rawText: string): {
  doc_type: DocType;
  origin_default: string;
  lines: ImportLine[];
} {
  const text = rawText.replace(/\r/g, "");
  const doc_type = classifyDoc(text);
  const origin_default = detectOrigin(text);
  const allLines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // B/L / arrival notice: single pseudo-line from goods description
  if (doc_type === "bill_of_lading" || doc_type === "arrival_notice" || doc_type === "other") {
    const goods =
      text.match(/DESCRIPTION\s*OF\s*GOODS\s*[:.]?\s*(.{10,160})/i)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
    if (!goods) return { doc_type, origin_default, lines: [] };
    return {
      doc_type,
      origin_default,
      lines: [
        {
          description: goods,
          quantity: null,
          unit: "",
          unit_price: null,
          value_usd: 0,
          hts: text.match(HTS_RE)?.[1] ?? null,
          material: detectMaterial(goods),
          origin: origin_default,
          confidence: "low",
        },
      ],
    };
  }

  // invoice / packing list: find the item table
  let headerIdx = -1;
  for (let i = 0; i < allLines.length; i++) {
    const ln = allLines[i];
    if (HEADER_RE.test(ln) && HEADER_COLS.test(ln) && HEADER_AMT.test(ln)) { headerIdx = i; break; }
  }

  const lines: ImportLine[] = [];
  if (headerIdx >= 0) {
    let pending: string[] = [];
    for (let i = headerIdx + 1; i < allLines.length; i++) {
      const ln = allLines[i];
      if (STOP_RE.test(ln)) break;
      const hasMoney = MONEY.test(ln);
      MONEY.lastIndex = 0;
      if (hasMoney) {
        const rowText = [...pending, ln].join(" ");
        pending = [];
        const row = parseRow(rowText, origin_default);
        if (row) lines.push(row);
      } else if (/[A-Za-z\u4e00-\u9fa5]{2,}/.test(ln) && ln.length < 220 && !/^(PAGE|INVOICE|PACKING)/i.test(ln)) {
        pending.push(ln);
      }
    }
  }
  if (lines.length === 0) {
    for (const r of fallbackRows(allLines, origin_default)) lines.push(r);
  }
  return { doc_type, origin_default, lines: lines.slice(0, 200) };
}
