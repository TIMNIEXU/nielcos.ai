/* Phase B — Document Intelligence: classify + extract key fields from trade PDFs.
   Arrival-notice extractor is ported from the proven jomaus admin parser. */

export type DocType =
  | "arrival_notice"
  | "bill_of_lading"
  | "commercial_invoice"
  | "packing_list"
  | "other";

export type Cntr = {
  container: string;
  seal: string;
  type: string;
  packages: string;
  weight_kgs: number | null;
  cbm: number | null;
};

export type DocExtraction = {
  doc_type: DocType;
  fields: Record<string, string>;
  containers: Cntr[];
  charges: { description: string; amount: number }[];
  found: string[];
};

/* ---------------- text helpers ---------------- */

export function norm(text: string): string {
  return text.replace(/\r/g, "\n").replace(/[ \t\u00a0]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

const STOP =
  /\b(PORT OF|PLACE OF|FINAL DESTINATION|VESSEL|VOYAGE|FREIGHT|BROKER|CARGO|ETA\b|ETD\b|AMS|IT\b|DESCRIPTION|WEIGHT|MEASUREMENT|REMARKS?|CHARGES?|INVOICE|TOTAL|BALANCE|FIRM|AVAILABLE|LAST FREE)\b/;

function afterLabel(text: string, labelRe: RegExp, stopRe: RegExp = STOP, maxLen = 60): string {
  const m = text.match(labelRe);
  if (!m || m.index === undefined) return "";
  const rest = text.slice(m.index + m[0].length);
  const stop = rest.search(stopRe);
  const raw = (stop === -1 ? rest : rest.slice(0, stop)).replace(/\s+/g, " ").trim();
  return raw
    .slice(0, maxLen)
    .replace(/[:\-–—.,;]+$/, "")
    .replace(/^[:\-–—.,;\s]+/, "")
    .trim();
}

function cleanName(s: string): string {
  return s
    .replace(/\b(ATTN|TEL|FAX|DATE|EMAIL)\b.*$/i, "")
    .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}.*$/, "")
    .replace(/\s+/g, " ")
    .replace(/^[:\-–—.,;\s]+/, "")
    .trim();
}

// Drop junk that ran onto a port value: container numbers, weight keywords.
function cleanPort(s: string): string {
  return cleanName(s)
    .replace(/\b[A-Z]{4}\d{7}\b.*$/, "")
    .replace(/\b(GROSS|WEIGHT|MEASUREMENT)\b.*$/, "")
    .trim();
}

function toISODate(mm: string, dd: string, yyyy: string): string {
  const y = yyyy.length === 2 ? String(2000 + parseInt(yyyy, 10)) : yyyy;
  return `${y}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

const LABEL_WORDS = new Set([
  "NUMBER", "NO", "N", "DATE", "PORT", "OF", "VESSEL", "VOYAGE", "VOY", "CARGO", "TYPE",
  "MASTER", "HOUSE", "SUB", "BL", "B/L", "AMS", "KGS", "CBM", "CFT", "LBS", "IT",
]);

function isLabelWord(tok: string): boolean {
  return LABEL_WORDS.has(tok.toUpperCase().replace(/[:.]/g, ""));
}

function nearestTo(text: string, labelRe: RegExp, candidates: { value: string; index: number }[]): string {
  const lm = text.match(labelRe);
  if (!lm || lm.index === undefined || candidates.length === 0) return "";
  const li = lm.index;
  let best = "", bestDist = Infinity;
  for (const c of candidates) {
    const d = Math.abs(c.index - li);
    if (d < bestDist) {
      bestDist = d;
      best = c.value;
    }
  }
  return best;
}

const PORT_GAZ =
  "DALIAN|QINGDAO|NINGBO|SHANGHAI|YANTIAN|SHEKOU|XIAMEN|TIANJIN|XINGANG|LONG BEACH|LOS ANGELES|NORFOLK|NEW YORK|NEWARK|ELIZABETH|SAVANNAH|CHARLESTON|HOUSTON|SEATTLE|TACOMA|OAKLAND|CHICAGO|DALLAS|KANSAS CITY|MEMPHIS|ATLANTA|COLUMBUS|LOUISVILLE|NEW ORLEANS|MOBILE|JACKSONVILLE|BALTIMORE|PHILADELPHIA|BOSTON|WILMINGTON|PORTSMOUTH|TAMPA|MIAMI";

/* ---------------- shared extractors ---------------- */

function extractMbl(text: string): string {
  const mblAdj =
    text.match(
      /(?:MASTER\s*B\s*\/\s*L(?:\s*NO\.?|\s*NUMBER)?|MBL(?:\s*NO\.?)?)\s*[:#]?\s*((?!NUMBER\b|NO\.?\b)[A-Z0-9]{6,24})/i
    )?.[1] ?? "";
  let mbl = mblAdj && !isLabelWord(mblAdj) ? mblAdj.toUpperCase() : "";
  if (!mbl) {
    const cands = Array.from(text.matchAll(/\b([A-Z]{4}\d{8,12}|[A-Z]{8}\d{6,10})\b/g))
      .filter((x) => !isLabelWord(x[1]))
      .map((x) => ({ value: x[1].toUpperCase(), index: x.index ?? 0 }));
    mbl = cands.length > 0 ? nearestTo(text, /MASTER\s*B\s*\/\s*L|MBL\b/i, cands) || cands[0].value : "";
  }
  return mbl;
}

function extractHbl(text: string, mbl: string): string {
  const hblAdj =
    text.match(
      /(?:HOUSE\s*B\s*\/\s*L(?:\s*NO\.?|\s*NUMBER)?|HBL(?:\s*NO\.?)?|SUB\s*B\s*\/\s*L(?:\s*NO\.?|\s*NUMBER)?)\s*[:#]?\s*((?!NUMBER\b|NO\.?\b)[A-Z0-9][A-Z0-9\-]{3,19})/i
    )?.[1] ?? "";
  let hbl = hblAdj && !isLabelWord(hblAdj) ? hblAdj.toUpperCase() : "";
  if (!hbl || hbl === mbl) {
    const cands = Array.from(text.matchAll(/\b([A-Z]{2,8}\d{4,12}[A-Z0-9\-]*)\b/g))
      .filter(
        (x) =>
          !isLabelWord(x[1]) &&
          !/^[A-Z]{4}\d{7}$/.test(x[1]) &&
          x[1].toUpperCase() !== mbl
      )
      .map((x) => ({ value: x[1].toUpperCase(), index: x.index ?? 0 }));
    const near = nearestTo(text, /HOUSE\s*B\s*\/\s*L|HBL\b|SUB\s*B\s*\/\s*L/i, cands);
    hbl = near || (cands.length > 0 ? cands[0].value : "");
    if (hbl === mbl) hbl = "";
  }
  return hbl && hbl !== mbl ? hbl : "";
}

function extractVessel(text: string): string {
  let vessel = afterLabel(text, /VESSEL\s*(?:&|\/)\s*VOY(?:AGE)?(?:\s*NO\.?)?\s*[:.]?/i);
  if (!vessel) {
    const vm =
      text.match(/([A-Z][A-Z0-9&.\- ]{2,32}?)\s+(V\.?\s*\d{3}[A-Z])\b/) ||
      text.match(/([A-Z][A-Z .\-]{3,30}?)\s*\/\s*(\d{3}[A-Z0-9])\b/);
    if (vm) vessel = `${vm[1].trim()} ${vm[2].replace(/\s+/g, "")}`;
  }
  return vessel.toUpperCase();
}

function extractPorts(text: string): { pol: string; pod: string; delivery: string } {
  const seenPorts = new Set<string>();
  const ADDR_MARK = /S[Tt]\.?|STREET|AVE|AVENUE|ROAD|RD\.|COURT|CT\.|BLVD|DRIVE|DR\.|ATTN|SUITE|STE\.|P\.?\s*O\.?\s*BOX|#\d+/;
  const portCands = Array.from(
    text.matchAll(new RegExp(`(?<!BNSF/)(\\b(?:${PORT_GAZ})\\b(?:\\s+PORT)?(?:,\\s*[A-Z .]{2,14})?)`, "gi"))
  )
    .map((x) => ({ value: cleanPort(x[1]), index: x.index ?? 0 }))
    .filter((c) => !ADDR_MARK.test(text.slice(Math.max(0, c.index - 40), c.index)))
    .filter((c) => {
      if (seenPorts.has(c.value)) return false;
      seenPorts.add(c.value);
      return true;
    });

  const takeNearest = (labelRe: RegExp, pool: { value: string; index: number }[]) => {
    const v = nearestTo(text, labelRe, pool);
    if (v) {
      const i = pool.findIndex((c) => c.value === v);
      if (i >= 0) pool.splice(i, 1);
    }
    return v;
  };

  const polAdj = cleanPort(afterLabel(text, /PORT\s*OF\s*LOADING/i, STOP, 44));
  const podAdj = cleanPort(afterLabel(text, /PORT\s*OF\s*DISCHARGE/i, STOP, 44));
  const delAdj = cleanPort(
    afterLabel(text, /(?:PLACE\s*OF\s*DELIVERY|PORT\s*OF\s*DESTINATION|FINAL\s*DESTINATION)(?:\s*ETA)?/i, STOP, 44)
  );
  const pool = [...portCands];
  const pol = polAdj.length >= 2 ? polAdj.toUpperCase() : takeNearest(/PORT\s*OF\s*LOADING|PORT\s*OF\s*RECEIPT/i, pool);
  let del = delAdj.length >= 2 ? delAdj.toUpperCase() : takeNearest(/FINAL\s*DESTINATION|PORT\s*OF\s*DESTINATION|PLACE\s*OF\s*DELIVERY/i, pool);
  const pod = podAdj.length >= 2 ? podAdj.toUpperCase() : takeNearest(/PORT\s*OF\s*DISCHARGE/i, pool);
  if (!del && pool.length >= 1) del = pool[pool.length - 1].value;
  return { pol, pod, delivery: del };
}

function extractEtdEta(text: string): { etd: string; eta: string; delivery_eta: string } {
  const etdM = text.match(/\bETD\b[\s\S]{0,40}?(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i);
  const etas = Array.from(text.matchAll(/\bETA\b[\s\S]{0,40}?(\d{1,2})\/(\d{1,2})\/(\d{2,4})/gi)).map((x) =>
    toISODate(x[1], x[2], x[3])
  );
  const uniq = Array.from(new Set(etas));
  return {
    etd: etdM ? toISODate(etdM[1], etdM[2], etdM[3]) : "",
    eta: uniq.length > 0 ? uniq[0] : "",
    delivery_eta: uniq.length > 1 ? uniq[uniq.length - 1] : "",
  };
}

function extractContainers(text: string): Cntr[] {
  const byNo = new Map<string, Cntr>();
  const detailRe =
    /([A-Z]{4}\d{7})\s*\/\s*([A-Z0-9]{4,14})\s*\/\s*(\d{2}'?[A-Z]{0,3})\s*\/\s*(\d+)\s*PACKAGE\(S\)\s*\/\s*([\d,]+\.?\d*)\s*KGS\s*\/\s*([\d,]+\.?\d*)\s*CBM/gi;
  let m: RegExpExecArray | null;
  while ((m = detailRe.exec(text)) !== null) {
    byNo.set(m[1].toUpperCase(), {
      container: m[1].toUpperCase(),
      seal: m[2].toUpperCase(),
      type: m[3].toUpperCase(),
      packages: m[4],
      weight_kgs: parseFloat(m[5].replace(/,/g, "")),
      cbm: parseFloat(m[6].replace(/,/g, "")),
    });
  }
  if (byNo.size === 0) {
    const pairRe = /([A-Z]{4}\d{7})\s*\/\s*([A-Z0-9]{5,14})(?![A-Z0-9])/g;
    while ((m = pairRe.exec(text)) !== null) {
      const no = m[1].toUpperCase();
      if (!byNo.has(no))
        byNo.set(no, { container: no, seal: m[2].toUpperCase(), type: "", packages: "", weight_kgs: null, cbm: null });
    }
  }
  if (byNo.size === 0) {
    const bare = Array.from(new Set(Array.from(text.matchAll(/\b([A-Z]{4}\d{7})\b/g)).map((x) => x[1].toUpperCase())));
    if (bare.length >= 2) {
      for (const no of bare)
        byNo.set(no, { container: no, seal: "", type: "", packages: "", weight_kgs: null, cbm: null });
    }
  }
  return Array.from(byNo.values());
}

function extractTotals(text: string): { weight_kg: string; cbm: string } {
  const kgs = Array.from(text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*KGS/gi)).map((x) =>
    parseFloat(x[1].replace(/,/g, ""))
  );
  const cbms = Array.from(text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*CBM/gi)).map((x) =>
    parseFloat(x[1].replace(/,/g, ""))
  );
  return {
    weight_kg: kgs.length > 0 ? String(Math.max(...kgs)) : "",
    cbm: cbms.length > 0 ? String(Math.max(...cbms)) : "",
  };
}

function extractInvoiceNo(text: string): string {
  const looksInvoice = (v: string) => /^(?=.*\d)[A-Z0-9\-]{2,20}$/.test(v) && !isLabelWord(v);
  const invA = text.match(/INVOICE\s*(?:NUMBER|NO\.?)?\s*[:#]\s*([A-Z0-9][A-Z0-9\-]{1,18})/i)?.[1] ?? "";
  const invB = text.match(/([A-Z0-9][A-Z0-9\-]{1,18})\s+INVOICE\s*(?:NUMBER|NO\.?)?\s*:/i)?.[1] ?? "";
  const inv = [invA, invB].find(looksInvoice) ?? "";
  return inv.toUpperCase();
}

const PARTY_STOP =
  /\b(CONSIGNEE|NOTIFY|SELLER|EXPORTER|BUYER|IMPORTER|FORWARDING\s*AGENT|ALSO\s*NOTIFY|INVOICE\s*NO|TOTAL\s*AMOUNT|DESCRIPTION\s*OF\s*GOODS|PORT\s*OF|VESSEL|CONTAINER\s*NO|MARKS\s*(?:&|AND)\s*NUMBERS?)\b/;

function partyBlock(text: string, labelRe: RegExp): string {
  const m = text.match(labelRe);
  if (!m || m.index === undefined) return "";
  const rest = text.slice(m.index + m[0].length);
  const stop = rest.search(PARTY_STOP);
  const raw = (stop === -1 ? rest.slice(0, 220) : rest.slice(0, stop)).replace(/\s+/g, " ").trim();
  return cleanName(raw).slice(0, 140);
}

/* ---------------- per-type extractors ---------------- */

function extractArrivalNotice(text: string): Omit<DocExtraction, "doc_type"> {
  const fields: Record<string, string> = {};
  const found: string[] = [];
  const put = (k: string, v: string) => {
    if (v) {
      fields[k] = v;
      found.push(k);
    }
  };

  const mbl = extractMbl(text);
  put("mbl_no", mbl);
  const hbl = extractHbl(text, mbl);
  if (hbl) put("hbl_no", hbl);
  put("vessel_voyage", extractVessel(text));

  const { pol, pod, delivery } = extractPorts(text);
  put("port_of_loading", pol);
  put("port_of_discharge", pod);
  put("place_of_delivery", delivery);

  const { etd, eta, delivery_eta } = extractEtdEta(text);
  put("etd", etd);
  put("eta", eta);
  put("delivery_eta", delivery_eta);
  put("invoice_no", extractInvoiceNo(text));

  const containers = extractContainers(text);
  if (containers.length > 0) found.push(`containers:${containers.length}`);

  const totals = extractTotals(text);
  put("gross_weight_kg", totals.weight_kg);
  put("measurement_cbm", totals.cbm);

  // charges: line items only when the amount sits on the same line
  const charges: { description: string; amount: number }[] = [];
  const labelRe =
    /(HANDLING\s*(?:CHG|CHARGE)?|DOCUMENT\s*(?:FEE)?|DOC\s*FEE|DELIVERY\s*ORDER\s*(?:FEE)?|D\/O\s*FEE|CHASSIS\s*(?:FEE|CHARGE)?|PIER\s*PASS)/gi;
  let m: RegExpExecArray | null;
  while ((m = labelRe.exec(text)) !== null) {
    const line = text.slice(m.index + m[0].length, m.index + m[0].length + 25).split("\n")[0];
    const amt = line.match(/\(?\)?\s*\$?\s*([\d,]+\.\d{2})/);
    if (amt) {
      const desc = m[1].replace(/\s+/g, " ").trim().toUpperCase();
      if (!charges.some((c) => c.description === desc))
        charges.push({ description: desc, amount: parseFloat(amt[1].replace(/,/g, "")) });
    }
  }
  if (charges.length > 0) found.push(`charges:${charges.length}`);

  return { fields, containers, charges, found };
}

function extractBillOfLading(text: string): Omit<DocExtraction, "doc_type"> {
  const fields: Record<string, string> = {};
  const found: string[] = [];
  const put = (k: string, v: string) => {
    if (v) {
      fields[k] = v;
      found.push(k);
    }
  };

  const mbl = extractMbl(text);
  put("mbl_no", mbl);
  put("vessel_voyage", extractVessel(text));

  const { pol, pod, delivery } = extractPorts(text);
  put("port_of_loading", pol);
  put("port_of_discharge", pod);
  put("place_of_delivery", delivery);

  const { etd, eta } = extractEtdEta(text);
  put("etd", etd);
  put("eta", eta);

  // parties (customer's own doc library — showing them is fine)
  put("shipper", partyBlock(text, /SHIPPER(?:'S)?(?:\s*NAME)?\s*[:.]?/i));
  put("consignee", partyBlock(text, /CONSIGNEE(?:'S)?(?:\s*NAME)?\s*[:.]?/i));
  put("notify_party", partyBlock(text, /NOTIFY\s*PARTY\s*[:.]?/i));

  const containers = extractContainers(text);
  if (containers.length > 0) found.push(`containers:${containers.length}`);

  const totals = extractTotals(text);
  put("gross_weight_kg", totals.weight_kg);
  put("measurement_cbm", totals.cbm);

  // description of goods (first chunk)
  const goods = afterLabel(
    text,
    /DESCRIPTION\s*OF\s*GOODS/i,
    /\b(GROSS\s*WEIGHT|MEASUREMENT|CONTAINER\s*NO|FREIGHT\s*(?:&|AND)\s*CHARGES)\b/,
    120
  );
  put("goods_description", goods);

  return { fields, containers, charges: [], found };
}

function extractCommercialInvoice(text: string): Omit<DocExtraction, "doc_type"> {
  const fields: Record<string, string> = {};
  const found: string[] = [];
  const put = (k: string, v: string) => {
    if (v) {
      fields[k] = v;
      found.push(k);
    }
  };

  put("invoice_no", extractInvoiceNo(text));

  const dateM =
    text.match(/INVOICE\s*DATE\s*[:.]?\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i) ||
    text.match(/DATE\s*[:.]?\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i);
  if (dateM) put("invoice_date", toISODate(dateM[1], dateM[2], dateM[3]));

  put("seller", partyBlock(text, /SELLER|EXPORTER/i));
  put("buyer", partyBlock(text, /BUYER|IMPORTER|CONSIGNEE/i));

  // total amount + currency
  const totalM = text.match(
    /(?:TOTAL\s*(?:AMOUNT|VALUE)?|AMOUNT\s*DUE|GRAND\s*TOTAL)\s*[:.]?\s*([A-Z]{3})?\s*\$?\s*([\d,]+\.\d{2})/i
  );
  if (totalM) {
    put("total_amount", totalM[2].replace(/,/g, ""));
    const cur = (totalM[1] || text.match(/\b(USD|CNY|EUR|GBP|HKD)\b/)?.[1] || "").toUpperCase();
    put("currency", cur);
  }

  // line-item count hint
  const pkgs = text.match(/(?:TOTAL\s*)?(\d[\d,]*)\s*(?:CARTONS|CTNS|PACKAGES|PCS|PIECES)/i);
  if (pkgs) put("total_packages", pkgs[1].replace(/,/g, ""));
  const totals = extractTotals(text);
  put("gross_weight_kg", totals.weight_kg);
  put("measurement_cbm", totals.cbm);

  return { fields, containers: [], charges: [], found };
}

function extractPackingList(text: string): Omit<DocExtraction, "doc_type"> {
  const fields: Record<string, string> = {};
  const found: string[] = [];
  const put = (k: string, v: string) => {
    if (v) {
      fields[k] = v;
      found.push(k);
    }
  };

  const refM = text.match(/(?:PACKING\s*LIST\s*(?:NO\.?|NUMBER)?|P\/L\s*NO\.?)\s*[:#]?\s*([A-Z0-9][A-Z0-9\-]{1,18})/i);
  if (refM && !isLabelWord(refM[1])) put("packing_list_no", refM[1].toUpperCase());
  put("invoice_no", extractInvoiceNo(text));

  const pkgs = text.match(/(?:TOTAL\s*)?(\d[\d,]*)\s*(?:CARTONS|CTNS|PACKAGES|PCS|PIECES)/i);
  if (pkgs) put("total_packages", pkgs[1].replace(/,/g, ""));
  const totals = extractTotals(text);
  put("gross_weight_kg", totals.weight_kg);
  put("measurement_cbm", totals.cbm);

  const marks = afterLabel(text, /MARKS\s*(?:&|AND)\s*NUMBERS?/i, /\b(DESCRIPTION|QUANTITY|GROSS\s*WEIGHT)\b/, 120);
  put("marks_numbers", marks);

  return { fields, containers: [], charges: [], found };
}

/* ---------------- classify + main entry ---------------- */

export function classifyDoc(text: string): DocType {
  const scores: Record<DocType, number> = {
    arrival_notice: 0,
    bill_of_lading: 0,
    commercial_invoice: 0,
    packing_list: 0,
    other: 0,
  };
  const has = (re: RegExp, t: DocType, w: number) => {
    if (re.test(text)) scores[t] += w;
  };
  has(/ARRIVAL\s*NOTICE/i, "arrival_notice", 5);
  has(/FREIGHT\s*INVOICE/i, "arrival_notice", 2);
  has(/LAST\s*FREE\s*(?:DAY|DATE)/i, "arrival_notice", 2);
  has(/\bBILL\s*OF\s*LADING\b/i, "bill_of_lading", 5);
  has(/COMBINED\s*TRANSPORT/i, "bill_of_lading", 2);
  has(/ON\s*BOARD\s*(?:DATE|NOTATION)/i, "bill_of_lading", 2);
  has(/COMMERCIAL\s*INVOICE/i, "commercial_invoice", 5);
  has(/\bPACKING\s*LIST\b/i, "packing_list", 5);
  has(/\bPACKING\s*DETAILS\b/i, "packing_list", 2);

  const order: DocType[] = ["arrival_notice", "bill_of_lading", "commercial_invoice", "packing_list"];
  let best: DocType = "other";
  let bestScore = 0;
  for (const t of order) {
    if (scores[t] > bestScore) {
      bestScore = scores[t];
      best = t;
    }
  }
  return best;
}

export function extractDocument(rawText: string): DocExtraction {
  const text = norm(rawText);
  const doc_type = classifyDoc(text);
  let rest: Omit<DocExtraction, "doc_type">;
  switch (doc_type) {
    case "arrival_notice":
      rest = extractArrivalNotice(text);
      break;
    case "bill_of_lading":
      rest = extractBillOfLading(text);
      break;
    case "commercial_invoice":
      rest = extractCommercialInvoice(text);
      break;
    case "packing_list":
      rest = extractPackingList(text);
      break;
    default:
      rest = { fields: {}, containers: [], charges: [], found: [] };
  }
  return { doc_type, ...rest };
}
