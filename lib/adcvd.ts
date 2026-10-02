/* NIEL AD/CVD Risk Checker — deterministic screening engine (no LLM).
   Layer 1: fast screening against the curated ad_cvd_watch table.
   Layer 2 (wired in the API): evidence from the ad_cvd_cases registry.

   Evidence scale (v1.0 product boundary — never a binary YES):
     no_case    — No identified case
     possible   — Possible case
     potential  — Potential scope match
     high_risk  — High-risk scope match  → Human review required

   Architecture boundary: the Scope Engine answers "is there a risk this
   good falls in an AD/CVD order's scope?". The Rate Engine is SEPARATE and
   is not built in v1: exporter/producer cash-deposit rates vary by
   administrative review and are NEVER presented as a current rate.
   UI must always show:  Scope Risk: <level>  /  Current Rate: NOT VERIFIED. */

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

export type RegistryEvidence = {
  case_number: string;
  case_type: string;
  country: string;
  product_name: string;
  scope_summary: string | null;
  exclusions: string | null;
  hts_references: string | null;
  status: string;
  commerce_source_url: string | null;
  federal_register_documents: { title: string; url: string; date: string }[] | null;
  last_verified_at: string | null;
  verification_status: string | null;
};

export type AdCvdCheckInput = {
  product: string;
  origin: string;
  hts?: string;
  manufacturer?: string;
  exporter?: string;
};

export type RiskLevel = "no_case" | "possible" | "potential" | "high_risk";
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
  evidence: RegistryEvidence[];
};

export type AdCvdCheckResult = {
  risk: RiskLevel;
  human_review_required: boolean;
  origin_missing: boolean;
  product: string;
  origin: string;
  hts: string | null;
  manufacturer: string | null;
  exporter: string | null;
  matches: AdCvdMatch[];
  why: string;
  recommended_action: "human_review" | "scope_review" | "screen_before_quote" | "none";
  /** Newest last_verified across matched evidence — the "Last regulatory check". */
  evidence_as_of: string | null;
};

const STOP = new Set([
  "the", "and", "of", "for", "a", "an", "from", "with", "to", "in", "on",
  "or", "by", "as", "at", "is", "are", "be", "this", "that", "it", "its",
]);

export function normOrigin(s: string): string {
  return (s || "").trim().toUpperCase();
}

function singularize(w: string): string {
  return w.replace(/ies$/, "y").replace(/(?<![s])s$/, "");
}

function tokens(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(singularize);
}

function digits(s: string | undefined | null): string {
  return (s || "").replace(/\D/g, "");
}

function htsHit(inputHts: string, prefix: string | null): boolean {
  const h = digits(inputHts);
  const p = digits(prefix);
  if (h.length < 4 || p.length < 4) return false;
  return h.startsWith(p) || p.startsWith(h);
}

export function checkAdCvdRisk(
  watch: WatchEntry[],
  input: AdCvdCheckInput,
  registry?: RegistryEvidence[]
): AdCvdCheckResult {
  const product = (input.product || "").trim();
  const origin = normOrigin(input.origin || "");
  const htsDigits = digits(input.hts);
  const originMissing = origin.length === 0;

  const inTokens = new Set(tokens(product));

  const matches: AdCvdMatch[] = [];

  for (const w of watch) {
    if (!originMissing && normOrigin(w.origin) !== origin) continue;

    const kwTokens = tokens(w.product_keyword);
    const kwSingular = kwTokens.join(" ");
    const phraseHit = kwTokens.length > 0 && tokens(product).join(" ").includes(kwSingular);
    const overlap =
      kwTokens.length === 0
        ? 0
        : kwTokens.filter((t) => inTokens.has(t)).length / kwTokens.length;
    const hit = htsHit(htsDigits, w.hts_prefix);

    if (!(hit || phraseHit || overlap >= 0.5)) continue;

    // Strong: product language directly overlaps the order's product language
    // (phrase hit), or HTS + keyword converge. Either => high-risk scope match.
    const strong = phraseHit || (hit && overlap >= 0.5);
    const scope_match: ScopeMatch = hit || phraseHit ? "potential" : "review";

    // Layer 2: attach registry evidence by case number.
    const evidence: RegistryEvidence[] = [];
    if (registry && w.case_numbers) {
      const nums = w.case_numbers.split("/").map((s) => s.trim().toUpperCase());
      for (const ev of registry) {
        if (nums.includes(ev.case_number.trim().toUpperCase())) evidence.push(ev);
      }
    }

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
      evidence,
    });
    // stash signal strength for ranking (non-enumerable not needed; recompute below)
    (matches[matches.length - 1] as AdCvdMatch & { _strong?: boolean })._strong = strong;
  }

  matches.sort((a, b) => {
    const sa = (a as AdCvdMatch & { _strong?: boolean })._strong ? 0 : 1;
    const sb = (b as AdCvdMatch & { _strong?: boolean })._strong ? 0 : 1;
    if (sa !== sb) return sa - sb;
    const ra = a.scope_match === "potential" ? 0 : 1;
    const rb = b.scope_match === "potential" ? 0 : 1;
    return ra - rb;
  });

  let risk: RiskLevel = "no_case";
  let recommended_action: AdCvdCheckResult["recommended_action"] = "none";

  const hasOrder = matches.some((m) => m.status === "order_in_place");
  const strongOrder = matches.some(
    (m) => m.status === "order_in_place" && (m as AdCvdMatch & { _strong?: boolean })._strong
  );

  if (matches.length > 0) {
    if (originMissing) {
      risk = "possible";
      recommended_action = "screen_before_quote";
    } else if (strongOrder) {
      risk = "high_risk";
      recommended_action = "human_review";
    } else if (hasOrder) {
      risk = "potential";
      recommended_action = "scope_review";
    } else {
      risk = "possible";
      recommended_action = "screen_before_quote";
    }
  }

  const human_review_required = risk === "high_risk";

  // Evidence chain timestamp: newest verification across matches.
  const stamps = matches
    .flatMap((m) => [m.last_verified, ...m.evidence.map((e) => e.last_verified_at)])
    .filter((s): s is string => !!s)
    .sort();
  const evidence_as_of = stamps.length > 0 ? stamps[stamps.length - 1] : null;

  // Why: explain the basis in one honest sentence.
  let why: string;
  if (risk === "no_case") {
    why =
      "No watchlist corridor matched this product and origin. The watchlist is curated, not complete — scope is order-specific and HTS alone never determines coverage.";
  } else {
    const top = matches[0];
    const signals: string[] = [];
    if (htsHit(htsDigits, top.hts_prefix)) signals.push(`HTS ${htsDigits} overlaps the screened HTS reference`);
    const topKw = tokens(top.product_keyword).join(" ");
    if (tokens(product).join(" ").includes(topKw))
      signals.push("product description overlaps the order's product language");
    else signals.push("product characteristics overlap the order's product language");
    signals.push(`origin ${originMissing ? "not specified" : input.origin.trim()}`);
    why =
      `Product characteristics overlap with language in the identified order` +
      (top.case_numbers ? ` (${top.case_numbers})` : "") +
      `. Basis: ${signals.join("; ")}. HTS classification alone does not determine scope coverage.`;
  }

  return {
    risk,
    human_review_required,
    origin_missing: originMissing,
    product,
    origin: input.origin?.trim() || "",
    hts: htsDigits || null,
    manufacturer: input.manufacturer?.trim() || null,
    exporter: input.exporter?.trim() || null,
    matches: matches.map(({ ...m }) => {
      const { _strong, ...rest } = m as AdCvdMatch & { _strong?: boolean };
      return rest;
    }),
    why,
    recommended_action,
    evidence_as_of,
  };
}
