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
  | { kind: "warning"; text: string; text_zh?: string };

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
  // Keep up to 10 digits: classic Section 301 (China) rates are defined at
  // the 10-digit level (Lists 1/2/3 = 25%, List 4A = 7.5%). MFN lookup stays
  // 8-digit; only the additional-duty matching uses the full code.
  const bare = (htsNo || "").replace(/[^0-9]/g, "").slice(0, 10);
  if (!bare) return [];
  const out: DutySuggestion[] = [];
  const org = normOrigin(origin);
  const disp =
    bare.length > 8
      ? `${bare.slice(0, 4)}.${bare.slice(4, 6)}.${bare.slice(6, 8)}.${bare.slice(8)}`
      : bare.length >= 8
        ? `${bare.slice(0, 4)}.${bare.slice(4, 6)}.${bare.slice(6, 8)}`
        : htsNo || bare;

  // 1) HTS-prefix rules (e.g. Section 232 steel/aluminum/copper articles,
  // classic Section 301 lists). One best match PER duty type — different
  // duties stack (232 50% + 301 25%), they must not knock each other out.
  // Within one duty type: a later modification supersedes the earlier rate
  // (e.g. the 2024 Section 301 review raised semiconductors 25% -> 50% and
  // steel/aluminum to 25% — it replaces the classic list rate, not stacks).
  // A rule only applies when its origin matches (empty origin = universal,
  // e.g. Section 232).
  const matchesOrigin = (r: DutyRule) =>
    !r.origin_country || normOrigin(r.origin_country) === org;
  const byType = new Map<string, DutyRule>();
  const suppressedTypes = new Set<string>();
  for (const r of rules) {
    if (!r.hts_prefix) continue; // blanket rules handled below
    if (!bare.startsWith(r.hts_prefix)) continue;
    if (!matchesOrigin(r)) continue;
    const cur = byType.get(r.duty_type);
    if (!cur) {
      byType.set(r.duty_type, r);
      continue;
    }
    const rDate = r.effective_from ?? "";
    const cDate = cur.effective_from ?? "";
    if (rDate > cDate) {
      byType.set(r.duty_type, r);
      continue;
    }
    if (cDate > rDate) continue;
    if (r.hts_prefix.length > cur.hts_prefix.length) byType.set(r.duty_type, r);
  }
  for (const best of byType.values()) {
    // Carve-out rules (rate 0 with "[NOT SUBJECT]" in the note) exist only
    // to knock an over-broad blanket rule out for one specific HTS — e.g.
    // ferroalloys carved out of the chapter-72 2024 steel/aluminum increase.
    // They correspond to no filing line, so don't display them; but remember
    // the type was deliberately considered (so the "may be understated"
    // warning below doesn't fire on a verified-no-rate HTS).
    if (Number(best.rate) === 0 && best.note.includes("[NOT SUBJECT]")) {
      suppressedTypes.add(best.duty_type);
      continue;
    }
    out.push({
      kind: "rate",
      duty_type: best.duty_type,
      rate: Number(best.rate),
      source: best.source,
      note: best.note,
      basis: best.basis,
    });
  }

  // 1b) The query is less specific than a 301-CN rule (e.g. 8-digit query,
  // but the rate only exists at 10 digits). Never guess a list rate from a
  // shorter code — ask for the 10-digit HTS instead.
  let needTenDigit = false;
  if (byType.size === 0 && bare.length < 10) {
    needTenDigit = rules.some(
      (r) =>
        r.duty_type === "301-CN" &&
        !!r.hts_prefix &&
        r.hts_prefix.length > bare.length &&
        r.hts_prefix.startsWith(bare) &&
        normOrigin(r.origin_country) === org
    );
    if (needTenDigit) {
      out.push({
        kind: "warning",
        text: `Classic Section 301 for ${disp}: the rate is 10-digit specific (Lists 1/2/3: 25%, List 4A: 7.5%). Enter the full 10-digit HTS instead of estimating from ${bare.length} digits.`,
        text_zh: `该税号 ${disp} 的经典 Section 301 税率取决于十位编码（Lists 1/2/3：25%，List 4A：7.5%），请输入完整十位 HTS，不要用 ${bare.length} 位编码估算。`,
      });
    }
  }

  // 2) Blanket origin-based rules (e.g. Section 301 forced labor, all HTS).
  // 232-covered products are excepted from the forced-labor 301
  // (9903.05.90): show the exclusion as a $0 line instead of charging it.
  const has232 = out.some((s) => s.kind === "rate" && s.duty_type === "232");
  for (const r of rules) {
    if (r.hts_prefix) continue;
    if (!r.origin_country) continue;
    if (normOrigin(r.origin_country) !== org) continue;
    if (r.duty_type === "301-FL" && has232) {
      out.push({
        kind: "rate",
        duty_type: "301-FL-EXCL",
        rate: 0,
        source: r.source,
        note: "Section 301 Forced Labor exclusion for Section 232-covered products (9903.05.90)",
        basis: r.basis,
      });
      continue;
    }
    if (r.duty_type === "301-FL" && suppressedTypes.has("301-FL")) {
      // HTS-specific Note 52(b) exclusion (e.g. 7202.80 ferrotungsten):
      // the [NOT SUBJECT] carve-out won its contest in (1) and was hidden
      // from display — show the $0 exclusion line instead of charging FL.
      out.push({
        kind: "rate",
        duty_type: "301-FL-EXCL",
        rate: 0,
        source: r.source,
        note: 'Section 301 "Forced Labor" Note 52(b) exclusion (9903.05.86)',
        basis: r.basis,
      });
      continue;
    }
    out.push({
      kind: "rate",
      duty_type: r.duty_type,
      rate: Number(r.rate),
      source: r.source,
      note: r.note,
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
      text_zh: "产品含钢/铝/铜成分——请核对 232 衍生品清单（Annex I-B，按 HTS 逐项适用），正式申报前确认适用税率。",
    });
  }
  // 4) Classic Section 301 China tariffs (Lists 1/2/3 = 25%, List 4A = 7.5%,
  // 2018-2019 actions, still in effect) are only partially in the rule table.
  // Never silently under-report a China-origin estimate.
  const has301cn = out.some((s) => s.kind === "rate" && s.duty_type === "301-CN");
  if (org === "CHINA" && !has301cn && !suppressedTypes.has("301-CN") && !needTenDigit) {
    out.push({
      kind: "warning",
      text: "Classic Section 301 China tariffs (Lists 1/2/3: 25%, List 4A: 7.5% — 9903.88 provisions) are not fully in the rate library yet, so this estimate may be understated. Verify your product's list membership before quoting.",
      text_zh: "经典 Section 301 对华关税（Lists 1/2/3：25%，List 4A：7.5%——9903.88 项下）尚未完整入库，此估算可能偏低。报价前请核实产品所属清单。",
    });
  }
  return out;
}
