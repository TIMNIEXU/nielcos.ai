-- ============================================================
-- nielcos.ai customs v19: fix over-broad chapter-72 blanket rules —
-- 7202.70.00.00 (ferromolybdenum) — 2026-10-03.
--
-- What was wrong: our estimate for 7202.70.00.00/China showed 79.50%
--   (4.5% MFN + 50% 232 + 25% 301 9903.91.01, FL $0)
-- while the reference shows 17.00%
--   (4.5% MFN + 12.5% 301-FL 9903.05.31, no 232, no other 301).
--
-- Root causes — two blanket rules used the whole chapter as prefix:
--   1) customs_v3.sql: ('232','72','',50) — but the 232 steel article
--      list (Annex I-A) covers headings 7206-7229 only; 7201-7205
--      (pig iron, ferroalloys, granules, waste) are NOT covered.
--      Replaced below with the 24 verified 4-digit headings.
--   2) customs_v12.sql: ('301-CN','72','CHINA',25,'2024-09-27') for the
--      2024 steel/aluminum increase (9903.91.01). The USTR Annex A list
--      is HTS-specific; ferromolybdenum (7202.70) is not on it (only
--      named ferroalloys such as ferronickel 7202.60 / ferroniobium
--      7202.93 are). Added a carve-out rule for 7202.70.00.00: same
--      effective date, longer prefix, rate 0, note marked [NOT SUBJECT].
--      lib/additionalDuties.ts lets the carve-out win the per-type
--      contest (longest prefix on tie) and then suppresses it from
--      display — no phantom $0 line, and the "may be understated"
--      warning stays quiet for this verified HTS.
--
-- After the fix 7202.70 matches no 232 rule, so the blanket 301-FL
-- (9903.05.31, 12.5%) is charged again — matching the reference.
-- 7224 steel and other covered headings are unaffected.
--
-- Run in the Supabase SQL editor. Re-runnable: delete is idempotent,
-- inserts guarded by NOT EXISTS.
-- ============================================================

-- STEP 1: remove the over-broad blanket 232 chapter-72 rule
delete from additional_duties
where duty_type = '232' and hts_prefix = '72' and origin_country = '' and rate = 50;

-- STEP 2: re-add 232 steel at the verified heading level (Annex I-A:
-- 7206-7229; 7201-7205 ferroalloys etc. excluded; 7216 except
-- 7216.61.00/7216.69.00/7216.91.00 — subheading exception not modeled)
insert into additional_duties
  (duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
select v.duty_type, v.hts_prefix, v.origin_country, v.rate, v.basis,
       v.effective_from::date, v.source, v.note
from (values
  ('232','7206','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7207','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7208','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7209','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7210','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7211','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7212','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7213','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7214','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7215','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7216','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7217','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7218','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7219','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7220','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7221','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7222','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7223','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7224','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7225','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7226','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7227','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7228','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','7229','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value')
) as v(duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
where not exists (
  select 1 from additional_duties d
  where d.duty_type = v.duty_type
    and d.hts_prefix = v.hts_prefix
    and d.origin_country = v.origin_country
);

-- STEP 3: carve ferromolybdenum out of the 2024 301 steel/aluminum blanket
insert into additional_duties
  (duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
select v.duty_type, v.hts_prefix, v.origin_country, v.rate, v.basis,
       v.effective_from::date, v.source, v.note
from (values
  ('301-CN','72027000','CHINA',0,'full_value','2024-09-27',
   'USTR 2024 Section 301 four-year review — steel/aluminum increase to 25% (9903.91.01)',
   '[NOT SUBJECT] Ferromolybdenum (7202.70.00) is not on the 2024 Section 301 steel/aluminum increase list (9903.91.01); no Section 301 applies beyond the forced-labor duty. Carve-out vs the chapter-72 blanket rule; verified against reference 2026-10-03.')
) as v(duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
where not exists (
  select 1 from additional_duties d
  where d.duty_type = v.duty_type
    and d.hts_prefix = v.hts_prefix
    and d.origin_country = v.origin_country
);

-- VERIFY (after):
-- expect 24 rows of 232 50% at 7206-7229, zero rows with hts_prefix='72';
-- expect one 301-CN carve-out row for 72027000 at rate 0.
select duty_type, hts_prefix, origin_country, rate, effective_from
from additional_duties
where (duty_type = '232' and hts_prefix in ('72','7206','7207','7224','7229'))
   or (duty_type = '301-CN' and hts_prefix = '72027000')
order by duty_type, hts_prefix;
