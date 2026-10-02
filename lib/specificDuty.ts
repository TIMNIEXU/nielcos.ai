/* Parse HTSUS specific (per-unit) duty rates, e.g. "31.4¢/kg", "$2.146/kg",
   "30.5¢/kg + 8.5%", "$1.53 each + 4.2% on the case".
   Returns null when the text is ad valorem ("4%") or unparseable. */

export type SpecificRate = {
  /** USD per single unit (cents converted) */
  perUnitUsd: number;
  /** normalized unit: kg | liter | bbl | m3 | t | each | 1000 | ... */
  unit: string;
  /** compound ad-valorem part, only when it is a plain "%" (no "on the ...") */
  adValoremPct: number | null;
  /** true when the text has extra qualified parts we do not compute
      (e.g. "+ 4.2% on the case") — we still price the per-unit part */
  partial: boolean;
  raw: string;
};

const UNIT_ALIASES: Record<string, string> = {
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  liter: "liter",
  litre: "liter",
  liters: "liter",
  litres: "liter",
  l: "liter",
  bbl: "bbl",
  barrel: "bbl",
  barrels: "bbl",
  m3: "m3",
  t: "t",
  ton: "t",
  tons: "t",
  tonne: "t",
  tonnes: "t",
  each: "each",
  "1000": "1000",
};

function normUnit(u: string): string {
  const k = u.toLowerCase().trim();
  return UNIT_ALIASES[k] ?? k;
}

export function parseSpecificRate(rateText: string | null | undefined): SpecificRate | null {
  if (!rateText) return null;
  const t = rateText.trim();
  if (/%$/.test(t) && !/[¢$]/.test(t)) return null; // pure ad valorem
  if (/^free$/i.test(t)) return null;

  // split compound parts on "+"
  const parts = t.split("+").map((p) => p.trim());
  let perUnitUsd: number | null = null;
  let unit = "";
  let adValoremPct: number | null = null;
  let partial = false;

  for (const p of parts) {
    let m = p.match(/^([\d.]+)\s*¢\s*\/\s*([a-zA-Z0-9]+)$/);
    if (m) {
      perUnitUsd = parseFloat(m[1]) / 100;
      unit = normUnit(m[2]);
      continue;
    }
    m = p.match(/^\$\s*([\d.]+)\s*\/\s*([a-zA-Z0-9]+)$/);
    if (m) {
      perUnitUsd = parseFloat(m[1]);
      unit = normUnit(m[2]);
      continue;
    }
    m = p.match(/^\$\s*([\d.]+)\s+each$/i);
    if (m) {
      perUnitUsd = parseFloat(m[1]);
      unit = "each";
      continue;
    }
    m = p.match(/^([\d.]+)\s*¢\s+each$/i);
    if (m) {
      perUnitUsd = parseFloat(m[1]) / 100;
      unit = "each";
      continue;
    }
    m = p.match(/^([\d.]+)\s*%$/);
    if (m) {
      if (adValoremPct == null) adValoremPct = parseFloat(m[1]);
      else partial = true;
      continue;
    }
    // qualified part we do not compute ("4.2% on the case")
    partial = true;
  }

  if (perUnitUsd == null || !unit) return null;
  return { perUnitUsd, unit, adValoremPct, partial, raw: t };
}

/** Display unit label, e.g. "kg" -> "KG". */
export function unitLabel(unit: string): string {
  return unit.toUpperCase();
}
