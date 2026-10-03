-- ============================================================
-- nielcos.ai customs v21: fix the 301 note/provision for 7202.80.00.00 —
-- 2026-10-03.
--
-- Background: v20 added a 301-CN correction INSERT for 72028000, but the
-- v10 List 3 row already occupies the ('301-CN','72028000','CHINA') key,
-- so NOT EXISTS blocked the insert. The v12 chapter-72 blanket
-- (9903.91.01, 2024-09-27) still wins the per-type contest on date, so
-- the estimate shows the right rate (25%) but the WRONG provision
-- (9903.91.01 instead of 9903.88.03). The total 30.60% was correct;
-- only the filing reference was wrong.
--
-- Fix: update the existing v10 List 3 row in place — refresh its note
-- to record the verification, and set effective_from to 2024-09-27 so
-- it (correctly) supersedes the v12 blanket for this HTS. The matcher
-- uses effective_from only for supersede ordering (no entry-date
-- filtering), so this makes the true rule win without inventing data.
--
-- Lesson: a "correction" for an existing (duty_type, hts_prefix, origin)
-- key must be an UPDATE, not an INSERT (NOT EXISTS will block it).
--
-- Run in the Supabase SQL editor. Re-runnable: the WHERE clause is
-- specific; running twice is a no-op.
-- ============================================================

-- VERIFY (before): expect one row — 301-CN 72028000 CHINA 25% (List 3 note, 2019-05-10)
select duty_type, hts_prefix, origin_country, rate, effective_from,
       left(note, 60) as note_head
from additional_duties
where duty_type = '301-CN' and hts_prefix = '72028000' and origin_country = 'CHINA';

update additional_duties
set effective_from = '2024-09-27',
    note = 'Classic Section 301 List 3 (Tranche 3) 25% (9903.88.03). Confirmed: ferrotungsten (7202.80.00) was not raised by the 2024 steel/aluminum review (9903.91.01); the v12 chapter-72 blanket does not apply to this HTS. Verified against reference 2026-10-03; supersedes the blanket by later effective date.'
where duty_type = '301-CN'
  and hts_prefix = '72028000'
  and origin_country = 'CHINA';

-- VERIFY (after): expect effective_from = 2024-09-27 and the new note
select duty_type, hts_prefix, origin_country, rate, effective_from,
       left(note, 60) as note_head
from additional_duties
where duty_type = '301-CN' and hts_prefix = '72028000' and origin_country = 'CHINA';
