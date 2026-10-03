-- Mode B — Supply Chain Case linkage (NIEL GROUP DIGITAL ARCHITECTURE v1.1).
-- One nielsc.com "Supply Chain Case" (SC-2026-XXXXX) fans out to N service
-- orders (one per service type). case_id groups the sibling orders; each SO
-- keeps its own SO-xxxxxx number and service_type for per-service triage
-- and routing (Customs → Niel Customs, Drayage → JOMA, ...).
-- Guarded / re-runnable. Run in Supabase SQL editor as owner.

-- ============ VERIFY (before) ============
-- select column_name from information_schema.columns
--  where table_name = 'service_orders' and column_name = 'case_id';
-- (zero rows before, one row after)

-- ============ MERGE ============
alter table public.service_orders
  add column if not exists case_id text;

create index if not exists service_orders_case
  on public.service_orders (case_id);

-- ============ VERIFY (after) ============
-- select column_name, data_type from information_schema.columns
--  where table_name = 'service_orders' and column_name = 'case_id';
-- expect exactly: case_id | text
