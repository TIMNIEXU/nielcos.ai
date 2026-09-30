-- ============================================================
-- nielcos.ai insurance v2: Bond Intelligence lead support (2026-09-30)
--
-- Adds customs-bond assessment columns to insurance_quotes and allows
-- coverage='bond' / mode='bond' so the public Bond Intelligence wizard
-- (/bond) can save bond leads into the existing triage workbench.
--
-- Run AFTER insurance_v1.sql in the Supabase SQL editor, once.
-- Re-runnable: every step is guarded (IF NOT EXISTS / DO blocks).
-- ============================================================

-- VERIFY (before): expect zero bond_* columns
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'insurance_quotes'
  and column_name like 'bond%';

-- 1) assessment columns ------------------------------------------------
alter table public.insurance_quotes
  add column if not exists bond_recommendation text;
alter table public.insurance_quotes
  add column if not exists bond_amount_est numeric;
alter table public.insurance_quotes
  add column if not exists annual_import_value numeric;
alter table public.insurance_quotes
  add column if not exists entries_per_year integer;
alter table public.insurance_quotes
  add column if not exists duties_paid numeric;

-- 2) allow coverage = 'bond' --------------------------------------------
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'insurance_quotes_coverage_check'
  ) then
    alter table public.insurance_quotes
      drop constraint insurance_quotes_coverage_check;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'insurance_quotes_coverage_bond_check'
  ) then
    alter table public.insurance_quotes
      add constraint insurance_quotes_coverage_bond_check
      check (coverage in ('marine', 'warehouse', 'contingent', 'stock', 'bond'));
  end if;
end
$$;

-- 3) allow mode = 'bond' (bond leads are not ocean/air shipments) --------
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'insurance_quotes_mode_check'
  ) then
    alter table public.insurance_quotes
      drop constraint insurance_quotes_mode_check;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'insurance_quotes_mode_bond_check'
  ) then
    alter table public.insurance_quotes
      add constraint insurance_quotes_mode_bond_check
      check (mode in ('ocean', 'air', 'bond'));
  end if;
end
$$;

-- VERIFY (after): expect 5 bond columns, and both new checks present ----
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'insurance_quotes'
  and (column_name like 'bond%' or column_name in ('annual_import_value', 'entries_per_year', 'duties_paid'))
order by column_name;

select conname
from pg_constraint
where conname in ('insurance_quotes_coverage_bond_check', 'insurance_quotes_mode_bond_check');
