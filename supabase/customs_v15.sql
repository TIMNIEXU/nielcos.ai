-- ============================================================
-- nielcos.ai customs v15: 8507.60.00.10 lithium-ion EV batteries —
-- match reference trade tool (2026-10-03).
--
-- What was wrong: our estimate showed 23.40%
--   (3.4% MFN + 7.5% List 4A 9903.88.15 + 12.5% 301-FL)
-- while the reference shows 53.40%
--   (3.4% MFN + 25% 9903.91.06 + 25% 9903.94.05, FL $0 via 9903.05.90).
--
-- Changes:
-- 1) Section 301 2024 four-year review: lithium-ion EV batteries
--    (8507.60.00.10) from China 25% (9903.91.06). The matcher's
--    later-effective_from rule supersedes the 7.5% List 4A rate —
--    not additive (same pattern as v11 semiconductors).
-- 2) Section 232 auto parts: 8507.60.00.10 at 25% (9903.94.05).
--    Once a 232 rule matches, lib/additionalDuties.ts already converts
--    the blanket 301-FL into a $0 9903.05.90 exclusion line —
--    no code change needed.
--
-- Provision mapping follows the reference trade tool; verify the
-- U.S. note 31 subdivision scope before filing. USMCA content
-- offsets for 232 auto parts are not modeled.
--
-- Run AFTER customs_v14.sql in the Supabase SQL editor.
-- Re-runnable: every INSERT is guarded by NOT EXISTS.
-- ============================================================

-- VERIFY (before)
select duty_type, hts_prefix, origin_country, rate, effective_from
from additional_duties
where hts_prefix = '8507600010';

insert into additional_duties
  (duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
select v.duty_type, v.hts_prefix, v.origin_country, v.rate, v.basis,
       v.effective_from::date, v.source, v.note
from (values
  ('301-CN', '8507600010', 'CHINA', 25, 'full_value', '2024-09-27',
   'USTR Section 301 four-year review (final action Sept 2024)',
   'Section 301 ''24 Expanded List 2: lithium-ion EV batteries (8507.60.00.10) from China 25% since 2024-09-27 (9903.91.06). Replaces the 7.5% List 4A rate — not additive. Product exclusions not modeled; verify before filing.'),
  ('232', '8507600010', '', 25, 'full_value', '2025-05-03',
   'Section 232 automobiles and auto parts proclamation',
   'Section 232 auto parts: lithium-ion EV batteries for vehicles (8507.60.00.10) 25% since 2025-05-03 (9903.94.05). USMCA content offsets not modeled; verify scope before filing.')
) as v(duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
where not exists (
  select 1 from additional_duties d
  where d.duty_type = v.duty_type
    and d.hts_prefix = v.hts_prefix
    and d.origin_country = v.origin_country
);

-- VERIFY (after): expect two rows — 301-CN 25% (2024-09-27), 232 25% (2025-05-03)
select duty_type, hts_prefix, origin_country, rate, effective_from
from additional_duties
where hts_prefix = '8507600010'
order by duty_type;
