/* Minimal ANSI X12 parser for the three trade document sets we accept:
   850 (purchase order), 856 (ship notice / ASN), 810 (invoice).
   Defensive by design: unknown segments are skipped, every extraction is
   optional, and anything unrecognized lands in `warnings` instead of
   throwing. */

export type EdiKind = "850" | "856" | "810" | "unknown";

export type EdiLine = {
  line?: string;
  sku?: string;
  qty?: string;
  uom?: string;
  price?: string;
  desc?: string;
};

export type EdiParsed = {
  kind: EdiKind;
  sender?: string;
  receiver?: string;
  interchangeDate?: string;
  header: Record<string, string>;
  lines: EdiLine[];
  totals: Record<string, string>;
  warnings: string[];
  segmentCount: number;
};

function splitSegments(raw: string): string[][] {
  const text = raw.replace(/^\uFEFF/, "").trim();
  if (!text) return [];
  const parts = text.includes("~")
    ? text.split("~")
    : text.split(/\r?\n/);
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.split("*").map((e) => e.trim()));
}

const el = (seg: string[], i: number): string => seg[i] ?? "";

/* Set only when the value is non-empty, keeping header/totals clean. */
const setIf = (rec: Record<string, string>, k: string, v: string) => {
  if (v) rec[k] = v;
};

export function parseX12(raw: string): EdiParsed {
  const warnings: string[] = [];
  const parsed: EdiParsed = {
    kind: "unknown",
    header: {},
    lines: [],
    totals: {},
    warnings,
    segmentCount: 0,
  };
  const segs = splitSegments(raw);
  parsed.segmentCount = segs.length;
  if (segs.length === 0) {
    warnings.push("empty_or_unreadable");
    return parsed;
  }

  let shipTo: string | undefined;
  let lineDesc: string | undefined;

  for (const seg of segs) {
    const tag = (seg[0] ?? "").toUpperCase();
    try {
      if (tag === "ISA") {
        parsed.sender = el(seg, 6) || undefined;
        parsed.receiver = el(seg, 8) || undefined;
        parsed.interchangeDate = el(seg, 9) || undefined;
      } else if (tag === "ST") {
        const code = el(seg, 1);
        if (code === "850" || code === "856" || code === "810") {
          parsed.kind = code;
          parsed.header.set = code;
        } else {
          warnings.push(`unsupported_set_${code || "?"}`);
        }
      } else if (tag === "BEG") {
        // BEG*purpose*type*poNumber**date
        setIf(parsed.header, "poNumber", el(seg, 3));
        setIf(parsed.header, "poDate", el(seg, 5));
        setIf(parsed.header, "poType", el(seg, 1));
      } else if (tag === "BSN") {
        // BSN*purpose*shipmentId*date
        setIf(parsed.header, "shipmentId", el(seg, 2));
        setIf(parsed.header, "shipDate", el(seg, 3));
      } else if (tag === "BIG") {
        // BIG*date*invoiceNumber
        setIf(parsed.header, "invoiceDate", el(seg, 1));
        setIf(parsed.header, "invoiceNumber", el(seg, 2));
      } else if (tag === "REF") {
        const q = el(seg, 1);
        const v = el(seg, 2);
        if (q && v) {
          if (q === "BM") parsed.header.billOfLading = v;
          else if (q === "CN") parsed.header.container = v;
          else if (q === "PO") parsed.header.poNumber = parsed.header.poNumber || v;
          else parsed.header[`ref_${q}`] = v;
        }
      } else if (tag === "N1") {
        // N1*entityCode*name — capture ship-to / bill-to names
        const code = el(seg, 1);
        const name = el(seg, 2);
        if (name) {
          if (code === "ST") shipTo = name;
          parsed.header[`party_${code || "?"}`] = name;
        }
      } else if (tag === "N3" || tag === "N4") {
        const prev = parsed.header.shipToAddress ?? "";
        parsed.header.shipToAddress = [prev, seg.slice(1).filter(Boolean).join(" ")]
          .filter(Boolean)
          .join(", ");
      } else if (tag === "PO1" || tag === "IT1") {
        // PO1*line*qty*uom*price**sku   IT1*line*qty*uom*price**sku
        parsed.lines.push({
          line: el(seg, 1) || undefined,
          qty: el(seg, 2) || undefined,
          uom: el(seg, 3) || undefined,
          price: el(seg, 4) || undefined,
          sku: el(seg, 7) || el(seg, 6) || undefined,
          desc: lineDesc,
        });
        lineDesc = undefined;
      } else if (tag === "PID" || tag === "LIN") {
        // PID follows the PO1/IT1 it describes — attach to the previous line.
        const d = el(seg, 5) || el(seg, 3);
        if (tag === "PID" && d) {
          const last = parsed.lines[parsed.lines.length - 1];
          if (last && !last.desc) last.desc = d;
          else lineDesc = d;
        }
        if (tag === "LIN" && el(seg, 3)) {
          const last = parsed.lines[parsed.lines.length - 1];
          if (last && !last.sku) last.sku = el(seg, 3);
          else if (d) lineDesc = d;
        }
      } else if (tag === "SN1") {
        // SN1*line*qty*uom (ASN quantities)
        const lineNo = el(seg, 1);
        const target = parsed.lines.find((l) => l.line === lineNo);
        const qty = [el(seg, 2), el(seg, 3)].filter(Boolean).join(" ");
        if (target) target.qty = target.qty || qty || undefined;
        else if (lineNo || qty)
          parsed.lines.push({ line: lineNo || undefined, qty: qty || undefined });
      } else if (tag === "CTT") {
        setIf(parsed.totals, "lineCount", el(seg, 1));
      } else if (tag === "TDS") {
        // TDS*amountInCents
        const cents = Number(el(seg, 1));
        if (Number.isFinite(cents))
          parsed.totals.invoiceTotal = (cents / 100).toFixed(2);
      }
    } catch {
      warnings.push(`segment_error_${tag}`);
    }
  }

  if (shipTo) parsed.header.shipTo = shipTo;
  if (parsed.kind === "unknown") warnings.push("no_supported_ST_segment");

  return parsed;
}

export const EDI_KIND_LABEL: Record<EdiKind, string> = {
  "850": "Purchase order",
  "856": "Ship notice (ASN)",
  "810": "Invoice",
  unknown: "Unknown",
};
