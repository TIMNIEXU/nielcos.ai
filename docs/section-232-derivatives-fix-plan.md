# Section 232 Derivatives — Fix Plan & Data Scope

Status: Phase 1 IMPLEMENTED 2026-10-20 (code + customs_v23.sql ready;
goes live once v23 is run in Supabase). Phases 2–3 pending Tim.
Trigger case: HTS 8302.50.0000, China, entered 2026-10-20 — nielcos.ai
landed-cost returned 37.50% (301 List 3 25% + 301-FL blanket 12.5%);
a competitor returned 50.00% (301 List 3 25% + Section 232 derivative 25%,
301-FL excluded at $0). Root cause is on our side: **no Section 232
derivative scope data exists in our rule library at all.**

---

## 1. What the law looks like now (verified 2026-10-20)

Proclamation 11021 (2026-04-02, effective 2026-04-06) restructured the
Section 232 metals regime; a follow-up proclamation (2026-06-01,
effective 2026-06-08) refined it. Authoritative filer guidance:
**CSMS #68855869** (CBP), HTSUS Chapter 99 headings **9903.82.01–.26**,
U.S. Note 16.

Key mechanics:

1. **Basis = full customs value.** Since 2026-04-06 the 232 duty applies
   to the full value of the article regardless of metal content
   (KPMG/White House fact sheet). The old metal-content-value math is
   gone. → Our estimator already multiplies every rate by full value,
   so the calculation engine needs **no basis change**.
2. **Rate tiers** (per article, one single 232 rate — multi-metal
   stacking was eliminated):
   - **50%** — articles made entirely/almost entirely of steel, aluminum
     or copper, incl. main derivatives (9903.82.02)
   - **25%** — derivative articles substantially made of those metals
   - **15%** — listed metal-intensive industrial / grid equipment,
     through 2027-12-31 (9903.82.10/.11 "combined floor" tier)
   - **10%** — article made abroad with ≥85% U.S.-origin metal
     (threshold lowered from 95% on 2026-06-08) (9903.82.06–.08)
   - **0%** — covered metal ≤15% of total weight (9903.82.03, only for
     articles outside Chapters 72/73/74/76); articles on a listed code
     containing **no** covered metal report under 9903.82.01 at 0%
   - Origin tiers: UK 25%/15% (9903.82.04/.05); listed partners
     (AR/EC/SV/GT/JP/KR/LI/CH/TW/UK/EU) 15% (9903.82.22); non-NTR 25%
     (9903.82.12); Russia steel/copper tiers 50/25/10% (9903.82.14–.17),
     Russian aluminum stays 200% (9903.85.67/.68); USMCA CA/MX
     derivative steel uses two-line split reporting (9903.82.20 at 25%
     on non-U.S. content + U.S. content above 40% of value; 9903.82.21
     at 0% on U.S. content up to 40%).
   - Several interim headings (.07–.12) are scheduled to collapse into
     the standard derivative rates on **2028-01-01** — model with
     `effective_from` rows, same supersede mechanics as 301-CN.
3. **Derivative scope is HTS-list based, per metal.** Membership is
   defined by U.S. Note 16 annexes / CBP-published lists, at 10-digit
   level, separately for steel, aluminum and copper. An article outside
   the metal chapters is only dutiable if it actually contains the metal
   of the list it sits on.
   - Worked example (our trigger case): **8302.50.0000 is on the
     aluminum derivative list** (CBP aluminum HTS list, subdivision (k)
     — derivatives outside Chapter 76) and **not** on the steel list.
     An aluminum bracket → 232 applies (25% tier). A steel/iron bracket
     under the same code → not subject (see CBP ruling NY N346991,
     iron articles under 8302.50.0000 not subject; Faegre Drinker FAQ
     uses this exact code as the example).
4. **301-FL interaction:** products covered by Section 232 are excepted
   from the Section 301 forced-labor duty — shown as a $0 exclusion line
   (9903.05.90). Our matcher **already implements this flip**
   (`lib/additionalDuties.ts`, blanket section: `has232` → `301-FL-EXCL`
   at 0%). It simply never fires for derivatives today because no 232
   rule ever matches them. (Citation to be re-verified against the FL
   action's U.S. Note at build time.)

## 2. Current state of our system (audited 2026-10-20)

| Piece | State |
|---|---|
| `additional_duties` 232 rules | Only Chapters 72/73/74/76 primary-metal prefixes + 4 auto-part codes (8507600010, 8704230100, 8706000300, 8708936000). **Zero derivative-annex rules.** |
| Matcher per-type contest, [NOT SUBJECT] carve-outs | Works (v20/v21 lessons encoded) |
| 232 → 301-FL exclusion flip (9903.05.90) | **Implemented**, dormant for derivatives |
| Derivative warning (metal material + no 232 hit) | Implemented, but only fires when free-text `material` mentions a metal — the public landed-cost flow passes no material, so it stayed silent in the trigger case |
| Estimator math | Full-value for every line — matches the new 232 basis by luck; `basis` field is carried but ignored in math |
| Estimator inputs | No metal type / metal weight % / melt-smelt country inputs |

## 3. Data scope

Source of truth: U.S. Note 16 annexes as published via CBP CSMS
messages and the CBP steel/aluminum/copper HTS lists (govdelivery
attachments). Commerce/USTR may add derivative articles on a rolling
basis (formal inclusion process terminated 2026-06) — lists need a
refresh cadence, not a one-off load.

Rows to build (estimate 1,500–3,000 HTS codes total):

1. **Aluminum derivative list** — subdivisions (j) Chapter 76 +
   (k) outside Chapter 76 (~200 codes in the Mar-2025 CBP list; refresh
   to current Note 16 annex at build time).
2. **Steel derivative list** — Chapter 73 articles + outside-Chapter-73
   derivatives (the Aug-2025 expansion alone added ~400 categories).
3. **Copper derivative list** — smaller; copper entered the regime in
   2025 and was folded into the 9903.82 series in 2026.
4. **15% industrial-equipment list** (9903.82.10/.11 membership) —
   needed to separate the 15% tier from the 25% tier.
5. Primary-metal articles (Ch 72/73/74/76 headings already partly in
   `additional_duties`) — reconcile rates to the 50% tier and the
   current Note 16 headings; keep the v19 chapter-72 work.

Per-code record: `hts_code (10-digit)`, `metal` (steel|aluminum|copper),
`category` (article|derivative|industrial15), plus source + effective
dates. Membership ≠ rate: rate comes from the tier resolver (§4), so a
code appears once per metal it is listed under, not once per rate.

## 4. Design

### 4.1 New table `hts_232_scope` (do NOT overload `additional_duties`)
Static per-code rates cannot express the tier logic (origin, U.S.-metal
share, weight threshold). Keep scope (which codes, which metal, which
category) separate from rate resolution.

```sql
create table hts_232_scope (
  hts_code text not null,          -- 10 digits, no dots
  metal text not null,             -- 'steel' | 'aluminum' | 'copper'
  category text not null,          -- 'article' | 'derivative' | 'industrial15'
  effective_from date not null,
  effective_to date,
  source text not null,            -- CSMS # / Note 16 annex reference
  note text not null default '',
  primary key (hts_code, metal, effective_from)
);
```

### 4.2 Matcher changes (`lib/additionalDuties.ts`)
- New structured inputs (all optional): `metal` ('steel'|'aluminum'|
  'copper'), `metalWeightPct` (0–100), `metalOriginCountry`
  (melt-and-pour / smelt-and-cast country), alongside existing
  free-text `material` (keep as fallback hint).
- New resolution path for duty_type `232`:
  1. Look up scope rows for the 10-digit HTS (and its 8/6-digit
     parents where the annex lists at higher level).
  2. If the user's metal is known: keep only rows for that metal.
     If unknown: emit the existing derivative warning and do not
     invent a rate (current house behavior).
  3. Tier resolution (standard origins first):
     - metal weight ≤15% and code outside Ch 72/73/74/76 → 0%
       exclusion line (9903.82.03), displayed like the FL exclusion
     - no covered metal → 0% line (9903.82.01)
     - category `industrial15` → 15% (through 2027-12-31)
     - category `article`, or derivative "entirely/almost entirely"
       metal → 50%
     - category `derivative` → 25%
     - metal origin = US with ≥85% share → 10% floor tier
     - origin tiers (UK / listed partners / non-NTR / RU) override
       per §1 table; USMCA two-line split shown as one combined
       estimator line + filing note (estimator is advisory; ACE
       two-line reporting is a filing detail)
  4. Emit one `232` rate suggestion carrying the resolved rate,
     9903.82 heading in the note, basis `full_value`.
     The existing `has232` check then flips 301-FL to the $0
     9903.05.90 exclusion automatically — no change needed there.
- Multi-metal articles: resolve each listed metal, apply the single
  highest applicable tier once (stacking eliminated in the new
  regime); if user declared one metal, use that one.

### 4.3 UI changes (`components/DutyEstimator.tsx` + workbench suggest)
- When the HTS is in 232 scope (or description/material mentions a
  covered metal), reveal a compact "Section 232" input group:
  metal type (Steel / Aluminum / Copper), metal share of total weight
  (%), melt/smelt country. Preselect from product material when known.
- No inputs provided → keep the warning, show no 232 number
  (never silently under-report — same principle as the 301-CN
  library warning).
- 0% outcomes render as explicit exclusion lines (9903.82.01/.03),
  mirroring the 301-FL-EXCL presentation, not as missing rows.

### 4.4 What does NOT change
- Estimator line math (full value) — already correct for the new basis.
- 301-CN / 301-FL rule data and contest mechanics.
- PGA, AD/CVD modules.

## 5. Phasing

- **Phase 1 — data + standard tier (fixes the trigger case):**
  `hts_232_scope` table; aluminum + steel derivative lists loaded from
  CBP lists; matcher tier resolution for standard origins (25%/50%/
  15%-industrial/≤15%-weight 0%); FL flip verification on live cases.
- **Phase 2 — UI inputs:** metal type / weight % / melt-smelt country
  on landed-cost and the workbench suggest endpoint; exclusion-line
  rendering.
- **Phase 3 — special tiers:** UK, listed partners, U.S.-metal 10%,
  USMCA split-line note, Russia/non-NTR, copper list completion,
  2028-01-01 scheduled rate shifts as `effective_from` rows.

## 6. Verification (house rules — non-negotiable)

- After each SQL load: `group by duty_type / metal / category` counts
  reconciled against the source list counts (the customs_v10 lesson).
- Live API checks on known cases before calling it done:
  - 8302.50.0000 + aluminum + China → 232 25% line, 301-FL shown as
    $0 exclusion (9903.05.90), List 3 25% intact → total 50%
  - 8302.50.0000 + steel → **no** 232 line (not on steel list)
  - 8302.50.0000 + aluminum, weight 10% → 0% exclusion (9903.82.03)
  - 7202.80.00 ferrotungsten → existing Note 52(b) carve-out intact
  - 3405.10.00.00 China → still 37.50% (no regression)
- Rates/headings re-checked against the U.S. Note 16 text at build
  time; every rule row carries its CSMS/Note source.

## 7. Phase 1 implementation record (2026-10-20)

- Data source used: the CSMS #68855869 **Metals HTS List** attachment
  itself (one consolidated, current list — supersedes the per-metal
  2025 lists in §3). Parsed by `supabase/data_232/parse_metals_list.py`
  → 742 scope rows; QA: the 9903.82.03 section reconciles against the
  canonical sections with 0 unexplained codes (the 55 delta rows are
  Chapter 73/76 codes the <15% treatment lawfully excludes).
- Scope is keyed by **Note 16(c) subdivision**, not just category —
  the tier follows from the subdivision: (i)–(v) → std50,
  (vi)–(viii),(xi) → std25, (ix)–(x) → floor10. The .10/.11 (15%
  floor) code list is byte-identical to .07/.08 (verified) — the split
  is the Note 16 (e)/(f) end-use condition, so Phase 1 stores floor10
  and flags the 15% variant in the row note (Phase 3).
- Matcher: new section 1c in `suggestAdditionalDuties` (optional
  `opts`: scope232 / metal / metalWeightPct). Curated headline rules
  still win; ≤15% weight yields a $0 `232-EXCL` line that does NOT
  trigger the FL flip. Wired into `/api/public/duty-lookup` and
  `/api/app/customs/suggest`; estimator handles basis `floor10`.
- Verified locally: `scripts/test_232_scope.ts` — 9/9 pass (trigger
  case totals 50.00%: List 3 25 + 232 25 + FL $0; steel variant no
  232; 3405.10 and 7202.80 regression checks pass).

## 8. Open questions for Tim

1. Copper list in Phase 1 or Phase 3? (Volume is small; data is the
   least settled of the three metals.)
2. Estimator default when the user won't declare a metal: warning-only
   (recommended) vs. assuming the listed metal at 25% with an
   "unverified" badge.
3. Refresh cadence for the derivative lists: fold into the existing
   HTS revision update, or a separate monthly CSMS watch?
