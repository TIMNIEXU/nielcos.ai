-- ============================================================
-- nielcos.ai customs v25: Section 232 TIMBER / LUMBER headline
-- rules (additional_duties) — Proclamation 10976, heading
-- 9903.76.01, U.S. Note 37(b) to Chapter 99.
--
-- Why: the estimator had NO Section 232 data for wood at all —
-- the metals work (v19 headline rules, v23 hts_232_scope) never
-- covered PP 10976. For 4407.11.00.02 / China the estimator
-- showed 37.50% (List 3 25% + forced-labor 301 12.5%) against a
-- reference calculator's 35.00%: it missed the +10% lumber duty
-- AND charged the 12.5% FL blanket that 232-covered products are
-- excepted from (9903.05.90). Adding the '232' prefix rules below
-- fixes both at once — once a 232 rate line resolves, the matcher
-- (lib/additionalDuties.ts step 2) flips the FL blanket into the
-- $0 9903.05.90 exclusion line automatically. No code change.
--
-- Scope of this file: ONLY the softwood timber & lumber basket
-- (9903.76.01, flat 10%, ALL origins, effective 2025-10-14).
-- The derivative baskets are deliberately NOT modeled here:
-- upholstered wooden furniture (9903.76.02, 25%) and kitchen
-- cabinets / vanities (9903.76.03, 25%) exclude the UK / EU /
-- Japan, which instead take 9903.76.20 (10%) / .22 (15%) /
-- .21 (15%) — origin tiers the per-type headline-rule contest
-- cannot express safely. Separate follow-up if wanted.
--
-- Covered HTS lines are exactly the CBP guidance list for
-- 9903.76.01 (CSMS guidance on PP 10976, 90 FR 48127). Note the
-- 4403 lines are 10-digit statistical lines: only the .01 suffix
-- is covered, so the rules sit at 10 digits there; the 4406/4407
-- lines are covered at the full 8-digit subheading.
--
-- Run in the Supabase SQL editor, after customs_v24_p2.sql.
-- Re-runnable: inserts are guarded by NOT EXISTS.
-- ============================================================

insert into additional_duties
  (duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
select v.duty_type, v.hts_prefix, v.origin_country, v.rate, v.basis,
       v.effective_from::date, v.source, v.note
from (values
  ('232','44031100','',10,'full_value','2025-10-14','Proclamation 10976 (90 FR 48127)','Section 232 softwood timber and lumber (9903.76.01), U.S. Note 37(b) — 10% on full entered value, all origins'),
  ('232','44032101','',10,'full_value','2025-10-14','Proclamation 10976 (90 FR 48127)','Section 232 softwood timber and lumber (9903.76.01), U.S. Note 37(b) — 10% on full entered value, all origins'),
  ('232','44032201','',10,'full_value','2025-10-14','Proclamation 10976 (90 FR 48127)','Section 232 softwood timber and lumber (9903.76.01), U.S. Note 37(b) — 10% on full entered value, all origins'),
  ('232','44032301','',10,'full_value','2025-10-14','Proclamation 10976 (90 FR 48127)','Section 232 softwood timber and lumber (9903.76.01), U.S. Note 37(b) — 10% on full entered value, all origins'),
  ('232','44032401','',10,'full_value','2025-10-14','Proclamation 10976 (90 FR 48127)','Section 232 softwood timber and lumber (9903.76.01), U.S. Note 37(b) — 10% on full entered value, all origins'),
  ('232','44032501','',10,'full_value','2025-10-14','Proclamation 10976 (90 FR 48127)','Section 232 softwood timber and lumber (9903.76.01), U.S. Note 37(b) — 10% on full entered value, all origins'),
  ('232','44032601','',10,'full_value','2025-10-14','Proclamation 10976 (90 FR 48127)','Section 232 softwood timber and lumber (9903.76.01), U.S. Note 37(b) — 10% on full entered value, all origins'),
  ('232','44039901','',10,'full_value','2025-10-14','Proclamation 10976 (90 FR 48127)','Section 232 softwood timber and lumber (9903.76.01), U.S. Note 37(b) — 10% on full entered value, all origins'),
  ('232','44061100','',10,'full_value','2025-10-14','Proclamation 10976 (90 FR 48127)','Section 232 softwood timber and lumber (9903.76.01), U.S. Note 37(b) — 10% on full entered value, all origins'),
  ('232','44069100','',10,'full_value','2025-10-14','Proclamation 10976 (90 FR 48127)','Section 232 softwood timber and lumber (9903.76.01), U.S. Note 37(b) — 10% on full entered value, all origins'),
  ('232','44071100','',10,'full_value','2025-10-14','Proclamation 10976 (90 FR 48127)','Section 232 softwood timber and lumber (9903.76.01), U.S. Note 37(b) — 10% on full entered value, all origins'),
  ('232','44071200','',10,'full_value','2025-10-14','Proclamation 10976 (90 FR 48127)','Section 232 softwood timber and lumber (9903.76.01), U.S. Note 37(b) — 10% on full entered value, all origins'),
  ('232','44071300','',10,'full_value','2025-10-14','Proclamation 10976 (90 FR 48127)','Section 232 softwood timber and lumber (9903.76.01), U.S. Note 37(b) — 10% on full entered value, all origins'),
  ('232','44071400','',10,'full_value','2025-10-14','Proclamation 10976 (90 FR 48127)','Section 232 softwood timber and lumber (9903.76.01), U.S. Note 37(b) — 10% on full entered value, all origins'),
  ('232','44071900','',10,'full_value','2025-10-14','Proclamation 10976 (90 FR 48127)','Section 232 softwood timber and lumber (9903.76.01), U.S. Note 37(b) — 10% on full entered value, all origins')
) as v(duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
where not exists (
  select 1 from additional_duties d
  where d.duty_type = v.duty_type
    and d.hts_prefix = v.hts_prefix
    and d.origin_country = v.origin_country
);

-- Verification (expected: 15 rows, all rate 10, effective 2025-10-14):
--   select count(*) from additional_duties
--   where duty_type = '232' and note like '%9903.76.01%';
-- After running, the estimator / duty-lookup for 4407.11.00.02,
-- origin China must show: 232 10% + 301-CN 25% + 301-FL-EXCL 0%
-- (9903.05.90) = 35.00% total additional duty.
