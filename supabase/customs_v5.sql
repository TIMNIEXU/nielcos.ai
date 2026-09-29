-- ============================================================
-- nielcos.ai customs v5: public read access for reference tables
-- hts_schedule (USITC rates) and additional_duties (published tariff
-- actions) are public reference data — no customer PII. The homepage
-- duty estimator queries them without login (anon role, SELECT only).
-- Run once in the Supabase SQL editor, after customs_v3.sql/v4.sql.
-- ============================================================

drop policy if exists "hts read anon" on hts_schedule;
create policy "hts read anon" on hts_schedule
  for select to anon using (true);

drop policy if exists "additional duties read anon" on additional_duties;
create policy "additional duties read anon" on additional_duties
  for select to anon using (true);
