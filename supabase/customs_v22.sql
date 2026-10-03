-- ============================================================
-- nielcos.ai customs v22: 301-FL Note 52(b) carve-out for
-- 7202.93.40.00 (ferroniobium) — 2026-10-03.
--
-- What was wrong: our estimate for 7202.93.40.00/China showed 42.50%
--   (5% MFN + 25% 301 9903.91.01 + 12.5% 301-FL 9903.05.31)
-- while the reference shows 30.00%
--   (5% + 25% 9903.91.01 + FL $0 via 9903.05.86).
--
-- The 9903.91.01 25% is CORRECT here (ferroniobium was named in the
-- 2024 steel/aluminum/critical-minerals increase) — only the FL line
-- needs fixing: ferroniobium is excluded from the Section 301
-- forced-labor duty under U.S. Note 52(b) (9903.05.86; critical
-- mineral inputs). Same carve-out mechanism as v20 (7202.80):
-- lib/additionalDuties.ts renders the blanket FL as a $0 9903.05.86
-- exclusion line instead of charging 12.5%. No code change in this
-- migration.
--
-- Run in the Supabase SQL editor. Re-runnable: guarded by NOT EXISTS.
-- ============================================================

insert into additional_duties
  (duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
select v.duty_type, v.hts_prefix, v.origin_country, v.rate, v.basis,
       v.effective_from::date, v.source, v.note
from (values
  ('301-FL','7202934000','CHINA',0,'full_value','2026-07-24',
   'Section 301 forced-labor action — U.S. Note 52(b) exclusion (9903.05.86)',
   '[NOT SUBJECT] Ferroniobium (7202.93.40) is excluded from the Section 301 forced-labor duty under U.S. Note 52(b) (9903.05.86); critical mineral inputs. Carve-out vs the blanket 301-FL rule. Verified against reference 2026-10-03.')
) as v(duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
where not exists (
  select 1 from additional_duties d
  where d.duty_type = v.duty_type
    and d.hts_prefix = v.hts_prefix
    and d.origin_country = v.origin_country
);

-- VERIFY (after): expect one row — 301-FL 0% for 7202934000
select duty_type, hts_prefix, origin_country, rate, effective_from
from additional_duties
where hts_prefix = '7202934000';
