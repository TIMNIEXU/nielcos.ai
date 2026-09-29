/* Additional-duty (301/232/...) suggestions, client-side.
   Rules come from the additional_duties table (each with legal source +
   effective date). Multiple rules can match at once (e.g. 232 + 301-FL);
   suggestions are advisory only — the UI always asks the user to verify
   before anything is treated as real. */

export type DutyRule = {
  id: string;
  duty_type: string;
  hts_prefix: string;
  origin_country: string;
  rate: number;
  basis: string;
  effective_from: string | null;
  source: string;
  note: string;
};

export type DutySuggestion =
  | { kind: "rate"; duty_type: string; rate: number; source: string; note: string; basis: string }
  | { kind: "warning"; text: string };

const METAL_RE = /steel|aluminum|aluminium|copper|iron|钢|鐵|铝|鋁|铜|銅/i;

/* Normalize free-text origin to the canonical names used in the table. */
const ORIGIN_ALIASES: Record<string, string> = {
  "UK": "UNITED KINGDOM",
  "U.K.": "UNITED KINGDOM",
  "UAE": "UNITED ARAB EMIRATES",
  "U.A.E.": "UNITED ARAB EMIRATES",
  "PRC": "CHINA",
  "PEOPLE'S REPUBLIC OF CHINA": "CHINA",
  "VIET NAM": "VIETNAM",
  "RUSSIAN FEDERATION": "RUSSIA",
  "REPUBLIC OF KOREA": "SOUTH KOREA",
  "KOREA, REPUBLIC OF": "SOUTH KOREA",
  "TÜRKIYE": "TURKEY",
  "TURKIYE": "TURKEY",
  "CZECHIA": "CZECH REPUBLIC",
};

export function normOrigin(s: string): string {
  const u = (s || "").toUpperCase().trim();
  return ORIGIN_ALIASES[u] ?? u;
}

export function suggestAdditionalDuties(
  htsNo: string | null,
  origin: string,
  material: string,
  rules: DutyRule[]
): DutySuggestion[] {
  const bare = (htsNo || "").replace(/[^0-9]/g, "");
  if (!bare) return [];
  const out: DutySuggestion[] = [];

  // 1) HTS-prefix rules (e.g. Section 232 steel/aluminum/copper articles)
  let best: DutyRule | null = null;
  for (const r of rules) {
    if (!r.hts_prefix) continue; // blanket rules handled below
    if (!bare.startsWith(r.hts_prefix)) continue;
    if (!best || r.hts_prefix.length > best.hts_prefix.length) best = r;
  }
  if (best) {
    out.push({
      kind: "rate",
      duty_type: best.duty_type,
      rate: Number(best.rate),
      source: best.source,
      note: best.note,
      basis: best.basis,
    });
  }

  // 2) Blanket origin-based rules (e.g. Section 301 forced labor, all HTS)
  const org = normOrigin(origin);
  const has232 = out.some((s) => s.kind === "rate" && s.duty_type === "232");
  for (const r of rules) {
    if (r.hts_prefix) continue;
    if (!r.origin_country) continue;
    if (normOrigin(r.origin_country) !== org) continue;
    out.push({
      kind: "rate",
      duty_type: r.duty_type,
      rate: Number(r.rate),
      source: r.source,
      // 232-covered products are excepted from the forced-labor 301
      note: has232 ? `${r.note}（232 适用产品除外 — 若 232 适用则不叠加）` : r.note,
      basis: r.basis,
    });
  }

  // 3) Steel/aluminum/copper product outside the article chapters:
  // may fall under the 232 derivative list (Annex I-B, HTS-specific).
  // Warn instead of inventing a number.
  if (!has232 && METAL_RE.test(material || "") && org && !["US", "USA", "UNITED STATES"].includes(org)) {
    out.push({
      kind: "warning",
      text: "Steel/aluminum/copper content — check the 232 derivative list (Annex I-B, HTS-specific rate) and confirm the rate before filing.",
    });
  }
  return out;
}
