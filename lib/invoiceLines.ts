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
// Chinese forwarder worksheet header row — never a product line
const CN_HEADER_RE = /序号.*(税号|海关编码).*材质|货物描述.*(税号|海关编码)/;

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

/* ---------------- Excel: column-aware parsing ---------------- */
/* Forwarder worksheets (e.g. 序号/货物描述/中文品名/税号/税率/材质/用途/
   单价/数量/总价/箱数/毛重/净重/体积) parse far better by column position
   than by flattening cells into text lines. */

const COL_GROUPS: [string[], string][] = [
  [["DESCRIPTION OF GOODS", "GOODS DESCRIPTION", "PRODUCT NAME", "DESCRIPTION", "货物描述", "货名", "品名"], "description"],
  [["中文品名", "中文名称"], "cn_name"],
  [["海关编码", "COMMODITY CODE", "HS CODE", "HSCODE", "税号", "HTS"], "hts"],
  [["DUTY RATE", "税率"], "rate"],
  [["MATERIAL", "材质"], "material"],
  [["END USE", "PURPOSE", "用途"], "purpose"],
  [["申报单价", "UNIT PRICE", "单价"], "unit_price"],
  [["产品数量", "QUANTITY", "数量", "QTY"], "quantity"],
  [["产品总价", "TOTAL VALUE", "TOTAL AMOUNT", "总值", "总价", "AMOUNT"], "value"],
  [["COUNTRY OF ORIGIN", "产地国", "ORIGIN", "产地"], "origin"],
];

function mapColumns(headerRow: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((cell, idx) => {
    const c = cell.toUpperCase().replace(/\s+/g, " ").trim();
    if (!c) return;
    let bestGroup = "", bestLen = 0;
    for (const [kws, group] of COL_GROUPS) {
      for (const kw of kws) {
        if (c.includes(kw.toUpperCase()) && kw.length > bestLen) {
          bestGroup = group;
          bestLen = kw.length;
        }
      }
    }
    if (bestGroup && ![...map.keys()].includes(bestGroup)) map.set(bestGroup, idx);
  });
  return map;
}

function headerScore(row: string[]): number {
  return mapColumns(row).size;
}

function numOf(cell: string): number | null {
  const m = cell.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

export function normalizeHts(cell: string): string | null {
  const d = cell.replace(/\D/g, "");
  if (d.length < 8) {
    const m = cell.match(HTS_RE);
    return m ? m[1] : null;
  }
  const h8 = d.slice(0, 8);
  return `${h8.slice(0, 4)}.${h8.slice(4, 6)}.${h8.slice(6, 8)}`;
}

export function extractSheetRows(sheets: string[][][]): {
  lines: (ImportLine & { doc_rate: number | null })[];
  origin_default: string;
} | null {
  let bestRows: string[][] | null = null;
  let bestMap: Map<string, number> | null = null;
  let bestScore = -1;
  let bestHeader = 0;
  let origin_default = "";
  for (const rows of sheets) {
    const flat = rows.map((r) => r.join(" ")).join("\n");
    const o = detectOrigin(flat);
    if (o && !origin_default) origin_default = o;
    if (bestRows) break;
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const score = headerScore(rows[i]);
      if (score >= 3 && score > bestScore) {
        bestRows = rows;
        bestMap = mapColumns(rows[i]);
        bestScore = score;
        bestHeader = i;
        break;
      }
    }
  }
  if (!bestRows || !bestMap) return null;
  const rows = bestRows;
  const map = bestMap;
  const headerIdx = bestHeader;
  const cell = (r: string[], g: string) => {
    const i = map.get(g);
    return i === undefined ? "" : (r[i] ?? "").trim();
  };

  const lines: (ImportLine & { doc_rate: number | null })[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const desc = cell(r, "description");
    if (!desc || /^(合计|总计|TOTAL|REMARKS?|备注)/i.test(desc)) {
      // stop at totals row when first column is numeric-empty and desc has total
      if (/合计|总计|^TOTAL/i.test(r.join(" "))) break;
      continue;
    }
    const cn = cell(r, "cn_name");
    const purpose = cell(r, "purpose");
    let description = desc;
    if (cn && !description.includes(cn)) description += ` ${cn}`;
    if (purpose && !description.includes(purpose)) description += `（用途: ${purpose}）`;

    const hts = normalizeHts(cell(r, "hts"));
    const rateRaw = cell(r, "rate").replace("%", "").trim();
    const doc_rate = rateRaw !== "" && !isNaN(Number(rateRaw)) ? Number(rateRaw) : null;
    const qCell = cell(r, "quantity");
    const qm = qCell.match(QTY_RE);
    const quantity = qm ? parseFloat(qm[1].replace(/,/g, "")) : numOf(qCell);
    const unit = qm ? qm[2].toUpperCase() : "";
    const value_usd = numOf(cell(r, "value")) ?? 0;
    const unit_price = numOf(cell(r, "unit_price"));
    const material = cell(r, "material") || detectMaterial(description);
    const origin = cell(r, "origin") || origin_default;

    lines.push({
      description,
      quantity,
      unit,
      unit_price,
      value_usd,
      hts,
      material,
      origin,
      doc_rate,
      confidence: hts && quantity != null && value_usd > 0 ? "high" : value_usd > 0 ? "medium" : "low",
    });
    if (lines.length >= 200) break;
  }
  return { lines, origin_default };
}
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
      if (CN_HEADER_RE.test(ln)) continue; // worksheet header row, not a line item
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
