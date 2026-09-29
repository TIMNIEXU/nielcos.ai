/* Denied-party screening matcher — rule-based, explainable.
   Normalizes names, drops corporate stopwords, scores token overlap.
   score 1.0  = exact / alias match            → 'hit'
   score ≥ .55 = strong partial overlap          → 'review'
   otherwise                                     → 'clear'
   Hits never auto-block: the UI always routes them to human review. */

const STOP = new Set([
  "CO", "COMPANY", "CORP", "CORPORATION", "INC", "INCORPORATED", "LTD", "LIMITED",
  "LLC", "LLP", "PLC", "SA", "SAS", "GMBH", "AG", "PTY", "PTE", "BV", "NV",
  "HOLDINGS", "HOLDING", "GROUP", "INTERNATIONAL", "INTL", "TRADING", "TRADE",
  "ENTERPRISE", "ENTERPRISES", "INDUSTRIES", "INDUSTRY", "SERVICES", "SERVICE",
  "SHIPPING", "LOGISTICS", "TECHNOLOGY", "TECH", "AND",
]);

export function normName(s: string): string {
  return (s || "")
    .toUpperCase()
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokens(s: string): string[] {
  return normName(s)
    .split(" ")
    .filter((t) => t.length > 1 && !STOP.has(t));
}

export type WatchEntry = {
  id: string;
  name: string;
  aliases: string[];
  source: string;
  program: string | null;
};

export type Match = WatchEntry & { score: number; via: string };

export function scoreEntry(e: WatchEntry, query: string): Match | null {
  const qNorm = normName(query);
  if (!qNorm) return null;
  const qToks = new Set(tokens(query));
  if (qToks.size === 0) return null;

  const names = [e.name, ...(e.aliases || [])];
  let best = 0;
  let via = "";
  for (const n of names) {
    const nNorm = normName(n);
    if (!nNorm) continue;
    if (qNorm === nNorm) return { ...e, score: 1, via: n };
    // query contains the listed name (or vice versa) as a substring
    if (qNorm.includes(nNorm) || nNorm.includes(qNorm)) {
      const s = 0.95;
      if (s > best) { best = s; via = n; }
      continue;
    }
    const eToks = tokens(n);
    if (!eToks.length) continue;
    let hit = 0;
    for (const t of eToks) if (qToks.has(t)) hit++;
    const entryCov = hit / eToks.length;
    let qHit = 0;
    for (const t of qToks) if (eToks.includes(t)) qHit++;
    const queryCov = qHit / qToks.size;
    const s = Math.max(entryCov, queryCov * 0.9);
    if (s > best) { best = s; via = n; }
  }
  if (best < 0.55) return null;
  return { ...e, score: Math.round(best * 100) / 100, via };
}

export function screenQuery(
  watchlist: WatchEntry[],
  query: string
): { result: "clear" | "review" | "hit"; matches: Match[] } {
  const matches: Match[] = [];
  for (const e of watchlist) {
    const m = scoreEntry(e, query);
    if (m) matches.push(m);
  }
  matches.sort((a, b) => b.score - a.score);
  const top = matches.slice(0, 5);
  if (!top.length) return { result: "clear", matches: [] };
  if (top[0].score >= 0.95) return { result: "hit", matches: top };
  return { result: "review", matches: top };
}
