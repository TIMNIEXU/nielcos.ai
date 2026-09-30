# USTR Section 301 Lists 1/2/3/4A — 8-digit HTS data

Data files: `list1.json`, `list2.json`, `list3.json`, `list4a.json`
(JSON arrays of 8-digit HTS strings, digits only, sorted ascending, deduplicated.)

Compiled 2026-09-30. Counts: List 1 = 818 · List 2 = 279 · List 3 = 5,756 · List 4A = 3,229.

## Primary data source (third-party, cross-checked)

Per-tranche spreadsheets from a customs-data provider portal
(`syslp.customsinfo.com`, "US Section 301 and 232 duties" page, circa 2019–2020):

- List 1: https://syslp.customsinfo.com/Sections/Home/Download/Sec301-99038801.xlsx
  (sheet "Specification": HSCode + 25% duty)
- List 2: https://syslp.customsinfo.com/Sections/Home/Download/Sec301-99038802.xlsx
  (sheet "Specification")
- List 3: https://syslp.customsinfo.com/Sections/Home/Download/Sec301-99038803.xlsx
  (sheet "Specification")
- List 4A: https://syslp.customsinfo.com/Sections/Home/Download/Sec301-99038815.xlsx
  (sheet "4A": 8-digit subheading + 10-digit hscode + descriptions)

Local copies of the downloaded workbooks were used for extraction only and are
not committed here.

## Official references (used for cross-checking, not line-level parsing)

| List | 9903 provision | Rate | Effective | Federal Register |
|------|---------------|------|-----------|------------------|
| List 1 (Tranche 1) | 9903.88.01 | 25% | 2018-07-06 | 83 FR 28710 (2018-06-20) |
| List 2 (Tranche 2) | 9903.88.02 | 25% | 2018-08-23 | 83 FR 40823 (2018-08-16) |
| List 3 (Tranche 3) | 9903.88.03 | 25% (10% at first, raised 2019-05-10 per 84 FR 20459) | 2018-09-24 | 83 FR 47974 (2018-09-21, FR Doc 2018-20610) |
| List 4A (Tranche 4A) | 9903.88.15 | 7.5% (15% at first, cut 2020-02-14) | 2019-09-01 | 84 FR 43304 (2019-08-20, FR Doc 2019-17865), Annex A |

- CBP tranche summary (provision ↔ effective-date mapping):
  https://content.govdelivery.com/attachments/USDHSCBP/2019/11/08/file_attachments/1321425/Section%20301%20China%20Tables.pdf
- USTR product search (per-HTS lookup, official):
  https://ustr.gov/issue-areas/enforcement/section-301-investigations/search
- List 4B (9903.88.16, Annex C of 84 FR 43304 / 84 FR 45821) was **suspended
  indefinitely 2019-12-18 (84 FR 69447)** and never took effect — **not included**.
  Spot-checked absent: 8517.12.00 (phones), 9504.50.00 (game consoles), 8471.30.01.

## Cross-checks performed

1. **Counts vs published figures**
   - L1: 818 = published 818 ✓
   - L2: 279 = published 279 ✓
   - L3: 5,756 vs USTR-announced 5,745 "full or partial tariff items"
     (Miller & Company summary of the Sept 17, 2018 USTR statement). The +11
     matches the **11 eight-digit provisions with partial (product-limited)
     coverage in Annex A Part 2** of 83 FR 47974 — see caveat 1.
   - L4A: 3,229 unique 8-digit vs **3,243 tariff lines** per the USTR remand
     report (via Trade Law Daily, 2022-08-03). The −14 is consistent with annex
     lines specified at 10-digit granularity collapsing onto shared 8-digit
     parents (source file expands to 6,119 distinct 10-digit codes). See caveat 2.
2. **Anchors** (all pass): `48211040` ∈ List 3, `73182900` ∈ List 3,
   `95069100` ∈ List 4A.
3. **Mutual exclusivity**: zero 8-digit codes appear in more than one list.
4. **Format**: every entry exactly 8 digits, no punctuation; arrays sorted and
   unique (machine-verified).
5. **HTS-vintage check**: each workbook's second sheet ("Actual HS as of
   3-2019", 10-digit) reduces to the *identical* 8-digit set as the
   "Specification" sheet for Lists 1–3 — no 2018→2019 revision drift at 8-digit
   level.
6. FR full texts for 83 FR 47974 and 84 FR 43304 were fetched from
   federalregister.gov/govinfo, but **both publish their annex tables as
   scanned TIFF images** ("[GRAPHIC] [TIFF OMITTED]"), so machine line-level
   verification against the FR was not possible; counts were instead checked
   against USTR-statement figures reported by trade press (above).

## Caveats

1. **List 3 partial-coverage provisions.** 83 FR 47974 Annex A Part 2 limits 11
   eight-digit subheadings to specific products (to carve out smart watches,
   Bluetooth devices, etc.). This dataset includes those 11 as *full* 8-digit
   entries (matching the source workbook). A product-level estimator will
   therefore over-apply the 25% within those subheadings. The 11 could not be
   identified from machine-readable sources (annex is scanned images; USTR's
   original PDF is offline after their site migration). Keep the existing
   "verify list membership" warning for China-origin estimates.
2. **List 4A count.** The brief expected ~3,800 lines, but the only published
   line count found is **3,243 tariff lines**. 3,229 unique 8-digit subheadings
   is consistent with that figure; ~3,800 could not be corroborated and may
   refer to a different counting basis. Not treated as an error.
3. **Product exclusions NOT modeled** (out of scope): USTR granted many
   10-digit/product-specific exclusions 2018–2020 (reflected in 9903.88.05–.70
   headings); most have expired. Exclusion logic is a separate data project.
4. **Vintage**: source workbooks are 2019–2020 vintage, i.e. *before* the 2024
   four-year review, which raised rates on select lines and added new 9903.88
   provisions. This dataset is the correct base for the classic 25%/7.5%
   model; 2024-review deltas are out of scope here.
5. **Granularity**: everything is 8-digit. Where USTR drew lines at 10-digit
   or partial-subheading level, the whole 8-digit is included (over-inclusive
   by design at this stage — never silently under-reports).
