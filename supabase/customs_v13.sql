-- ============================================================
-- customs_v13.sql — AD/CVD watchlist enrichment (Layer 1)
-- Adds case numbers + scope/exclusion summaries + verification date
-- to the curated ad_cvd_watch table (created in intelligence_v1.sql).
--
-- Guarded / re-runnable. Run in Supabase SQL Editor as project owner.
-- Case-number backfills land in customs_v13_seed.sql after verification.
-- ============================================================

alter table public.ad_cvd_watch
  add column if not exists case_numbers  text,
  add column if not exists scope_summary  text,
  add column if not exists exclusions     text,
  add column if not exists last_verified  date;

-- verify:
-- select count(*) filter (where case_numbers is not null) as with_case,
--        count(*) as total from public.ad_cvd_watch;
