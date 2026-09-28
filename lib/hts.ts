/* HTS suggestion engine (Phase 1, rule-based).
   Scores hts_schedule rows against a product description by keyword overlap.
   Deterministic and offline — an LLM rerank can plug in later without
   changing the API contract. */

export type HtsRow = {
  hts_no: string;
  description: string;
  general_rate: number | null;
  keywords: string;
};

export type HtsCandidate = {
  hts_no: string;
  description: string;
  rate: number | null;
  score: number; // 0-100
};

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff]+/u)
    .filter((t) => t.length > 1);
}

export function suggestHts(description: string, rows: HtsRow[], limit = 5): HtsCandidate[] {
  const desc = description.toLowerCase();
  const descTokens = new Set(tokens(description));
  const scored: HtsCandidate[] = [];

  for (const r of rows) {
    const kws = r.keywords
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    if (!kws.length) continue;
    let hits = 0;
    let tokenHits = 0;
    for (const kw of kws) {
      if (desc.includes(kw)) {
        hits += 1;
        // multi-word keywords weigh more
        tokenHits += kw.split(/\s+/).length;
      } else if (kw.length > 3 && descTokens.has(kw)) {
        hits += 0.5;
      }
    }
    if (hits === 0) continue;
    // normalize by keyword count so small focused rows aren't drowned out
    const score = Math.min(
      100,
      Math.round((hits / Math.sqrt(kws.length)) * 28 + tokenHits * 6)
    );
    scored.push({ hts_no: r.hts_no, description: r.description, rate: r.general_rate, score });
  }

  // direct HTS number mention gets a big boost
  const htsMention = desc.match(/\b\d{4}\.\d{2}/);
  if (htsMention) {
    for (const c of scored) {
      if (c.hts_no.startsWith(htsMention[0])) c.score = Math.min(100, c.score + 40);
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

/* PGA flags: longest-prefix match on the dot-stripped HTS number. */
export type PgaRule = { hts_prefix: string; agency: string; agency_cn: string; note: string };

export function matchPga(htsNo: string, rules: PgaRule[]): PgaRule[] {
  const bare = htsNo.replace(/[^0-9]/g, "");
  if (!bare) return [];
  const seen = new Set<string>();
  const out: PgaRule[] = [];
  const sorted = [...rules].sort((a, b) => b.hts_prefix.length - a.hts_prefix.length);
  for (const r of sorted) {
    if (bare.startsWith(r.hts_prefix) && !seen.has(r.agency)) {
      seen.add(r.agency);
      out.push(r);
    }
  }
  return out;
}
