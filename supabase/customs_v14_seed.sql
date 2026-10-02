-- ============================================================
-- customs_v14_seed.sql — AD/CVD Case Registry seed (10 corridors, 42 cases)
-- Source: Federal Register order/determination notices, verified 2026-10-02.
-- verification_status: verified = FR header/text read; partial = number
-- parent-verified or scope from companion order; see research notes.
-- Rate rule: NO margins/rates are stored — Scope Engine only.
-- Guarded / re-runnable (ON CONFLICT DO UPDATE on case_number).
-- Run AFTER customs_v14.sql. Supabase SQL Editor, project owner.
-- ============================================================

-- A-570-967 AD — Aluminum Extrusions (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-967', 'AD', 'China', 'Aluminum Extrusions',
  'aluminum extrusions which are shapes and forms, produced by an extrusion process, made from aluminum alloys having metallic elements corresponding to the alloy series designations published by The Aluminum Association commencing with the numbers 1, 3, and 6 (or proprietary equivalents or other certifying body equivalents).',
  'Covers aluminum extrusions produced from 1xxx, 3xxx, and 6xxx series alloys — including bars, rods, pipes, tubes, drawn aluminum, parts for window/door frames, solar panels, curtain walls, furniture, and welded/fastened subassemblies. Finishes and fabrication do not remove product from scope.',
  'pipes/tubes/bars/rods; drawn aluminum; window/door frame parts; solar panel parts; curtain wall parts; furniture parts; welded/fastened subassemblies',
  '2xxx/5xxx/7xxx alloy extrusions; fully/permanently assembled finished goods at entry (windows with glass, doors with glass/vinyl, picture frames, solar panels); finished goods kits; cast aluminum; pure unwrought aluminum; finished heat sinks (ITC negative injury)',
  '7604.21.0000, 7604.29.1000, 7604.29.3010, 7604.29.3050, 7604.29.5030, 7604.29.5060, 7608.20.0030, 7608.20.0090, 7610.10, 7610.90, 7616.99',
  'order_in_place', '2011-05-26'::date, null,
  '[{"title": "Aluminum Extrusions From the People''s Republic of China: Antidumping Duty Order", "url": "https://www.federalregister.gov/d/2011-13086", "date": "2011-05-26"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- C-570-968 CVD — Aluminum Extrusions (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'C-570-968', 'CVD', 'China', 'Aluminum Extrusions',
  null,
  'Same scope as the companion AD order A-570-967: aluminum extrusions from 1xxx/3xxx/6xxx series alloys, all forms and fabrications.',
  'Same as A-570-967',
  'Same as A-570-967',
  '7604.21.0000, 7604.29.1000, 7608.20.0030, 7608.20.0090, 7610.10, 7610.90, 7616.99',
  'order_in_place', '2011-05-26'::date, null,
  '[{"title": "Aluminum Extrusions From the People''s Republic of China: Countervailing Duty Order", "url": "https://www.federalregister.gov/d/2011-13103", "date": "2011-05-26"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-570-106 AD — Wooden Cabinets and Vanities (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-106', 'AD', 'China', 'Wooden Cabinets and Vanities',
  'The merchandise covered by this order consists of wooden cabinets and vanities that are for permanent installation (including floor standing and wall hung cabinets and vanities), and wooden components thereof.',
  'Covers wooden cabinets and vanities for permanent installation and wooden components thereof (frames, boxes, doors, drawers, back/end panels, attached desks/shelves/tables), including RTA/flat-pack form.',
  'kitchen/bathroom cabinets, vanities, RTA/flat packs, wooden frames/boxes/doors/drawers/back and end panels',
  'aftermarket interior accessories entered separately; solid wood corbels/rosettes; non-wooden hardware; medicine cabinets meeting 5 criteria; products covered by Wooden Bedroom Furniture or Hardwood Plywood orders',
  '9403.40.9060, 9403.60.8081, 9403.90.7080',
  'order_in_place', '2020-04-21'::date, null,
  '[{"title": "Wooden Cabinets and Vanities and Components Thereof From the People''s Republic of China: Antidumping Duty Order", "url": "https://www.federalregister.gov/d/2020-08544", "date": "2020-04-21"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- C-570-107 CVD — Wooden Cabinets and Vanities (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'C-570-107', 'CVD', 'China', 'Wooden Cabinets and Vanities',
  null,
  'Same scope as the companion AD order A-570-106.',
  'Same as A-570-106',
  'Same as A-570-106',
  '9403.40.9060, 9403.60.8081, 9403.90.7080',
  'order_in_place', '2020-04-21'::date, null,
  '[{"title": "Wooden Cabinets and Vanities and Components Thereof From the People''s Republic of China: Countervailing Duty Order", "url": "https://www.federalregister.gov/d/2020-08546", "date": "2020-04-21"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-570-979 AD — Crystalline Silicon Photovoltaic Cells and Modules (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-979', 'AD', 'China', 'Crystalline Silicon Photovoltaic Cells and Modules',
  'The merchandise covered by this order is crystalline silicon photovoltaic cells, and modules, laminates, and panels, consisting of crystalline silicon photovoltaic cells, whether or not partially or fully assembled into other products, including, but not limited to, modules, laminates, panels and building integrated materials.',
  'Covers CSPV cells (20+ micrometers thick, with p/n junction) and modules/laminates/panels assembled from them. Third-country rule: modules produced in a third country from PRC-origin cells are covered; modules produced in the PRC from third-country cells are not.',
  'CSPV cells, modules, laminates, panels, building-integrated PV materials',
  'thin-film products (a-Si, CdTe, CIGS); cells <=10,000 mm2 permanently integrated into non-power-generation consumer goods; off-grid panel carve-outs',
  '8501.61.0000, 8507.20.80, 8541.40.6020, 8541.40.6030, 8501.31.8000',
  'order_in_place', '2012-12-07'::date, null,
  '[{"title": "Crystalline Silicon Photovoltaic Cells, Whether or Not Assembled Into Modules, From the People''s Republic of China: Amended Final Determination and Antidumping Duty Order", "url": "https://www.federalregister.gov/d/2012-29668", "date": "2012-12-07"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- C-570-980 CVD — Crystalline Silicon Photovoltaic Cells and Modules (China) [partial]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'C-570-980', 'CVD', 'China', 'Crystalline Silicon Photovoltaic Cells and Modules',
  null,
  'Same scope as the companion AD order A-570-979.',
  'Same as A-570-979',
  'Same as A-570-979',
  '8501.61.0000, 8507.20.80, 8541.40.6020, 8541.40.6030',
  'order_in_place', '2012-12-07'::date, null,
  null,
  '2026-10-02'::date, 'partial'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-555-003 AD — Crystalline Silicon Photovoltaic Cells and Modules (Cambodia) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-555-003', 'AD', 'Cambodia', 'Crystalline Silicon Photovoltaic Cells and Modules',
  null,
  '2024 petition wave: CSPV cells (20+ micrometers, p/n junction) and modules/laminates/panels. Third-country rule applies: modules produced in a third country from subject-country cells are covered; produced in a subject country from third-country cells are not. Cambodia/Thailand orders on ITC threat-of-injury basis.',
  'CSPV cells, modules, laminates, panels',
  'thin-film (a-Si, CdTe, CIGS); small cells integrated into consumer goods; off-grid portable panels; products covered by the 2012 China orders',
  '8541.42.0010, 8541.43.0010, 8501.71, 8501.72, 8501.80',
  'order_in_place', '2025-06-24'::date, null,
  '[{"title": "Crystalline Silicon Photovoltaic Cells, Whether or Not Assembled Into Modules, From Cambodia, Malaysia, Thailand, and Vietnam: Antidumping Duty Orders", "url": "https://www.federalregister.gov/d/2025-11588", "date": "2025-06-24"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-557-830 AD — Crystalline Silicon Photovoltaic Cells and Modules (Malaysia) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-557-830', 'AD', 'Malaysia', 'Crystalline Silicon Photovoltaic Cells and Modules',
  null,
  '2024 petition wave: CSPV cells (20+ micrometers, p/n junction) and modules/laminates/panels. Third-country rule applies: modules produced in a third country from subject-country cells are covered; produced in a subject country from third-country cells are not. Cambodia/Thailand orders on ITC threat-of-injury basis.',
  'CSPV cells, modules, laminates, panels',
  'thin-film (a-Si, CdTe, CIGS); small cells integrated into consumer goods; off-grid portable panels; products covered by the 2012 China orders',
  '8541.42.0010, 8541.43.0010, 8501.71, 8501.72, 8501.80',
  'order_in_place', '2025-06-24'::date, null,
  '[{"title": "Crystalline Silicon Photovoltaic Cells, Whether or Not Assembled Into Modules, From Cambodia, Malaysia, Thailand, and Vietnam: Antidumping Duty Orders", "url": "https://www.federalregister.gov/d/2025-11588", "date": "2025-06-24"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-549-851 AD — Crystalline Silicon Photovoltaic Cells and Modules (Thailand) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-549-851', 'AD', 'Thailand', 'Crystalline Silicon Photovoltaic Cells and Modules',
  null,
  '2024 petition wave: CSPV cells (20+ micrometers, p/n junction) and modules/laminates/panels. Third-country rule applies: modules produced in a third country from subject-country cells are covered; produced in a subject country from third-country cells are not. Cambodia/Thailand orders on ITC threat-of-injury basis.',
  'CSPV cells, modules, laminates, panels',
  'thin-film (a-Si, CdTe, CIGS); small cells integrated into consumer goods; off-grid portable panels; products covered by the 2012 China orders',
  '8541.42.0010, 8541.43.0010, 8501.71, 8501.72, 8501.80',
  'order_in_place', '2025-06-24'::date, null,
  '[{"title": "Crystalline Silicon Photovoltaic Cells, Whether or Not Assembled Into Modules, From Cambodia, Malaysia, Thailand, and Vietnam: Antidumping Duty Orders", "url": "https://www.federalregister.gov/d/2025-11588", "date": "2025-06-24"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-552-841 AD — Crystalline Silicon Photovoltaic Cells and Modules (Vietnam) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-552-841', 'AD', 'Vietnam', 'Crystalline Silicon Photovoltaic Cells and Modules',
  null,
  '2024 petition wave: CSPV cells (20+ micrometers, p/n junction) and modules/laminates/panels. Third-country rule applies: modules produced in a third country from subject-country cells are covered; produced in a subject country from third-country cells are not. Cambodia/Thailand orders on ITC threat-of-injury basis.',
  'CSPV cells, modules, laminates, panels',
  'thin-film (a-Si, CdTe, CIGS); small cells integrated into consumer goods; off-grid portable panels; products covered by the 2012 China orders',
  '8541.42.0010, 8541.43.0010, 8501.71, 8501.72, 8501.80',
  'order_in_place', '2025-06-24'::date, null,
  '[{"title": "Crystalline Silicon Photovoltaic Cells, Whether or Not Assembled Into Modules, From Cambodia, Malaysia, Thailand, and Vietnam: Antidumping Duty Orders", "url": "https://www.federalregister.gov/d/2025-11588", "date": "2025-06-24"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- C-555-004 CVD — Crystalline Silicon Photovoltaic Cells and Modules (Cambodia) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'C-555-004', 'CVD', 'Cambodia', 'Crystalline Silicon Photovoltaic Cells and Modules',
  null,
  'Same scope as the companion AD orders of the 2024 SE-Asia petition wave.',
  'Same as companion AD orders',
  'Same as companion AD orders',
  '8541.42.0010, 8541.43.0010',
  'order_in_place', '2025-06-24'::date, null,
  '[{"title": "Crystalline Silicon Photovoltaic Cells, Whether or Not Assembled Into Modules, From Cambodia, Malaysia, Thailand, and Vietnam: Countervailing Duty Orders", "url": "https://www.federalregister.gov/d/2025-11589", "date": "2025-06-24"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- C-557-831 CVD — Crystalline Silicon Photovoltaic Cells and Modules (Malaysia) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'C-557-831', 'CVD', 'Malaysia', 'Crystalline Silicon Photovoltaic Cells and Modules',
  null,
  'Same scope as the companion AD orders of the 2024 SE-Asia petition wave.',
  'Same as companion AD orders',
  'Same as companion AD orders',
  '8541.42.0010, 8541.43.0010',
  'order_in_place', '2025-06-24'::date, null,
  '[{"title": "Crystalline Silicon Photovoltaic Cells, Whether or Not Assembled Into Modules, From Cambodia, Malaysia, Thailand, and Vietnam: Countervailing Duty Orders", "url": "https://www.federalregister.gov/d/2025-11589", "date": "2025-06-24"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- C-549-852 CVD — Crystalline Silicon Photovoltaic Cells and Modules (Thailand) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'C-549-852', 'CVD', 'Thailand', 'Crystalline Silicon Photovoltaic Cells and Modules',
  null,
  'Same scope as the companion AD orders of the 2024 SE-Asia petition wave.',
  'Same as companion AD orders',
  'Same as companion AD orders',
  '8541.42.0010, 8541.43.0010',
  'order_in_place', '2025-06-24'::date, null,
  '[{"title": "Crystalline Silicon Photovoltaic Cells, Whether or Not Assembled Into Modules, From Cambodia, Malaysia, Thailand, and Vietnam: Countervailing Duty Orders", "url": "https://www.federalregister.gov/d/2025-11589", "date": "2025-06-24"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- C-552-842 CVD — Crystalline Silicon Photovoltaic Cells and Modules (Vietnam) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'C-552-842', 'CVD', 'Vietnam', 'Crystalline Silicon Photovoltaic Cells and Modules',
  null,
  'Same scope as the companion AD orders of the 2024 SE-Asia petition wave.',
  'Same as companion AD orders',
  'Same as companion AD orders',
  '8541.42.0010, 8541.43.0010',
  'order_in_place', '2025-06-24'::date, null,
  '[{"title": "Crystalline Silicon Photovoltaic Cells, Whether or Not Assembled Into Modules, From Cambodia, Malaysia, Thailand, and Vietnam: Countervailing Duty Orders", "url": "https://www.federalregister.gov/d/2025-11589", "date": "2025-06-24"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-570-016 AD — Passenger Vehicle and Light Truck Tires (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-016', 'AD', 'China', 'Passenger Vehicle and Light Truck Tires',
  'The scope of this order is passenger vehicle and light truck tires. Passenger vehicle and light truck tires are new pneumatic tires, of rubber, with a passenger vehicle or light truck size designation. Tires covered by this order may be tube-type, tubeless, radial, or non-radial, and they may be intended for sale to original equipment manufacturers or the replacement market.',
  'New pneumatic rubber tires with passenger/LT size designation bearing the DOT symbol; P/LT prefix or LT suffix tires covered regardless of intended use; covered with or without wheels (only the tire is subject).',
  'passenger car tires, light truck tires (P-metric, LT-metric), with or without wheels/rims',
  'racing tires (no DOT, ZR); sizes not in TRA pax/LT sections; used/retreaded tires; non-pneumatic/solid rubber tires; temporary T-type spares; ST trailer tires; off-road tires marked Not For Highway Service',
  '4011.10.10.10-4011.10.10.70, 4011.10.50.00, 4011.20.10.05, 4011.20.50.10',
  'order_in_place', '2015-08-10'::date, null,
  '[{"title": "Certain Passenger Vehicle and Light Truck Tires From China: Antidumping Duty Order; and Amended Final Affirmative CVD Determination and CVD Order", "url": "https://www.federalregister.gov/d/2015-19615", "date": "2015-08-10"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- C-570-017 CVD — Passenger Vehicle and Light Truck Tires (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'C-570-017', 'CVD', 'China', 'Passenger Vehicle and Light Truck Tires',
  null,
  'Same scope as the companion AD order A-570-016.',
  'Same as A-570-016',
  'Same as A-570-016',
  '4011.10.10.10-4011.10.10.70, 4011.10.50.00, 4011.20.10.05, 4011.20.50.10',
  'order_in_place', '2015-08-10'::date, null,
  '[{"title": "Certain Passenger Vehicle and Light Truck Tires From China: Antidumping Duty Order; and Amended Final Affirmative CVD Determination and CVD Order", "url": "https://www.federalregister.gov/d/2015-19615", "date": "2015-08-10"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-570-040 AD — Truck and Bus Tires (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-040', 'AD', 'China', 'Truck and Bus Tires',
  'The scope of the order covers truck and bus tires. Truck and bus tires are new pneumatic tires, of rubber, with a truck or bus size designation. Truck and bus tires covered by this order may be tube-type, tubeless, radial, or non-radial. All tires with a ''TR'' or ''HC'' suffix in their size designations are covered by this order regardless of their intended use.',
  'New pneumatic rubber tires with truck or bus size designation bearing the DOT symbol; TR/HC suffix tires covered regardless of intended use; covered whether or not mounted on wheels (only the tire is subject); third-country mounting covered.',
  'truck tires, bus tires, low-platform trailer tires (HC), tube-type/tubeless/radial/non-radial',
  'used/recycled/retreaded tires; non-pneumatic (solid rubber) tires; MH mobile-home tires; tires attached to a vehicle',
  '4011.20.1015, 4011.20.5020, 4011.69.0020, 4011.70.00',
  'order_in_place', '2019-02-15'::date, null,
  '[{"title": "Truck and Bus Tires From the People''s Republic of China: Antidumping Duty Order", "url": "https://www.govinfo.gov/content/pkg/FR-2019-02-15/html/2019-02656.htm", "date": "2019-02-15"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- C-570-041 CVD — Truck and Bus Tires (China) [partial]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'C-570-041', 'CVD', 'China', 'Truck and Bus Tires',
  null,
  'Same scope as the companion AD order A-570-040.',
  'Same as A-570-040',
  'Same as A-570-040',
  '4011.20.1015, 4011.20.5020',
  'order_in_place', '2019-02-15'::date, null,
  null,
  '2026-10-02'::date, 'partial'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-549-842 AD — Passenger Vehicle and Light Truck Tires (Thailand) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-549-842', 'AD', 'Thailand', 'Passenger Vehicle and Light Truck Tires',
  'The scope of these orders is passenger vehicle and light truck tires. Passenger vehicle and light truck tires are new pneumatic tires, of rubber, with a passenger vehicle or light truck size designation. Tires covered by these orders may be tube-type, tubeless, radial, or non-radial, and they may be intended for sale to original equipment manufacturers or the replacement market. All tires with a ''P'' or ''LT'' prefix, and all tires with an ''LT'' suffix in their sidewall markings are covered by these orders regardless of their intended use.',
  'Same scope structure as the China pax/LT tires order: new pneumatic rubber tires with pax/LT size designation and DOT symbol; P/LT prefix and LT suffix rules; TRA Year Book.',
  'passenger car tires, light truck tires from Thailand, with or without wheels/rims',
  'racing tires; used/retreaded; non-pneumatic; T-type and light-truck temporary spares; ST trailer tires; off-road Not For Highway Service tires; ATV/UTV tires',
  '4011.10.10.10-4011.10.10.70, 4011.10.50.00, 4011.20.10.05, 4011.20.50.10',
  'order_in_place', '2021-07-19'::date, null,
  '[{"title": "Passenger Vehicle and Light Truck Tires From Korea, Taiwan, and Thailand: Antidumping Duty Orders", "url": "https://www.govinfo.gov/content/pkg/FR-2021-07-19/html/2021-15270.htm", "date": "2021-07-19"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- C-552-829 CVD — Passenger Vehicle and Light Truck Tires (Vietnam) [partial]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'C-552-829', 'CVD', 'Vietnam', 'Passenger Vehicle and Light Truck Tires',
  null,
  'Same scope as the pax/LT tires orders. CVD ONLY — the concurrent Vietnam AD investigation was terminated after ITC negative injury (negligible imports); no AD order exists.',
  'Same scope as pax/LT tires orders',
  'AD duties do not apply — CVD only',
  '4011.10.10.10-4011.10.10.70, 4011.10.50.00, 4011.20.10.05, 4011.20.50.10',
  'order_in_place', '2021-07-19'::date, null,
  null,
  '2026-10-02'::date, 'partial'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-570-051 AD — Hardwood Plywood and Decorative Plywood (China) [partial]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-051', 'AD', 'China', 'Hardwood Plywood and Decorative Plywood',
  null,
  'Flat multilayered wood panels (hardwood/softwood/bamboo face or back veneer) — the 2018 orders, still in place. A separate NEW 2026 investigation (A-570-211) covers other plywood and explicitly carves out merchandise covered by these 2018 orders.',
  'hardwood plywood, decorative plywood, veneered panels',
  'extensive scope rulings (esp. 2-ply panels) — check per SKU',
  '4412 series',
  'order_in_place', '2018-01-04'::date, null,
  '[{"title": "Certain Hardwood Plywood Products From the People''s Republic of China: Antidumping Duty Order", "url": "https://www.federalregister.gov/d/2018-00001", "date": "2018-01-04"}]'::jsonb,
  '2026-10-02'::date, 'partial'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- C-570-052 CVD — Hardwood Plywood and Decorative Plywood (China) [partial]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'C-570-052', 'CVD', 'China', 'Hardwood Plywood and Decorative Plywood',
  null,
  'Same scope as the companion AD order A-570-051.',
  'Same as A-570-051',
  'Same as A-570-051',
  '4412 series',
  'order_in_place', '2018-01-04'::date, null,
  null,
  '2026-10-02'::date, 'partial'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-570-211 AD — Hardwood and Decorative Plywood (2026) (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-211', 'AD', 'China', 'Hardwood and Decorative Plywood (2026)',
  null,
  'NEW 2026 investigation (not a review of the 2018 orders): flat multilayered plywood/veneered panels with face or back veneer of hardwood/softwood/bamboo. Final affirmative determination 2026-07-21; ITC injury pending; no order yet.',
  'multilayered wood panels, veneered panels, hardwood/softwood/bamboo face or back',
  'plywood covered by the 2018 orders (83 FR 504/513); structural plywood (PS 1/PS 2); cork face/back; multilayered wood flooring orders; bamboo-face flooring; solid bamboo; phenolic film faced plyform; finished/RTA furniture; LVL door/window components',
  '4412 series',
  'investigation_ongoing', '2026-07-21'::date, null,
  '[{"title": "Hardwood and Decorative Plywood From the People''s Republic of China: Final Affirmative Determination of Sales at Less Than Fair Value", "url": "https://www.federalregister.gov/d/2026-14610", "date": "2026-07-21"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-570-860 AD — Steel Concrete Reinforcing Bar (China) [partial]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-860', 'AD', 'China', 'Steel Concrete Reinforcing Bar',
  'For purposes of this investigation, the product covered is all rebar sold in straight lengths, currently classifiable in the HTSUS under item number 7214.20.00 or any other tariff item number. Specifically excluded are plain rounds (i.e., non-deformed or smooth bars) and rebar that has been further processed through bending or coating. HTSUS subheadings are provided for convenience and Customs purposes. The written description of the scope of this proceeding is dispositive.',
  'All steel concrete reinforcing bars sold in straight lengths. AD only — no China CVD case. Original 2001 orders (66 FR 46777); continued through sunset reviews.',
  'deformed steel concrete reinforcing bars in straight lengths',
  'plain rounds (non-deformed/smooth bars); rebar further processed through bending or coating',
  '7214.20.00, 7228.30.8050, 7222.11.0050, 7222.30.0000, 7228.60.6000',
  'order_in_place', '2001-09-07'::date, null,
  '[{"title": "Steel Concrete Reinforcing Bars From China: Final Results of Expedited Third Sunset Reviews", "url": "https://www.govinfo.gov/content/pkg/FR-2018-10-05/html/2018-21731.htm", "date": "2018-10-05"}]'::jsonb,
  '2026-10-02'::date, 'partial'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-570-943 AD — Oil Country Tubular Goods (China) [partial]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-943', 'AD', 'China', 'Oil Country Tubular Goods',
  null,
  'Hollow steel OCTG including casing/tubing (carbon/alloy, seamless/welded, finished or unfinished) plus coupling stock. Order issued 2010-05-21 on ITC threat-of-injury basis.',
  'casing, tubing, coupling stock',
  'casing/tubing with >=10.5% chromium; drill pipe; unattached couplings; unattached thread protectors',
  '7304 series',
  'order_in_place', '2010-05-21'::date, null,
  '[{"title": "Oil Country Tubular Goods From the People''s Republic of China: Antidumping Duty Order", "url": "https://www.federalregister.gov/d/2010-12370", "date": "2010-05-21"}]'::jsonb,
  '2026-10-02'::date, 'partial'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-570-026 AD — Certain Corrosion-Resistant Steel Products (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-026', 'AD', 'China', 'Certain Corrosion-Resistant Steel Products',
  'The products covered by this order are certain flat-rolled steel products, either clad, plated, or coated with corrosion-resistant metals such as zinc, aluminum, or zinc-, aluminum-, nickel- or iron-based alloys, whether or not corrugated or painted, varnished, laminated, or coated with plastics or other non-metallic substances in addition to the metallic coating.',
  'Flat-rolled steel clad, plated, or coated with corrosion-resistant metals (zinc, aluminum, or zinc-/aluminum-/nickel-/iron-based alloys), in coils >=12.7mm width or straight lengths meeting thresholds; includes IF/HSLA/AHSS/UHSS steels and third-country further-processed merchandise. 2026 circumvention inquiries allege CORE completed in Thailand from Chinese components circumvents the orders.',
  'galvanized/galvannealed coils and sheet, IF steels, HSLA steels, AHSS, UHSS, third-country-processed CORE',
  'tin/lead/chromium-plated products, terne plate, tin-free steel; certain clad stainless flat-rolled products',
  '7210.30.0030, 7210.41.0000, 7210.49.0030, 7210.61.0000, 7210.69.0000, 7210.70.6030, 7212.30.1030',
  'order_in_place', '2016-07-25'::date, null,
  '[{"title": "Certain Corrosion-Resistant Steel Products From China: Initiation of Circumvention Inquiry on the AD/CVD Orders", "url": "https://www.govinfo.gov/content/pkg/FR-2026-07-06/html/2026-13607.htm", "date": "2026-07-06"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- C-570-027 CVD — Certain Corrosion-Resistant Steel Products (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'C-570-027', 'CVD', 'China', 'Certain Corrosion-Resistant Steel Products',
  null,
  'Same scope as the companion AD order A-570-026.',
  'Same as A-570-026',
  'Same as A-570-026',
  '7210.30.0030, 7210.41.0000, 7210.49.0030, 7210.61.0000',
  'order_in_place', '2016-07-25'::date, null,
  '[{"title": "Certain Corrosion-Resistant Steel Products From China: Countervailing Duty Order", "url": "https://www.govinfo.gov/content/pkg/FR-2016-07-25/html/2016-17563.htm", "date": "2016-07-25"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-570-909 AD — Certain Steel Nails (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-909', 'AD', 'China', 'Certain Steel Nails',
  'The merchandise covered by this proceeding includes certain steel nails having a shaft length up to 12 inches. Certain steel nails include, but are not limited to, nails made of round wire and nails that are cut. Certain steel nails may be of one piece construction or constructed of two or more pieces. Certain steel nails may be produced from any type of steel, and have a variety of finishes, heads, shanks, point types, shaft lengths and shaft diameters.',
  'Steel nails with shaft length up to 12 inches, of any steel type, round-wire or cut, one-piece or multi-piece, wide variety of finishes/heads/shanks/points; bulk or collated. AD only (no CVD case).',
  'common nails, brad/finish nails (within size bounds), collated nails, screw-threaded nails driven by direct force',
  'roofing nails (ASTM F 1667 Type I Style 20); corrugated nails; powder-actuated fasteners; thumb tacks; certain brads <=0.0720in shank; gas-actuated tool fasteners',
  '7317.00.55, 7317.00.65, 7317.00.75',
  'order_in_place', '2008-08-01'::date, null,
  '[{"title": "Notice of Antidumping Duty Order: Certain Steel Nails From the People''s Republic of China", "url": "https://www.govinfo.gov/content/pkg/FR-2008-08-01/html/E8-17714.htm", "date": "2008-08-01"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-570-029 AD — Certain Cold-Rolled Steel Flat Products (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-029', 'AD', 'China', 'Certain Cold-Rolled Steel Flat Products',
  'The products covered by this order are certain cold-rolled (cold-reduced), flat-rolled steel products, whether or not annealed, painted, varnished, or coated with plastics or other non-metallic substances. The products covered do not include those that are clad, plated, or coated with metal.',
  'Cold-reduced flat-rolled steel, whether or not annealed/painted/varnished/coated with non-metallic substances; NOT clad/plated/coated with metal; coils >=12.7mm width; includes IF/HSLA/motor lamination/AHSS/UHSS steels and third-country further-processed merchandise.',
  'cold-rolled coils and sheet, IF steels, HSLA steels, motor lamination steels, AHSS, UHSS',
  'ball bearing steels; tool steels; silico-manganese steel; GOES/NOES electrical steels; ultra-tempered automotive steel (PK grade)',
  '7209.15.0000, 7209.16.0030, 7209.18.1530, 7209.25.0000, 7211.23.1500',
  'order_in_place', '2016-07-14'::date, null,
  '[{"title": "Certain Cold-Rolled Steel Flat Products From Japan and China: Antidumping Duty Orders", "url": "https://www.govinfo.gov/content/pkg/FR-2016-07-14/html/2016-16798.htm", "date": "2016-07-14"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- C-570-030 CVD — Certain Cold-Rolled Steel Flat Products (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'C-570-030', 'CVD', 'China', 'Certain Cold-Rolled Steel Flat Products',
  null,
  'Same scope as the companion AD order A-570-029.',
  'Same as A-570-029',
  'Same as A-570-029',
  '7209.15.0000, 7209.16.0030, 7209.18.1530',
  'order_in_place', '2016-07-14'::date, null,
  '[{"title": "Certain Cold-Rolled Steel Flat Products From China: Countervailing Duty Order", "url": "https://www.govinfo.gov/content/pkg/FR-2016-07-14/html/2016-16794.htm", "date": "2016-07-14"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-570-219 AD — Van-Type Trailers and Subassemblies Thereof (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-219', 'AD', 'China', 'Van-Type Trailers and Subassemblies Thereof',
  null,
  'Van-type trailers (GVWR >26,000 lbs) and enumerated subassemblies thereof, including those imported through Canada under third-country case A-122-219 (only the Chinese subassembly portion + components on the same bill of lading are subject). Final affirmative determination 2026-08-31; ITC injury pending; no order yet.',
  'van-type trailers >26,000 lbs GVWR, enumerated subassemblies',
  'subassemblies covered by the chassis orders (A-570-135/C-570-136)',
  '8716.39.0040, 8716.39.0090, 8716.90.5060, 7308.30.5050, 8716.90.5010',
  'investigation_ongoing', '2026-08-31'::date, null,
  '[{"title": "Van-Type Trailers and Subassemblies Thereof From China: Final Affirmative Determination of Sales at Less Than Fair Value", "url": "https://www.federalregister.gov/d/2026-17750", "date": "2026-08-31"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- C-570-218 CVD — Van-Type Trailers and Subassemblies Thereof (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'C-570-218', 'CVD', 'China', 'Van-Type Trailers and Subassemblies Thereof',
  null,
  'Same scope as the companion AD investigation A-570-219. Third-country Canada CVD case C-122-218. Final affirmative determination 2026-08-31; ITC injury pending.',
  'Same as A-570-219',
  'Same as A-570-219',
  '8716.39.0040, 8716.39.0090, 8716.90.5060',
  'investigation_ongoing', '2026-08-31'::date, null,
  '[{"title": "Van-Type Trailers and Subassemblies Thereof From China: Final Affirmative Countervailing Duty Determination", "url": "https://www.govinfo.gov/content/pkg/FR-2026-08-31/html/2026-17749.htm", "date": "2026-08-31"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-570-135 AD — Certain Chassis and Subassemblies Thereof (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-135', 'AD', 'China', 'Certain Chassis and Subassemblies Thereof',
  'The merchandise covered by this order consists of chassis and subassemblies thereof, whether finished or unfinished, whether assembled or unassembled, whether coated or uncoated, regardless of the number of axles, for carriage of containers, or other payloads (including self-supporting payloads) for road, marine roll-on/roll-off (RORO) and/or rail transport.',
  'Chassis and subassemblies (finished/unfinished, assembled/unassembled, coated/uncoated, any axle count) for carriage of containers or other payloads for road/marine RORO/rail transport. Includes chassis frames, running gear/axle assemblies, landing gear, pintle hooks/B-trains; importation of any subassembly = unfinished chassis.',
  'chassis frames/sections, running gear/axle assemblies, landing gear assemblies, pintle hooks, B-trains, chassis entered with components for further assembly',
  'dry van trailers; refrigerated van trailers; flatbed (platform) trailers — the scope boundary with the van-type trailers case; individual components entered and sold by themselves',
  '8716.39.0090, 8716.90.5060, 8716.90.5010',
  'order_in_place', '2021-07-08'::date, null,
  '[{"title": "Certain Chassis and Subassemblies Thereof From China: Antidumping Duty Order", "url": "https://www.govinfo.gov/content/pkg/FR-2021-07-08/html/2021-14561.htm", "date": "2021-07-08"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- C-570-136 CVD — Certain Chassis and Subassemblies Thereof (China) [partial]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'C-570-136', 'CVD', 'China', 'Certain Chassis and Subassemblies Thereof',
  null,
  'Same scope as the companion AD order A-570-135.',
  'Same as A-570-135',
  'Same as A-570-135',
  '8716.39.0090, 8716.90.5060',
  'order_in_place', '2021-05-10'::date, null,
  null,
  '2026-10-02'::date, 'partial'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-570-601 AD — Tapered Roller Bearings and Parts Thereof (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-601', 'AD', 'China', 'Tapered Roller Bearings and Parts Thereof',
  'Imports covered by the Order are shipments of tapered roller bearings and parts thereof, finished and unfinished, from China; flange, take up cartridge, and hanger units incorporating tapered roller bearings; and tapered roller housings (except pillow blocks) incorporating tapered rollers, with or without spindles, whether or not for automotive use.',
  'Tapered roller bearings and parts thereof (finished and unfinished); flange, take-up cartridge, and hanger units incorporating tapered roller bearings; tapered roller housings (except pillow blocks) incorporating tapered rollers, with or without spindles, whether or not for automotive use.',
  'TRBs, TRB parts (cups, cones, rollers, cages), flange units, take-up cartridge units, hanger units, tapered roller housings (except pillow blocks)',
  'pillow blocks (tapered roller housings that are pillow blocks are carved out)',
  '8482.20.00, 8482.91.00.50, 8482.99.15, 8483.20.40, 8483.90.20',
  'order_in_place', '1987-06-15'::date, null,
  '[{"title": "Tapered Roller Bearings From China: Final Results of Antidumping Duty Administrative Review 2024-2025", "url": "https://www.govinfo.gov/content/pkg/FR-2026-09-21/html/2026-19262.htm", "date": "2026-09-21"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-570-836 AD — Glycine (China) [partial]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-836', 'AD', 'China', 'Glycine',
  null,
  'Glycine (aminoacetic acid) from China — AD order since 1995, continued through sunset reviews (fifth sunset final 2022-04-29; continued 2022-09-14).',
  'glycine (all grades)',
  null,
  '2922.49.4020',
  'order_in_place', '1995-03-29'::date, null,
  '[{"title": "Glycine From China: Final Results of the Expedited Sunset Review of the Antidumping Duty Order", "url": "https://www.govinfo.gov/content/pkg/FR-2022-04-29/html/2022-09242.htm", "date": "2022-04-29"}]'::jsonb,
  '2026-10-02'::date, 'partial'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-570-937 AD — Citric Acid and Certain Citrate Salts (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-937', 'AD', 'China', 'Citric Acid and Certain Citrate Salts',
  'The scope of this order includes all grades and granulation sizes of citric acid, sodium citrate, and potassium citrate in their unblended forms, whether dry or in solution, and regardless of packaging type. The scope also includes blends of citric acid, sodium citrate, and potassium citrate; as well as blends with other ingredients, such as sugar, where the unblended form(s) of citric acid, sodium citrate, and potassium citrate constitute 40 percent or more, by weight, of the blend.',
  'All grades and granulation sizes of citric acid, sodium citrate, and potassium citrate in unblended forms (dry or in solution, any packaging); blends where the unblended forms are >=40% by weight; all forms of crude calcium citrate (intermediate). Continued 2026-05-29 after third sunset review.',
  'citric acid (hydrous/anhydrous), sodium citrate, potassium citrate, crude calcium citrate',
  'calcium citrate meeting USP standards mixed with a functional excipient (dextrose, starch) at >=2% by weight',
  '2918.14.0000, 2918.15.1000, 2918.15.5000, 3824.90.9290',
  'order_in_place', '2009-05-29'::date, null,
  '[{"title": "Citric Acid and Certain Citrate Salts From China: Continuation of Antidumping and Countervailing Duty Orders", "url": "https://www.govinfo.gov/content/pkg/FR-2026-05-29/html/2026-10677.htm", "date": "2026-05-29"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- C-570-938 CVD — Citric Acid and Certain Citrate Salts (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'C-570-938', 'CVD', 'China', 'Citric Acid and Certain Citrate Salts',
  null,
  'Same scope as the companion AD order A-570-937.',
  'Same as A-570-937',
  'Same as A-570-937',
  '2918.14.0000, 2918.15.1000, 2918.15.5000',
  'order_in_place', '2009-05-29'::date, null,
  '[{"title": "Citric Acid and Certain Citrate Salts From China: Notice of Countervailing Duty Order", "url": "https://www.govinfo.gov/content/pkg/FR-2009-05-29/html/E9-12642.htm", "date": "2009-05-29"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-570-194 AD — Active Anode Material (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-194', 'AD', 'China', 'Active Anode Material',
  null,
  'Anode-grade graphite (natural or synthetic) with >=90% carbon content, particle size <=80 microns (powder), reversible capacity >=330 mAh/g, and >=80% graphitization — including when mixed into compounds, slurries, or electrodes (only the graphite portion is covered). Final affirmative determination 2026-02-17; ITC injury pending; no order yet.',
  'natural and synthetic anode-grade graphite powder, graphite in compounds/slurries/electrodes (graphite portion)',
  'material incorporated into lithium-ion battery products (cells, modules, packs), EVs, hybrids, cell phones, battery energy storage systems',
  '2504.10.5000, 3801.10.5010, 3801.10.5090',
  'investigation_ongoing', '2026-02-17'::date, null,
  '[{"title": "Active Anode Material From China: Final Affirmative Determination of Sales at Less Than Fair Value", "url": "https://www.federalregister.gov/d/2026-02998", "date": "2026-02-17"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- C-570-195 CVD — Active Anode Material (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'C-570-195', 'CVD', 'China', 'Active Anode Material',
  null,
  'Same scope as the companion AD investigation A-570-194. Final affirmative determination 2026-02-17; ITC injury pending.',
  'Same as A-570-194',
  'Same as A-570-194',
  '2504.10.5000, 3801.10.5010, 3801.10.5090',
  'investigation_ongoing', '2026-02-17'::date, null,
  '[{"title": "Active Anode Material From China: Final Affirmative Countervailing Duty Determination", "url": "https://www.federalregister.gov/d/2026-02999", "date": "2026-02-17"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-570-900 AD — Diamond Sawblades and Parts Thereof (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-900', 'AD', 'China', 'Diamond Sawblades and Parts Thereof',
  'The products covered by these orders are all finished circular sawblades, whether slotted or not, with a working part that is comprised of a diamond segment or segments, and parts thereof, regardless of specification or size, except as specifically excluded below. Within the scope of these orders are semifinished diamond sawblades, including diamond sawblade cores and diamond sawblade segments.',
  'All finished circular sawblades (slotted or not) with a working part of diamond segment(s), and parts thereof, regardless of specification or size; includes semifinished blades — cores (circular steel plates with slots) and segments. Third sunset final results 2026-07-06 — order continues. AD only for China.',
  'finished diamond circular sawblades; sawblade cores; sawblade segments',
  'sawblades with diamonds directly attached to the core with resin or electroplated bond (no segment); blades/cores <0.025in or >1.1in thick; circular steel plates with non-diamond cutting edge; cores with Rockwell C hardness <25; diamonds predominantly >240 mesh',
  '8202.39.00.00, 8206.00.00.00',
  'order_in_place', '2009-01-23'::date, null,
  '[{"title": "Diamond Sawblades From China: Final Results of the Expedited Third Sunset Review", "url": "https://www.govinfo.gov/content/pkg/FR-2026-07-06/html/2026-13573.htm", "date": "2026-07-06"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- A-570-033 AD — Large Residential Washers (China) [verified]
insert into public.ad_cvd_cases (case_number, case_type, country, product_name,
  scope_text_original, scope_summary, included_products, exclusions, hts_references,
  status, effective_date, commerce_source_url, federal_register_documents,
  last_verified_at, verification_status)
values (
  'A-570-033', 'AD', 'China', 'Large Residential Washers',
  'The products covered by this order are all large residential washers and certain parts thereof from the People''s Republic of China. For purposes of this order, the term ''large residential washers'' denotes all automatic clothes washing machines, regardless of the orientation of the rotational axis, with a cabinet width (measured from its widest point) of at least 24.5 inches (62.23 cm) and no more than 32.0 inches (81.28 cm), except as noted below.',
  'All automatic clothes washing machines (any rotational-axis orientation) with cabinet width 24.5-32.0 inches, plus certain parts: cabinets/portions, assembled tubs, assembled baskets, and combinations. AD only (no CVD case).',
  'top-load and front-load automatic washers 24.5-32.0in wide; washer cabinets, assembled tubs, assembled baskets, subassembly combinations',
  'stacked washer-dryers; commercial pay-per-use washers; top-load vertical-axis with PSC motor+belt+flat wrap spring clutch; front-load horizontal-axis with CIM+belt drive; front-load >28.5in cabinet width',
  '8450.20.0040, 8450.20.0080, 8450.11.0040, 8450.11.0080, 8450.90.2000',
  'order_in_place', '2017-02-06'::date, null,
  '[{"title": "Large Residential Washers From China: Amended Final Affirmative AD Determination and AD Order", "url": "https://www.govinfo.gov/content/pkg/FR-2017-02-06/html/2017-02469.htm", "date": "2017-02-06"}]'::jsonb,
  '2026-10-02'::date, 'verified'
)
on conflict (case_number) do update set
  scope_text_original = excluded.scope_text_original,
  scope_summary = excluded.scope_summary,
  included_products = excluded.included_products,
  exclusions = excluded.exclusions,
  hts_references = excluded.hts_references,
  status = excluded.status,
  effective_date = excluded.effective_date,
  federal_register_documents = excluded.federal_register_documents,
  last_verified_at = excluded.last_verified_at,
  verification_status = excluded.verification_status,
  updated_at = now();

-- ============================================================
-- Layer 1 corrections: case_type fixes from the 2026-10-02 verification
-- ============================================================

-- passenger vehicle tires | Vietnam: AD -> CVD
update public.ad_cvd_watch
  set case_type = 'CVD'
where product_keyword = 'passenger vehicle tires' and origin = 'Vietnam' and case_type = 'AD';

-- mattresses | China: AD -> AD/CVD
update public.ad_cvd_watch
  set case_type = 'AD/CVD'
where product_keyword = 'mattresses' and origin = 'China' and case_type = 'AD';

-- forged steel fittings | China: AD -> AD/CVD
update public.ad_cvd_watch
  set case_type = 'AD/CVD'
where product_keyword = 'forged steel fittings' and origin = 'China' and case_type = 'AD';

-- stainless steel flanges | China: AD -> AD/CVD
update public.ad_cvd_watch
  set case_type = 'AD/CVD'
where product_keyword = 'stainless steel flanges' and origin = 'China' and case_type = 'AD';

-- steel propane cylinders | China: AD -> AD/CVD
update public.ad_cvd_watch
  set case_type = 'AD/CVD'
where product_keyword = 'steel propane cylinders' and origin = 'China' and case_type = 'AD';

-- steel concrete reinforcing bar | China: AD/CVD -> AD
update public.ad_cvd_watch
  set case_type = 'AD'
where product_keyword = 'steel concrete reinforcing bar' and origin = 'China' and case_type = 'AD/CVD';

-- ============================================================
-- Layer 1 addition: 2026 hardwood plywood NEW investigation (A-570-211)
-- (not a review of the 2018 A-570-051/C-570-052 orders)
-- ============================================================
insert into public.ad_cvd_watch (product_keyword, hts_prefix, origin, case_type, status,
  note, case_numbers, scope_summary, exclusions, last_verified)
values (
  'hardwood plywood', '4412', 'China', 'AD/CVD', 'investigation_ongoing',
  'NEW 2026 investigation (A-570-211/C-570-212); final affirmative determination 2026-07-21; ITC injury pending. Explicitly carves out plywood covered by the 2018 orders.',
  'A-570-211 / C-570-212',
  'Flat multilayered plywood/veneered panels with hardwood/softwood/bamboo face or back veneer. New case — not a review of A-570-051/C-570-052.',
  'Plywood covered by the 2018 orders; structural plywood (PS 1/PS 2); cork face/back; wood flooring orders; solid bamboo; RTA/finished furniture',
  '2026-10-02'::date
)
on conflict (product_keyword, coalesce(hts_prefix, ''), origin, case_type) do update set
  status = excluded.status, note = excluded.note, case_numbers = excluded.case_numbers,
  scope_summary = excluded.scope_summary, exclusions = excluded.exclusions,
  last_verified = excluded.last_verified;

-- verify:
-- select case_type, count(*) from public.ad_cvd_cases group by case_type;
-- select status, count(*) from public.ad_cvd_cases group by status;
-- select product_keyword, origin, case_type, case_numbers from public.ad_cvd_watch where last_verified = '2026-10-02' order by product_keyword;
