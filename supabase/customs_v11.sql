-- ============================================================
-- nielcos.ai customs v11: Section 301 2024 four-year review —
-- semiconductors 25% -> 50% (2026-10-02).
--
-- USTR four-year review of the China Section 301 action (proposed
-- May 2024, final action Sept 2024): semiconductors from China
-- increased from 25% to 50%, effective 2025-01-01. Implemented in
-- the 9903.91 provisions (trade tools label it "Section 301 '24
-- Semi Conductors").
--
-- Modeling: heading-level rules on 8541 + 8542 for CHINA at 50%.
-- This REPLACES the classic 25% List 3 rate — it is not additive.
-- lib/additionalDuties.ts was updated in the same change so that,
-- within one duty_type, a later effective_from supersedes an
-- earlier matching rule (longest-prefix still breaks ties and still
-- decides across different duty types).
--
-- Run AFTER customs_v10.sql in the Supabase SQL editor.
-- Re-runnable: every INSERT is guarded by NOT EXISTS.
-- ============================================================

-- VERIFY (before)
select duty_type, hts_prefix, origin_country, rate, effective_from
from additional_duties
where duty_type = '301-CN' and hts_prefix in ('8541', '8542');

insert into additional_duties
  (duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
select v.duty_type, v.hts_prefix, v.origin_country, v.rate, v.basis,
       v.effective_from::date, v.source, v.note
from (values
  ('301-CN', '8541', 'CHINA', 50, 'full_value', '2025-01-01',
   'USTR Section 301 four-year review modification (final action Sept 2024)',
   'Section 301 2024 review: semiconductors (headings 8541/8542) from China 50% since 2025-01-01 (9903.91.02). Replaces the classic 25% List 3 rate — not additive. Product exclusions not modeled; verify before filing.'),
  ('301-CN', '8542', 'CHINA', 50, 'full_value', '2025-01-01',
   'USTR Section 301 four-year review modification (final action Sept 2024)',
   'Section 301 2024 review: semiconductors (headings 8541/8542) from China 50% since 2025-01-01 (9903.91.02). Replaces the classic 25% List 3 rate — not additive. Product exclusions not modeled; verify before filing.')
) as v(duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
where not exists (
  select 1 from additional_duties d
  where d.duty_type = v.duty_type
    and d.hts_prefix = v.hts_prefix
    and d.origin_country = v.origin_country
);

-- VERIFY (after)
select duty_type, hts_prefix, origin_country, rate, effective_from
from additional_duties
where duty_type = '301-CN' and hts_prefix in ('8541', '8542');
