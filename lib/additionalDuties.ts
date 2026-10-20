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

/* Section 232 metals scope row (hts_232_scope, customs_v23): HTS-specific
   article/derivative membership per metal from CBP's Metals HTS List
   (U.S. Note 16(c) subdivisions). tier: 'std50' (9903.82.02) | 'std25'
   (9903.82.09) | 'floor10' (9903.82.07/.08 combined col.1+232 floor). */
export type Scope232Row = {
  hts_prefix: string;
  metal: string;
  subdiv: string;
  kind: string;
  tier: string;
  effective_from: string | null;
  source: string;
  note: string;
};

export type DutyOpts = {
  scope232?: Scope232Row[];
  metal?: string; // structured metal declaration; wins over free text
  metalWeightPct?: number; // covered-metal share of total weight, 0-100
  metalOriginCountry?: string; // where the metal was melted/smelted (232 tiers)
  usContentPct?: number; // USMCA: U.S. content share of value, 0-100 (estimator-side math)
  entryDate?: string; // YYYY-MM-DD — drives the 2028-01-01 tier sunset
};

/* Column 2 / non-NTR countries (HTSUS general note 3(b)). */
const GN3B = new Set(["BELARUS", "CUBA", "NORTH KOREA", "RUSSIA"]);
/* 9903.82.22 listed partners (15% on (xi) derivative steel): named
   economies + EU member states. */
const PARTNER15 = new Set([
  "ARGENTINA", "ECUADOR", "EL SALVADOR", "GUATEMALA", "JAPAN",
  "SOUTH KOREA", "LIECHTENSTEIN", "SWITZERLAND", "TAIWAN", "UNITED KINGDOM",
  "AUSTRIA", "BELGIUM", "BULGARIA", "CROATIA", "CYPRUS", "CZECH REPUBLIC",
  "DENMARK", "ESTONIA", "FINLAND", "FRANCE", "GERMANY", "GREECE", "HUNGARY",
  "IRELAND", "ITALY", "LATVIA", "LITHUANIA", "LUXEMBOURG", "MALTA",
  "NETHERLANDS", "POLAND", "PORTUGAL", "ROMANIA", "SLOVAKIA", "SLOVENIA",
  "SPAIN", "SWEDEN",
]);

export function normMetal(s?: string | null): string | null {
  const u = (s || "").trim().toLowerCase();
  return u === "steel" || u === "aluminum" || u === "copper" ? u : null;
}

/* Best-effort metal from a free-text material ("Stainless steel",
   "铝合金", ...). Aluminum is tested first: e.g. 7614.10 aluminum wire
   with a steel core is an ALUMINUM derivative on the CBP list. */
export function metalFromText(material: string): string | null {
  const m = material || "";
  if (/alumin/i.test(m) || /铝|鋁/.test(m)) return "aluminum";
  if (/copper/i.test(m) || /铜|銅/.test(m)) return "copper";
  if (/steel|iron/i.test(m) || /钢|鋼|铁|鐵/.test(m)) return "steel";
  return null;
}

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
  rules: DutyRule[],
  opts?: DutyOpts
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

  // 1c) Section 232 metals scope (hts_232_scope, customs_v23): the
  // HTS-specific derivative/article lists the headline rules above never
  // covered. Membership is PER METAL — a code listed for aluminum is not
  // steel scope (8302.50.0000, CBP ruling NY N346991). The curated
  // additional_duties 232 rules win when they already produced a rate;
  // scope only fills the gap. A resolved 232 rate here also drives the
  // 301-FL exclusion flip in (2) via scopeHas232.
  const scope = opts?.scope232 ?? [];
  let scopeHas232 = false;
  let scopeChecked = false;
  if (scope.length && !byType.has("232")) {
    const hits = scope.filter((r) => r.hts_prefix && bare.startsWith(r.hts_prefix));
    if (hits.length) {
      scopeChecked = true;
      const metal = normMetal(opts?.metal) ?? metalFromText(material);
      if (metal) {
        const mh = hits.filter((r) => r.metal === metal);
        if (mh.length) {
          // Longest listed prefix wins (most specific membership).
          const best = mh.reduce((a, b) => (b.hts_prefix.length > a.hts_prefix.length ? b : a));
          const w = opts?.metalWeightPct;
          const chapter = bare.slice(0, 2);
          if (
            w != null &&
            w <= 15 &&
            !["72", "73", "74", "76"].includes(chapter)
          ) {
            // In 232 scope but the metal share is at/below the 15%-of-weight
            // threshold (or zero): $0 exclusion line, NOT a 232 hit — the
            // forced-labor blanket in (2) still applies (the 9903.05.90
            // exception is for products the 232 duty actually reaches).
            out.push({
              kind: "rate",
              duty_type: "232-EXCL",
              rate: 0,
              source: best.source,
              note:
                w === 0
                  ? "Section 232 metals: article contains no aluminum, steel or copper (9903.82.01)"
                  : "Section 232 metals exclusion — covered metal is 15% or less of the total weight of the article (9903.82.03)",
              basis: "full_value",
            });
          } else {
            // Standard + special tiers (CSMS #68855869 / U.S. Note 16).
            // Order matters: origin/metal-origin specials beat the
            // standard tier; the interim headings (.07-.12, .20-.22)
            // sunset on 2028-01-01 and collapse to the standard rates.
            const subdiv = best.subdiv;
            const post2028 = !!opts?.entryDate && opts.entryDate >= "2028-01-01";
            const metalOrgRaw = normOrigin(opts?.metalOriginCountry ?? "");
            const metalOrg = ["US", "USA"].includes(metalOrgRaw) ? "UNITED STATES" : metalOrgRaw;
            let rate: number;
            let basis = "full_value";
            let note = best.note;
            if (org === "RUSSIA" && subdiv === "iv") {
              rate = 10;
              note = "Section 232 — product of Russia, derivative steel articles (9903.82.15): 10% on full customs value.";
            } else if (org === "RUSSIA" && subdiv === "x") {
              rate = 25;
              note = "Section 232 — product of Russia (9903.82.17): 25% on full customs value.";
            } else if (GN3B.has(org) && best.tier === "floor10" && !post2028) {
              rate = 25;
              note = "Section 232 — product of a column 2 (non-NTR) country (9903.82.12): 25% on full customs value, through 2027-12-31.";
            } else if (
              metalOrg === "UNITED STATES" &&
              ["ii", "iv", "vi", "vii", "viii", "xi"].includes(subdiv)
            ) {
              rate = 10;
              note = "Section 232 — made with U.S. melted/smelted metal (at least 85% of the metal content) (9903.82.06): 10% on full customs value.";
            } else if (
              org === "UNITED KINGDOM" &&
              metalOrg === "UNITED KINGDOM" &&
              ["i", "ii", "iii", "iv"].includes(subdiv)
            ) {
              rate = 25;
              note = "Section 232 — UK product with at least 95% UK melted/smelted metal (9903.82.04): 25% on full customs value.";
            } else if (
              org === "UNITED KINGDOM" &&
              metalOrg === "UNITED KINGDOM" &&
              ["vi", "vii"].includes(subdiv)
            ) {
              rate = 15;
              note = "Section 232 — UK derivative with at least 95% UK melted/smelted metal (9903.82.05): 15% on full customs value.";
            } else if (subdiv === "xi" && PARTNER15.has(org) && !post2028) {
              rate = 15;
              note = "Section 232 — derivative steel article of a listed partner economy (9903.82.22): 15% on full customs value, through 2027-12-31.";
            } else if (
              subdiv === "xi" &&
              (org === "CANADA" || org === "MEXICO") &&
              !post2028
            ) {
              // Rate stays 25 with basis 'usmca_split': the estimator
              // applies the 40%-of-value U.S.-content cap (9903.82.21
              // at 0%) when the user declares the U.S. content share.
              rate = 25;
              basis = "usmca_split";
              note = "Section 232 — USMCA derivative steel (9903.82.20/.21): 25% on non-U.S. content and on U.S. content above 40% of value; U.S. content up to 40% of value enters at 0%. Two-line entry reporting. Through 2027-12-31.";
            } else if (best.tier === "floor10") {
              if (post2028) {
                rate = 25;
                note =
                  best.note +
                  " From 2028-01-01 the interim floor headings (9903.82.07-.12) expire; the standard derivative rate under 9903.82.09 applies.";
              } else {
                rate = 10;
                basis = "floor10";
              }
            } else {
              rate = best.tier === "std50" ? 50 : 25;
            }
            out.push({
              kind: "rate",
              duty_type: "232",
              rate,
              source: best.source,
              note,
              basis,
            });
            scopeHas232 = true;
          }
        }
        // else: listed only for other metals — not subject for the declared
        // metal; stay silent (scopeChecked suppresses the generic warning).
      } else {
        const metals = [...new Set(hits.map((r) => r.metal))].join(" / ");
        out.push({
          kind: "warning",
          text: `Section 232: ${disp} is on the Section 232 metals list (${metals}). The duty depends on which metal the article is made of — declare the metal (and its share of total weight) to price it. An article made of a metal not listed for this code is not subject.`,
          text_zh: `Section 232：税号 ${disp} 在 232 金属清单上（${metals}）。税率取决于产品实际所含金属——请注明金属类型（及其占总重量的比例）以计价；产品若由该税号未列明的金属制成，则不在征收范围内。`,
        });
      }
    }
  }

  // 2) Blanket origin-based rules (e.g. Section 301 forced labor, all HTS).
  // 232-covered products are excepted from the forced-labor 301
  // (9903.05.90): show the exclusion as a $0 line instead of charging it.
  const has232 = scopeHas232 || out.some((s) => s.kind === "rate" && s.duty_type === "232");
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

  // 3) Steel/aluminum/copper product outside the article chapters and
  // outside the loaded scope data: may still fall under the 232
  // derivative list. Warn instead of inventing a number. Skipped when
  // the scope table already resolved this HTS (1c).
  if (!has232 && !scopeChecked && METAL_RE.test(material || "") && org && !["US", "USA", "UNITED STATES"].includes(org)) {
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
