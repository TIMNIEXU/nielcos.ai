-- ============================================================
-- nielcos.ai customs v6: classic Section 301 China tariffs (List 4A)
-- 2018-2019 actions, still in effect. Lists 1/2/3 = 25% (9903.88.01/.02/.03),
-- List 4A = 7.5% (9903.88.15). Full list->HTS mapping is a separate data
-- project; this seeds VERIFIED rules only. Until a product has a 301-CN
-- rule, the engine emits a warning instead of silently under-reporting.
-- Run AFTER customs_v5.sql in the Supabase SQL editor.
-- ============================================================

insert into additional_duties
  (duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
values
  ('301-CN','950691','CHINA',7.5,'full_value','2019-09-01','CBP ruling NY N321348',
   'Section 301 List 4A (9903.88.15). 10-digit 9506.91.0010 confirmed — verify your 10-digit is covered')
on conflict do nothing;
