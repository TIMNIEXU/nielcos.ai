-- ============================================================
-- nielcos.ai customs v9: classic Section 301 List 3 on paper labels
-- (2026-09-30).
--
-- A live estimate for 4821.10.40.00 / China / $10,000 ocean came out at
-- 12.50% (MFN Free + 301-FL 12.5%) while Flexport Tariff Simulator shows
-- 37.50% — the missing 25% is classic Section 301 List 3 (9903.88.03).
-- Root cause: no 301-CN rule existed for 4821.10.40 at all, so the
-- engine silently under-reported.
--
-- Evidence: Flexport Tariff Simulator applies 9903.88.03 at 25% to
-- 4821.10.40.00. Rule is 10-digit exact per the v7 principle (only the
-- .00.00 suffix is confirmed); our USITC 2026 Rev 19 library carries no
-- statistical subdivisions under 4821.10.40, so the 10-digit rule covers
-- the subheading in practice.
-- List 3 (Tranche 3) went to 25% on 2019-05-10 (84 FR 20459).
--
-- Run AFTER customs_v8.sql in the Supabase SQL editor, once.
-- Re-runnable: guarded by NOT EXISTS.
-- ============================================================

-- VERIFY (before): expect no 301-CN rule for 4821*
select duty_type, hts_prefix, origin_country, rate
from additional_duties
where duty_type = '301-CN' and hts_prefix like '4821%'
order by hts_prefix;

-- Paper/paperboard labels 4821.10.40.00 — List 3 25% (9903.88.03)
insert into additional_duties
  (duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
select '301-CN','4821104000','CHINA',25,'full_value','2019-05-10',
  'Flexport Tariff Simulator cross-check (4821.10.40.00); USTR Section 301 List 3 / Tranche 3 (9903.88.03), 25% since 2019-05-10 per 84 FR 20459',
  'Paper and paperboard labels 4821.10.40.00 — List 3 25% (9903.88.03). 10-digit exact; no statistical subdivisions under 4821.10.40 in USITC 2026 Rev 19.'
where not exists (
  select 1 from additional_duties
  where duty_type = '301-CN' and hts_prefix = '4821104000' and origin_country = 'CHINA'
);

-- VERIFY (after): expect the new row below
select duty_type, hts_prefix, origin_country, rate, effective_from
from additional_duties
where duty_type = '301-CN' and hts_prefix like '4821%'
order by hts_prefix;
