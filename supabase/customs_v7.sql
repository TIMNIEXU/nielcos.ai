-- ============================================================
-- nielcos.ai customs v7: classic Section 301 China tariffs — precise
-- 10-digit rules (replaces the over-broad v6 rule).
--
-- v6 seeded ('301-CN','950691','CHINA',7.5), which wrongly applied List 4A
-- 7.5% to EVERY 9506.91 subheading. CBP ruling NY N321348 only confirms
-- 10-digit 9506.91.0010 at 7.5% (List 4A, 9903.88.15); the same ruling puts
-- 7318.29.0000 at 25% (List 3, 9903.88.03). Other subheadings may sit on
-- different lists — so rules are now 10-digit exact, and the engine warns
-- (instead of guessing) when only an 8-digit code is given.
--
-- Full Lists 1-4A -> HTS mapping is still a separate data project; until a
-- product has a 301-CN rule the engine keeps the "verify list membership"
-- warning so China-origin estimates are never silently understated.
--
-- Run AFTER customs_v6.sql in the Supabase SQL editor, once.
-- Re-runnable: the inserts are guarded by NOT EXISTS.
-- ============================================================

-- VERIFY (before): the over-broad rule this script replaces
select duty_type, hts_prefix, origin_country, rate, source
from additional_duties
where duty_type = '301-CN'
order by hts_prefix;

-- 1) Remove the over-broad 6-digit rule
delete from additional_duties
where duty_type = '301-CN'
  and hts_prefix = '950691'
  and origin_country = 'CHINA';

-- 2) Precise 10-digit rules, verified from CBP ruling NY N321348
insert into additional_duties
  (duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
select '301-CN','9506910010','CHINA',7.5,'full_value','2020-02-14',
  'CBP ruling NY N321348; USTR Section 301 List 4A (9903.88.15)',
  'Printed paper labels 9506.91.0010 — List 4A 7.5% (cut from 15% on 2020-02-14). Other 9506.91 subheadings may differ — always use the 10-digit HTS.'
where not exists (
  select 1 from additional_duties
  where duty_type = '301-CN' and hts_prefix = '9506910010' and origin_country = 'CHINA'
);

insert into additional_duties
  (duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
select '301-CN','7318290000','CHINA',25,'full_value','2018-09-24',
  'CBP ruling NY N321348; USTR Section 301 List 3 (9903.88.03)',
  'Iron/steel screws, bolts and similar fasteners 7318.29.0000 — List 3 25%.'
where not exists (
  select 1 from additional_duties
  where duty_type = '301-CN' and hts_prefix = '7318290000' and origin_country = 'CHINA'
);

-- VERIFY (after): expect exactly the two 10-digit rules below
select duty_type, hts_prefix, origin_country, rate, effective_from, source
from additional_duties
where duty_type = '301-CN'
order by hts_prefix;
