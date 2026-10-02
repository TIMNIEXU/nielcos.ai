-- GRI-001 6a — Product Passport: per-SKU import event history (auto-accumulated).
-- product_events: one row per (entry, sku) when a customs entry line is
-- confirmed WITH a SKU link in the workbench. Written by the app, never by hand.
-- Rates are PERCENT units (e.g. 32.5 = 32.5%), same as entry_lines duty math.
-- Guarded / re-runnable. Run in Supabase SQL editor.

-- ============ VERIFY ============
-- select table_name from information_schema.tables
-- where table_name in ('product_events');
-- select column_name from information_schema.columns
-- where table_name = 'entry_lines' and column_name = 'sku';

-- ============ MERGE ============
create table if not exists public.product_events (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  sku           text not null,
  entry_id      uuid references public.customs_entries(id) on delete set null,
  event_type    text not null default 'entry_filed',  -- entry_filed in v1
  hts_code      text,
  duty_rate     numeric,   -- total % at confirmation (MFN + additional), percent units
  customs_value numeric,   -- USD entered value of the line
  occurred_at   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index if not exists product_events_company_sku_time
  on public.product_events (company_id, sku, occurred_at desc);
-- Idempotent: one entry_filed event per (entry, sku); re-confirming a line
-- replaces the row instead of duplicating it.
create unique index if not exists product_events_entry_sku_uidx
  on public.product_events (company_id, entry_id, sku, event_type)
  where entry_id is not null;

-- Link entry lines to catalog SKUs (nullable; set in the workbench line editor).
alter table public.entry_lines add column if not exists sku text;

alter table public.product_events enable row level security;
drop policy if exists "tenant product events" on public.product_events;
create policy "tenant product events" on public.product_events
  for all to authenticated
  using (company_id = public.own_company_id())
  with check (company_id = public.own_company_id());
