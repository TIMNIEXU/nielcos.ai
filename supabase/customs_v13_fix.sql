-- ============================================================
-- customs_v13_fix.sql - backfill the 6 rows missed due to case_type ordering
-- + merge the hardwood plywood 2018 orders + 2026 investigation into one row.
-- Guarded / re-runnable. Run once in Supabase SQL Editor as owner.
-- ============================================================

-- 6. passenger vehicle tires | Vietnam | C-552-829
update public.ad_cvd_watch set
  case_numbers = 'C-552-829',
  scope_summary = 'PVLT tires. 2021 CVD order (first-ever CVD based on currency undervaluation). The concurrent AD investigation (A-552-828) was terminated after ITC negative injury - no AD order exists.',
  exclusions = 'AD duties do not apply - CVD only',
  last_verified = '2026-10-02'
where product_keyword = 'passenger vehicle tires' and origin = 'Vietnam';

-- 12. mattresses | China | A-570-092 / C-570-128
update public.ad_cvd_watch set
  case_numbers = 'A-570-092 / C-570-128',
  scope_summary = 'All youth and adult mattresses (adult = width >35", length >72", depth >3"). AD continued 2025-05-28; CVD first sunset final 2026-07-24, five-year reviews underway.',
  exclusions = 'Futon mattresses; airbeds/inflatables; waterbeds; convertible multifunctional furniture; uncovered innerspring units',
  last_verified = '2026-10-02'
where product_keyword = 'mattresses' and origin = 'China';

-- 20. forged steel fittings | China | A-570-067 / C-570-068
update public.ad_cvd_watch set
  case_numbers = 'A-570-067 / C-570-068',
  scope_summary = 'Forged carbon/alloy steel fittings (threaded, socket-weld, butt-weld), HTS 7307.99/7307.92/7326.19. Orders eff. 2018-11-26.',
  exclusions = 'Low-pressure fittings; scope rulings excluded specific products (SDABS couplers, UTEX LargeBore, AGS brake hose fittings)',
  last_verified = '2026-10-02'
where product_keyword = 'forged steel fittings' and origin = 'China';

-- 21. stainless steel flanges | China | A-570-064 / C-570-065
update public.ad_cvd_watch set
  case_numbers = 'A-570-064 / C-570-065',
  scope_summary = 'Stainless steel flanges, finished and unfinished, all types. AD eff. 2018-08-01; CVD eff. 2018-06-05.',
  exclusions = 'None widely noted; do not confuse with India case (A-533-871)',
  last_verified = '2026-10-02'
where product_keyword = 'stainless steel flanges' and origin = 'China';

-- 25. steel propane cylinders | China | A-570-086 / C-570-087
update public.ad_cvd_watch set
  case_numbers = 'A-570-086 / C-570-087',
  scope_summary = 'Steel propane cylinders meeting DOT 4B/4BA/4BW, TC 4BM/4BAM/4BWM, or ISO 4706; 2.5-42 lb nominal capacity. Orders eff. 2019-08-15; continued 2025-07-10.',
  exclusions = 'Do not confuse with High Pressure Steel Cylinders (A-570-977/C-570-978) or Non-Refillable Steel Cylinders (A-570-126/C-570-127)',
  last_verified = '2026-10-02'
where product_keyword = 'steel propane cylinders' and origin = 'China';

-- 31. steel concrete reinforcing bar | China | A-570-860
update public.ad_cvd_watch set
  case_numbers = 'A-570-860',
  scope_summary = 'Steel concrete reinforcing bars in straight lengths (HTS 7214.20.00 et al.; description dispositive). Orders continued 2024-12-23 (FR 2024-30533).',
  exclusions = 'Plain rounds (non-deformed/smooth bars); rebar further processed through bending or coating',
  last_verified = '2026-10-02'
where product_keyword = 'steel concrete reinforcing bar' and origin = 'China';

-- ---------- hardwood plywood: merge 2018 orders + 2026 investigation ----------
update public.ad_cvd_watch set
  case_numbers = 'A-570-051 / C-570-052 / A-570-211 / C-570-212',
  status = 'order_in_place',
  note = '2018 AD/CVD orders in place; NEW 2026 investigation A-570-211/C-570-212 (final affirmative determination 2026-07-21, ITC injury pending) explicitly carves out merchandise covered by the 2018 orders.',
  scope_summary = 'Hardwood and decorative plywood: multilayered veneered panels with non-coniferous/bamboo face-back veneer. 2018 orders continued; 2023 scope/circumvention rulings active.',
  exclusions = 'Extensive scope rulings (esp. 2-ply panels) - check per SKU. The 2026 investigation excludes plywood covered by the 2018 orders; structural plywood (PS 1/PS 2); cork face/back; wood flooring orders; solid bamboo; RTA/finished furniture.',
  last_verified = '2026-10-02'
where product_keyword = 'hardwood plywood' and origin = 'China';

-- verify: expect 0 missing
-- select count(*) filter (where case_numbers is null) as missing, count(*) as total from public.ad_cvd_watch;
