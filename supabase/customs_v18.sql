-- ============================================================
-- nielcos.ai customs v18: Section 232 auto parts — extend coverage to
-- 8706.00.03.00 (chassis fitted with engines) — 2026-10-03.
--
-- What was wrong: our estimate for 8706.00.03.00/China showed 41.50%
--   (4% MFN + 25% List 3 9903.88.03 + 12.5% 301-FL)
-- while the reference shows 54.00%
--   (4% + 25% 9903.88.03 + 25% 9903.94.05, FL $0 via 9903.05.90).
--
-- Change: one 232 auto-parts rule for 8706.00.03.00 at 25% (9903.94.05).
-- Once a 232 rule matches, lib/additionalDuties.ts already converts the
-- blanket 301-FL into a $0 9903.05.90 exclusion line — no code change.
-- (The reference also prints informational $0 9903.74.05 / 9903.74.11
-- MHDV exclusion lines; they do not change the total and are omitted.)
--
-- Coverage is added per verified case (v15: 8507.60.00.10, v16: 8708.93.60.00).
-- Verify the 232 auto-parts annex scope before filing.
--
-- Run in the Supabase SQL editor. Re-runnable: guarded by NOT EXISTS.
-- ============================================================

-- VERIFY (before)
select duty_type, hts_prefix, origin_country, rate, effective_from
from additional_duties
where hts_prefix = '8706000300';

insert into additional_duties
  (duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
select v.duty_type, v.hts_prefix, v.origin_country, v.rate, v.basis,
       v.effective_from::date, v.source, v.note
from (values
  ('232', '8706000300', '', 25, 'full_value', '2025-05-03',
   'Section 232 automobiles and auto parts proclamation',
   'Section 232 auto parts: chassis fitted with engines (8706.00.03.00) 25% since 2025-05-03 (9903.94.05). USMCA content offsets not modeled; verify annex scope before filing.')
) as v(duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
where not exists (
  select 1 from additional_duties d
  where d.duty_type = v.duty_type
    and d.hts_prefix = v.hts_prefix
    and d.origin_country = v.origin_country
);

-- VERIFY (after): expect one row — 232 25% (2025-05-03)
select duty_type, hts_prefix, origin_country, rate, effective_from
from additional_duties
where hts_prefix = '8706000300';
