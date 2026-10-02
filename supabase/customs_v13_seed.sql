-- ============================================================
-- customs_v13_seed.sql — AD/CVD watchlist case-number + scope backfill
-- Source: Federal Register order/continuation/sunset notices, verified
-- 2026-10-02 against official FR notice text. Guarded / re-runnable.
-- Run AFTER customs_v13.sql. Run in Supabase SQL Editor as owner.
-- ============================================================

-- 1. aluminum extrusions | China | A-570-967 / C-570-968
update public.ad_cvd_watch set
  case_numbers = 'A-570-967 / C-570-968',
  scope_summary = 'Aluminum extrusions — shapes/forms produced by extrusion process from aluminum alloys. 2011 orders; active (AD admin review final 2026-08-17).',
  exclusions = 'Finished heat sinks excluded (ITC negative injury); many product-specific scope rulings',
  last_verified = '2026-10-02'
where product_keyword = 'aluminum extrusions' and origin = 'China';

-- 2. wooden bedroom furniture | China | A-570-890
update public.ad_cvd_watch set
  case_numbers = 'A-570-890',
  scope_summary = 'Wooden bedroom furniture: dressers, chests, nightstands, headboards/footboards, armoires, mirror chests. 2005 order; active (2026-08-12 admin review).',
  exclusions = 'Non-wood furniture (metal/glass/upholstery) out of scope; scope rulings apply',
  last_verified = '2026-10-02'
where product_keyword = 'wooden bedroom furniture' and origin = 'China';

-- 3. steel wheels | China | A-570-090 / C-570-091
update public.ad_cvd_watch set
  case_numbers = 'A-570-090 / C-570-091',
  scope_summary = '"Certain Steel Wheels 12 to 16.5 Inches in Diameter" (steel trailer wheels). 2019 orders; continued after 2024 sunset review.',
  exclusions = 'Wheels outside 12–16.5″ band',
  last_verified = '2026-10-02'
where product_keyword = 'steel wheels' and origin = 'China';

-- 4. passenger vehicle tires | China | A-570-016 / C-570-017
update public.ad_cvd_watch set
  case_numbers = 'A-570-016 / C-570-017',
  scope_summary = 'Passenger vehicle and light truck tires. 2015 orders; continued 2026-07-16 (FR 2026-14293).',
  exclusions = 'OTR/specialty tires per scope',
  last_verified = '2026-10-02'
where product_keyword = 'passenger vehicle tires' and origin = 'China';

-- 5. passenger vehicle tires | Thailand | A-549-842
update public.ad_cvd_watch set
  case_numbers = 'A-549-842',
  scope_summary = 'PVLT tires. 2021 AD order; continued after 2026-09-30 sunset review.',
  exclusions = 'Specific spare-tire models excluded via scope rulings (e.g. Maxxis TG000002, 2024)',
  last_verified = '2026-10-02'
where product_keyword = 'passenger vehicle tires' and origin = 'Thailand';

-- 6. passenger vehicle tires | Vietnam | C-552-829
update public.ad_cvd_watch set
  case_numbers = 'C-552-829',
  scope_summary = 'PVLT tires. 2021 CVD order (first-ever CVD based on currency undervaluation). The concurrent AD investigation (A-552-828) was terminated after ITC negative injury — no AD order exists.',
  exclusions = 'AD duties do not apply — CVD only',
  last_verified = '2026-10-02'
where product_keyword = 'passenger vehicle tires' and origin = 'Vietnam';

-- 7. solar cells and modules | China | A-570-979 / C-570-980 / A-570-010 / C-570-011
update public.ad_cvd_watch set
  case_numbers = 'A-570-979 / C-570-980 / A-570-010 / C-570-011',
  scope_summary = 'Two coexisting cases: 2012 = CSPV cells whether or not assembled into modules; 2015 = "Certain Crystalline Silicon Photovoltaic Products" (closes Taiwan-cell assembly loophole).',
  exclusions = '2012: off-grid panels revoked in part (2018); 2015: battery-unit panels revoked in part (2017)',
  last_verified = '2026-10-02'
where product_keyword = 'solar cells and modules' and origin = 'China';

-- 8. solar cells and modules | Cambodia | A-555-003 / C-555-004
update public.ad_cvd_watch set
  case_numbers = 'A-555-003 / C-555-004',
  scope_summary = 'CSPV cells whether or not assembled into modules. 2024 petition wave; AD/CVD orders issued 2025-06-24 (FR 2025-11588/11589).',
  exclusions = 'Thin-film (a-Si, CdTe, CIGS); small cells integrated into consumer goods; off-grid portable panels',
  last_verified = '2026-10-02'
where product_keyword = 'solar cells and modules' and origin = 'Cambodia';

-- 9. solar cells and modules | Malaysia | A-557-830 / C-557-831
update public.ad_cvd_watch set
  case_numbers = 'A-557-830 / C-557-831',
  scope_summary = 'Same 2024 petition wave; AD/CVD orders 2025-06-24 (FR 2025-11588/11589).',
  exclusions = 'Same as row 8',
  last_verified = '2026-10-02'
where product_keyword = 'solar cells and modules' and origin = 'Malaysia';

-- 10. solar cells and modules | Thailand | A-549-851 / C-549-852
update public.ad_cvd_watch set
  case_numbers = 'A-549-851 / C-549-852',
  scope_summary = 'Same 2024 wave CSPV scope; AD/CVD orders 2025-06-24.',
  exclusions = 'Thin-film; cells ≤10,000 mm² in consumer goods; off-grid small/portable panels',
  last_verified = '2026-10-02'
where product_keyword = 'solar cells and modules' and origin = 'Thailand';

-- 11. solar cells and modules | Vietnam | A-552-841 / C-552-842
update public.ad_cvd_watch set
  case_numbers = 'A-552-841 / C-552-842',
  scope_summary = 'Same 2024 wave CSPV scope; AD/CVD orders 2025-06-24 (Vietnam AD amended for ministerial errors 2025-07-07).',
  exclusions = 'Same as row 10',
  last_verified = '2026-10-02'
where product_keyword = 'solar cells and modules' and origin = 'Vietnam';

-- 12. mattresses | China | A-570-092 / C-570-128
update public.ad_cvd_watch set
  case_numbers = 'A-570-092 / C-570-128',
  scope_summary = 'All youth and adult mattresses (adult = width >35″, length >72″, depth >3″). AD continued 2025-05-28; CVD first sunset final 2026-07-24, five-year reviews underway.',
  exclusions = 'Futon mattresses; airbeds/inflatables; waterbeds; convertible multifunctional furniture; uncovered innerspring units',
  last_verified = '2026-10-02'
where product_keyword = 'mattresses' and origin = 'China';

-- 13. mattresses | Vietnam | A-552-827
update public.ad_cvd_watch set
  case_numbers = 'A-552-827',
  scope_summary = 'Same mattress scope as row 12; AD-only (no CVD investigation brought).',
  exclusions = 'Same as row 12',
  last_verified = '2026-10-02'
where product_keyword = 'mattresses' and origin = 'Vietnam';

-- 14. quartz surface products | China | A-570-084 / C-570-085
update public.ad_cvd_watch set
  case_numbers = 'A-570-084 / C-570-085',
  scope_summary = 'Quartz surface products: slabs/surfaces of silica + resin binder (silica predominant by weight); all sizes; incl. countertops, backsplashes, vanity tops. Continued 2025-01-30.',
  exclusions = 'Crushed glass surface products (with qualifying criteria)',
  last_verified = '2026-10-02'
where product_keyword = 'quartz surface products' and origin = 'China';

-- 15. ceramic tile | China | A-570-108 / C-570-109
update public.ad_cvd_watch set
  case_numbers = 'A-570-108 / C-570-109',
  scope_summary = 'Ceramic flooring/wall/paving/hearth/porcelain/mosaic tile, <3.2 cm thick, any glaze/size/backing; incl. slabs >1 m². Continued 2026-03-02.',
  exclusions = 'None widely noted',
  last_verified = '2026-10-02'
where product_keyword = 'ceramic tile' and origin = 'China';

-- 16. steel nails | China | A-570-909
update public.ad_cvd_watch set
  case_numbers = 'A-570-909',
  scope_summary = 'Certain steel nails, shaft ≤12″, any steel type/finish/head/shank/point. Continued 2025-05-01.',
  exclusions = 'Steel roofing nails; corrugated nails; powder-actuated fasteners (7317.00.20/30); certain two-piece washer nails',
  last_verified = '2026-10-02'
where product_keyword = 'steel nails' and origin = 'China';

-- 17. paper shopping bags | China | A-570-152 / C-570-153
update public.ad_cvd_watch set
  case_numbers = 'A-570-152 / C-570-153',
  scope_summary = 'Paper shopping bags with handles, width ≥4.5″, depth ≥2.5″, <300 GSM, any cellulose fiber/paperboard. AD order 2024-07-18 (8-country); CVD order 2024-07-18 (China + India).',
  exclusions = 'None widely noted in order notice',
  last_verified = '2026-10-02'
where product_keyword = 'paper shopping bags' and origin = 'China';

-- 18. hardwood plywood | China | A-570-051 / C-570-052
update public.ad_cvd_watch set
  case_numbers = 'A-570-051 / C-570-052',
  scope_summary = 'Hardwood and decorative plywood: multilayered veneered panels with non-coniferous/bamboo face-back veneer. Continued 2023-06-06; 2023 scope/circumvention rulings active.',
  exclusions = 'Extensive scope rulings (esp. 2-ply panels) — check per SKU',
  last_verified = '2026-10-02'
where product_keyword = 'hardwood plywood' and origin = 'China';

-- 19. cast iron soil pipe | China | A-570-079 / C-570-080
update public.ad_cvd_watch set
  case_numbers = 'A-570-079 / C-570-080',
  scope_summary = 'Cast iron soil pipe (hubless/service-weight). Orders eff. 2019-05-03; continued 2024-11-18.',
  exclusions = 'Do not confuse with sibling CVD-only case on soil pipe fittings (C-570-063)',
  last_verified = '2026-10-02'
where product_keyword = 'cast iron soil pipe' and origin = 'China';

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

-- 22. wooden cabinets and vanities | China | A-570-106 / C-570-107
update public.ad_cvd_watch set
  case_numbers = 'A-570-106 / C-570-107',
  scope_summary = 'Wooden cabinets and vanities and components thereof. Orders eff. 2020-04-21.',
  exclusions = 'None widely noted; third-country circumvention inquiries spawned',
  last_verified = '2026-10-02'
where product_keyword = 'wooden cabinets and vanities' and origin = 'China';

-- 23. polyester textured yarn | China | A-570-097 / C-570-098
update public.ad_cvd_watch set
  case_numbers = 'A-570-097 / C-570-098',
  scope_summary = 'Polyester textured yarn. Orders eff. 2020-01-10 (supersede the 2006–07 investigation); continued 2025-06-27.',
  exclusions = 'None widely noted',
  last_verified = '2026-10-02'
where product_keyword = 'polyester textured yarn' and origin = 'China';

-- 24. common alloy aluminum sheet | China | A-570-073 / C-570-074
update public.ad_cvd_watch set
  case_numbers = 'A-570-073 / C-570-074',
  scope_summary = 'Common alloy aluminum sheet (rare Commerce self-initiated case). CVD eff. 2019-02-06; AD eff. 2019-02-08; continued 2024-09-06.',
  exclusions = 'None widely noted',
  last_verified = '2026-10-02'
where product_keyword = 'common alloy aluminum sheet' and origin = 'China';

-- 25. steel propane cylinders | China | A-570-086 / C-570-087
update public.ad_cvd_watch set
  case_numbers = 'A-570-086 / C-570-087',
  scope_summary = 'Steel propane cylinders meeting DOT 4B/4BA/4BW, TC 4BM/4BAM/4BWM, or ISO 4706; 2.5–42 lb nominal capacity. Orders eff. 2019-08-15; continued 2025-07-10.',
  exclusions = 'Do not confuse with High Pressure Steel Cylinders (A-570-977/C-570-978) or Non-Refillable Steel Cylinders (A-570-126/C-570-127)',
  last_verified = '2026-10-02'
where product_keyword = 'steel propane cylinders' and origin = 'China';

-- 26. large residential washers | China | A-570-033
update public.ad_cvd_watch set
  case_numbers = 'A-570-033',
  scope_summary = 'Large residential washers (Whirlpool petition). AD order eff. 2017-02-06; continued 2022-08-30 after 2nd sunset review.',
  exclusions = 'No CVD case exists. Section 201 safeguard tariffs (2018) were separate and have expired.',
  last_verified = '2026-10-02'
where product_keyword = 'large residential washers' and origin = 'China';

-- 27. truck and bus tires | China | A-570-040 / C-570-041
update public.ad_cvd_watch set
  case_numbers = 'A-570-040 / C-570-041',
  scope_summary = 'Truck and bus tires. Orders continued 2024-08-29 (FR 2024-19390).',
  exclusions = 'None widely noted — verify order appendix',
  last_verified = '2026-10-02'
where product_keyword = 'truck and bus tires' and origin = 'China';

-- 28. glycine | China | A-570-836
update public.ad_cvd_watch set
  case_numbers = 'A-570-836',
  scope_summary = 'Glycine of all purity levels; free-flowing crystalline material; HTS 2922.49.4020 (description dispositive). Continued 2022-09-14.',
  exclusions = 'D(-)Phenylglycine Ethyl Dane Salt ruled outside scope',
  last_verified = '2026-10-02'
where product_keyword = 'glycine' and origin = 'China';

-- 29. citric acid | China | A-570-937 / C-570-938
update public.ad_cvd_watch set
  case_numbers = 'A-570-937 / C-570-938',
  scope_summary = 'All grades/granulation of citric acid, sodium citrate, potassium citrate (unblended, dry or solution); blends where unblended forms ≥40% by weight; crude calcium citrate intermediates. Continued 2026-05-29.',
  exclusions = 'USP-grade calcium citrate mixed with functional excipient (dextrose/starch)',
  last_verified = '2026-10-02'
where product_keyword = 'citric acid' and origin = 'China';

-- 30. diamond sawblades | China | A-570-900
update public.ad_cvd_watch set
  case_numbers = 'A-570-900',
  scope_summary = 'Diamond sawblades and parts thereof. 3rd sunset review final results 2026-07-06 — order continues.',
  exclusions = 'None widely noted (full scope in Issues & Decision Memo)',
  last_verified = '2026-10-02'
where product_keyword = 'diamond sawblades' and origin = 'China';

-- 31. steel concrete reinforcing bar | China | A-570-860
update public.ad_cvd_watch set
  case_numbers = 'A-570-860',
  scope_summary = 'Steel concrete reinforcing bars in straight lengths (HTS 7214.20.00 et al.; description dispositive). Orders continued 2024-12-23 (FR 2024-30533).',
  exclusions = 'Plain rounds (non-deformed/smooth bars); rebar further processed through bending or coating',
  last_verified = '2026-10-02'
where product_keyword = 'steel concrete reinforcing bar' and origin = 'China';

-- 32. oil country tubular goods | China | A-570-943 / C-570-944
update public.ad_cvd_watch set
  case_numbers = 'A-570-943 / C-570-944',
  scope_summary = 'Hollow steel OCTG incl. casing/tubing (carbon/alloy, seamless/welded, finished or unfinished) plus coupling stock. Continued 2026-06-23.',
  exclusions = 'Casing/tubing ≥10.5% chromium; drill pipe; unattached couplings; unattached thread protectors',
  last_verified = '2026-10-02'
where product_keyword = 'oil country tubular goods' and origin = 'China';

-- 33. cold-rolled steel flat products | China | A-570-029 / C-570-030
update public.ad_cvd_watch set
  case_numbers = 'A-570-029 / C-570-030',
  scope_summary = 'Certain cold-rolled flat-rolled steel products (coils ≥12.7 mm width; straight lengths meeting thickness/width ratios). Continued Aug 2022.',
  exclusions = 'Clad, plated, or metal-coated products',
  last_verified = '2026-10-02'
where product_keyword = 'cold-rolled steel flat products' and origin = 'China';

-- 34. corrosion-resistant steel | China | A-570-026 / C-570-027
update public.ad_cvd_watch set
  case_numbers = 'A-570-026 / C-570-027',
  scope_summary = 'Certain corrosion-resistant steel products (2016 multi-country orders). Circumvention inquiry initiated 2026-07-06 (FR 2026-13607) — orders active.',
  exclusions = 'None widely noted in materials reviewed',
  last_verified = '2026-10-02'
where product_keyword = 'corrosion-resistant steel' and origin = 'China';

-- verify:
-- select product_keyword, origin, case_type, case_numbers, last_verified from public.ad_cvd_watch order by product_keyword;