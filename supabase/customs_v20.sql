-- ============================================================
-- nielcos.ai customs v20: 7202.80.00.00 (ferrotungsten) corrections —
-- 2026-10-03.
--
-- What was wrong: our estimate for 7202.80.00.00/China showed 43.10%
--   (5.6% MFN + 25% 301 9903.91.01 + 12.5% 301-FL 9903.05.31)
-- while the reference shows 30.60%
--   (5.6% MFN + 25% 301 List 3 9903.88.03 + FL $0 via 9903.05.86).
-- (The 232 50% from the old chapter-72 blanket is already gone via v19.)
--
-- Fix 1 — 301: ferrotungsten is on classic List 3 (25%, 9903.88.03,
-- in customs_v10) but the v12 chapter-72 blanket for the 2024
-- steel/aluminum increase (9903.91.01, 2024-09-27) was superseding it.
-- The 2024 Annex A list names only specific ferroalloys (ferronickel,
-- ferroniobium) — not ferrotungsten. Add an explicit correction rule:
-- same effective date as the v12 blanket, longer prefix, so it wins
-- the per-type contest and restores the List 3 rate with the right
-- provision in the note.
--
-- Fix 2 — 301-FL: ferrotungsten is excluded from the Section 301
-- forced-labor duty under U.S. Note 52(b) (9903.05.86; critical
-- mineral inputs). Add a [NOT SUBJECT] carve-out for 301-FL.
-- lib/additionalDuties.ts suppresses the carve-out from display and
-- renders the blanket FL as a $0 9903.05.86 exclusion line instead
-- of charging 12.5%.
--
-- Run in the Supabase SQL editor. Re-runnable: guarded by NOT EXISTS.
-- ============================================================

insert into additional_duties
  (duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
select v.duty_type, v.hts_prefix, v.origin_country, v.rate, v.basis,
       v.effective_from::date, v.source, v.note
from (values
  ('301-CN','72028000','CHINA',25,'full_value','2024-09-27',
   'Classic Section 301 List 3 (Tranche 3)',
   'Classic Section 301 List 3 (Tranche 3) 25% (9903.88.03). Confirmed: ferrotungsten was not raised by the 2024 steel/aluminum review (9903.91.01); the v12 chapter-72 blanket does not apply. Correction rule — wins over the blanket by longer prefix. Verified against reference 2026-10-03.'),
  ('301-FL','72028000','CHINA',0,'full_value','2026-07-24',
   'Section 301 forced-labor action — U.S. Note 52(b) exclusion (9903.05.86)',
   '[NOT SUBJECT] Ferrotungsten (7202.80.00) is excluded from the Section 301 forced-labor duty under U.S. Note 52(b) (9903.05.86); critical mineral inputs. Carve-out vs the blanket 301-FL rule. Verified against reference 2026-10-03.')
) as v(duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
where not exists (
  select 1 from additional_duties d
  where d.duty_type = v.duty_type
    and d.hts_prefix = v.hts_prefix
    and d.origin_country = v.origin_country
);

-- VERIFY (after): expect two rows — 301-CN 25% and 301-FL 0% for 72028000
select duty_type, hts_prefix, origin_country, rate, effective_from
from additional_duties
where hts_prefix = '72028000'
order by duty_type;
