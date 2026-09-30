/* GRI-001 V3 — deterministic "why" narratives for HTS candidates.
   No LLM: explains each candidate from token overlap between the user's
   query and the official HTS description, plus the keyword-match score band.
   Honest by construction — it can only describe what the matcher did. */

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff]+/u)
    .filter((t) => t.length > 2);
}

export type ReasonInput = {
  hts_no: string;
  description: string;
  rate: number | null;
  rate_text?: string | null;
  score: number;
};

export function htsReason(c: ReasonInput, query: string, zh: boolean): string {
  const qToks = new Set(tokens(query));
  const dToks = tokens(c.description);
  const matched = [...new Set(dToks.filter((t) => qToks.has(t)))].slice(0, 4);

  const band =
    c.score >= 70 ? (zh ? "高" : "high")
    : c.score >= 40 ? (zh ? "中" : "medium")
    : (zh ? "低" : "low");

  const parts: string[] = [];
  if (matched.length) {
    parts.push(
      zh
        ? `与官方描述中的关键词匹配：${matched.join("、")}`
        : `Matched keywords in the official description: ${matched.join(", ")}`
    );
  } else {
    parts.push(
      zh ? "基于产品类别的关键词关联" : "Keyword association by product category"
    );
  }
  parts.push(
    zh ? `关键词匹配度${band}（${c.score}/100）` : `Keyword match ${band} (${c.score}/100)`
  );
  if (c.rate != null) {
    parts.push(zh ? `最惠国税率 ${c.rate}%` : `MFN rate ${c.rate}%`);
  } else if (c.rate_text) {
    parts.push(zh ? `税率：${c.rate_text}` : `Rate: ${c.rate_text}`);
  }
  return parts.join(zh ? "；" : "; ");
}

export function confidenceBand(score: number): "high" | "medium" | "low" {
  return score >= 70 ? "high" : score >= 40 ? "medium" : "low";
}
