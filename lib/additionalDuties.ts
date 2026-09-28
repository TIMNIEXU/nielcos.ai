/* Additional-duty (301/232/...) suggestion, client-side.
   Rules come from the additional_duties table (each with legal source +
   effective date). Suggestions are advisory only — the UI always asks
   the user to verify before anything is treated as real. */

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
  | { kind: "rate"; rate: number; source: string; note: string }
  | { kind: "warning"; text: string };

const METAL_RE = /steel|aluminum|aluminium|copper|iron|钢|鐵|铝|鋁|铜|銅/i;

export function suggestAdditionalDuty(
  htsNo: string | null,
  origin: string,
  material: string,
  rules: DutyRule[]
): DutySuggestion | null {
  const bare = (htsNo || "").replace(/[^0-9]/g, "");
  if (!bare) return null;

  let best: DutyRule | null = null;
  for (const r of rules) {
    if (!r.hts_prefix) continue;
    if (!bare.startsWith(r.hts_prefix)) continue;
    if (r.origin_country && origin && r.origin_country.toUpperCase() !== origin.toUpperCase()) continue;
    if (!best || r.hts_prefix.length > best.hts_prefix.length) best = r;
  }
  if (best) {
    return { kind: "rate", rate: Number(best.rate), source: best.source, note: best.note };
  }

  // Steel/aluminum/copper product outside the article chapters:
  // may fall under the 232 derivative list (Annex I-B, HTS-specific).
  // Warn instead of inventing a number.
  const org = (origin || "").toUpperCase();
  if (METAL_RE.test(material || "") && org && !["US", "USA", "UNITED STATES"].includes(org)) {
    return {
      kind: "warning",
      text: "Steel/aluminum/copper content — check the 232 derivative list (Annex I-B, currently 25%) and confirm the rate before filing.",
    };
  }
  return null;
}
