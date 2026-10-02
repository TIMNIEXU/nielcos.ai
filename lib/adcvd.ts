/* NIEL AD/CVD Risk Checker — deterministic screening engine (no LLM).
   Matches a shipment (product text + origin + optional HTS) against the
   curated ad_cvd_watch table and returns a risk assessment in the
   product-spec format: risk level, potential case, scope match, exclusions,
   exporter/cash-deposit "verify" flags, recommended action.

   Honest limits (by design):
   - HTS is a screening signal, never the final determinant.
   - Scope is order-specific; the engine reports "potential match" and
     always routes to scope review — it never declares "not subject".
   - Exporter/manufacturer-specific cash-deposit rates are NOT computed;
     output says Verify, always. */

export type WatchEntry = {
  product_keyword: string;
  hts_prefix: string | null;
  origin: string;
  case_type: string;
  status: string;
  note: string | null;
  case_numbers: string | null;
  scope_summary: string | null;
  exclusions: string | null;
  last_verified: string | null;
};

export type AdCvdCheckInput = {
  product: string;
  origin: string;
  hts?: string;
  manufacturer?: string;
  exporter?: string;
};

export type RiskLevel = "high" | "medium" | "low";
export type ScopeMatch = "potential" | "review" | "none";

export type AdCvdMatch = {
  product_keyword: string;
  case_numbers: string | null;
  case_type: string;
  origin: string;
  hts_prefix: string | null;
  status: string;
  scope_match: ScopeMatch;
  scope_summary: string | null;
  exclusions: string | null;
  last_verified: string | null;
};

export type AdCvdCheckResult = {
  risk: RiskLevel;
  origin_missing: boolean;
  product: string;
  origin: string;
  hts: string | null;
  manufacturer: string | null;
  exporter: string | null;
  matches: AdCvdMatch[];
  recommended_action: "scope_review" | "screen_before_quote" | "no_match";
};

const STOP = new Set([
  "the", "and", "of", "for", "a", "an", "from", "with", "to", "in", "on",
  "or", "by", "as", "at", "is", "are", "be", "this", "that", "it", "its",
]);

export function normOrigin(s: string): string {
  return (s || "").trim().toUpperCase();
}

function tokens(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

function digits(s: string | undefined): string {
  return (s || "").replace(/\D/g, "");
}

function htsHit(inputHts: string, prefix: string | null): boolean {
  const h = digits(inputHts);
  const p = digits(prefix ?? "");
  if (h.length < 4 || p.length < 4) return false;
  return h.startsWith(p) || p.startsWith(h);
}

export function checkAdCvdRisk(
  watch: WatchEntry[],
  input: AdCvdCheckInput
): AdCvdCheckResult {
  const product = (input.product || "").trim();
  const origin = normOrigin(input.origin || "");
  const htsDigits = digits(input.hts);
  const originMissing = origin.length === 0;

  const inTokens = new Set(tokens(product));
  const inText = product.toLowerCase();

  const matches: AdCvdMatch[] = [];

  for (const w of watch) {
    if (!originMissing && normOrigin(w.origin) !== origin) continue;

    const kwTokens = tokens(w.product_keyword);
    const phraseHit = kwTokens.length > 0 && inText.includes(w.product_keyword.toLowerCase());
    const overlap =
      kwTokens.length === 0
        ? 0
        : kwTokens.filter((t) => inTokens.has(t)).length / kwTokens.length;
    const hit = htsHit(htsDigits, w.hts_prefix);

    if (!(hit || phraseHit || overlap >= 0.5)) continue;

    const scope_match: ScopeMatch =
      hit || phraseHit ? "potential" : "review";
    matches.push({
      product_keyword: w.product_keyword,
      case_numbers: w.case_numbers,
      case_type: w.case_type,
      origin: w.origin,
      hts_prefix: w.hts_prefix,
      status: w.status,
      scope_match,
      scope_summary: w.scope_summary,
      exclusions: w.exclusions,
      last_verified: w.last_verified,
    });
  }

  // Strongest signal first.
  matches.sort((a, b) => {
    const rank = (m: AdCvdMatch) => (m.scope_match === "potential" ? 0 : 1);
    return rank(a) - rank(b);
  });

  let risk: RiskLevel = "low";
  let recommended_action: AdCvdCheckResult["recommended_action"] = "no_match";

  const hasOrder = matches.some((m) => m.status === "order_in_place");
  const hasInvestigation = matches.some((m) => m.status !== "order_in_place");

  if (matches.length > 0) {
    const strong = matches.some((m) => m.scope_match === "potential");
    if (hasOrder && strong && !originMissing) {
      risk = "high";
      recommended_action = "scope_review";
    } else if (hasOrder || hasInvestigation) {
      risk = "medium";
      recommended_action = "screen_before_quote";
    }
  }

  return {
    risk,
    origin_missing: originMissing,
    product,
    origin: input.origin?.trim() || "",
    hts: htsDigits || null,
    manufacturer: input.manufacturer?.trim() || null,
    exporter: input.exporter?.trim() || null,
    matches,
    recommended_action,
  };
}
