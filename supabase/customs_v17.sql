-- ============================================================
-- nielcos.ai customs v17: Section 232 medium/heavy-duty trucks +
-- Section 301 List 1 for 8704.23.01.00 — 2026-10-03.
--
-- What was wrong: our estimate for 8704.23.01.00/China showed 37.50%
--   (25% MFN + 12.5% 301-FL)
-- while the reference shows 75.00%
--   (25% MFN + 25% 232 MHDV 9903.74.01 + 25% 301 List 1 9903.88.01,
--    FL $0 via 9903.05.90).
--
-- Root causes:
--   1) Missing Section 232 medium/heavy-duty trucks rule: 25% on
--      medium- and heavy-duty trucks and parts, proclaimed 2025-10-17,
--      effective 2025-11-01 (HTSUS subchapter 9903.74, U.S. Note 38).
--      8704.23.01.00 = diesel goods vehicles, G.V.W. > 20 metric tons
--      → heavy-duty → 9903.74.01 at 25%.
--   2) Missing Section 301 List 1 (Tranche 1) row for this HTS:
--      25% (9903.88.01), effective 2018-07-06.
--
-- Once a 232 rule matches, lib/additionalDuties.ts already converts the
-- blanket 301-FL into a $0 9903.05.90 exclusion line — no code change.
-- Per Clark Hill / GHY / CRS: 232-truck goods are NOT subject to
-- overlapping 232 tariffs on automobiles/auto parts — our rules are
-- HTS-scoped so no double-application. USMCA non-U.S.-content offsets
-- are not modeled; verify before filing.
--
-- Run in the Supabase SQL editor. Re-runnable: guarded by NOT EXISTS.
-- ============================================================

-- VERIFY (before)
select duty_type, hts_prefix, origin_country, rate, effective_from
from additional_duties
where hts_prefix = '8704230100';

insert into additional_duties
  (duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
select v.duty_type, v.hts_prefix, v.origin_country, v.rate, v.basis,
       v.effective_from::date, v.source, v.note
from (values
  ('232', '8704230100', '', 25, 'full_value', '2025-11-01',
   'Section 232 medium- and heavy-duty trucks proclamation (2025-10-17)',
   'Section 232 medium/heavy-duty vehicles: diesel goods vehicles G.V.W. > 20t (8704.23.01.00) 25% since 2025-11-01 (9903.74.01). USMCA non-U.S.-content offsets not modeled; verify scope before filing.'),
  ('301-CN', '8704230100', 'CHINA', 25, 'full_value', '2018-07-06',
   'Section 301 List 1 (Tranche 1)',
   'Classic Section 301 List 1 (Tranche 1) 25% (9903.88.01).')
) as v(duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
where not exists (
  select 1 from additional_duties d
  where d.duty_type = v.duty_type
    and d.hts_prefix = v.hts_prefix
    and d.origin_country = v.origin_country
);

-- VERIFY (after): expect two rows — 232 25% (2025-11-01), 301-CN 25% (2018-07-06)
select duty_type, hts_prefix, origin_country, rate, effective_from
from additional_duties
where hts_prefix = '8704230100';
