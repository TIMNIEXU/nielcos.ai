-- Mode B — Service Orders (any-point entry). NIEL COS Canonical Model:
--   Customer / Tenant → Trade Transaction (GTTID) → Service Orders (SO-xxxxxx).
-- A Service Order is one purchased service (drayage-only, customs-only, ...).
-- It may exist WITHOUT a GTTID (Quick Service Order: take the job first with
-- minimum fields, enrich later, link to a GTTID when the trade context appears).
-- Not ordered ≠ Incomplete: required fields are service-dependent.
-- Guarded / re-runnable. Run in Supabase SQL editor as owner.

-- ============ VERIFY ============
-- select table_name from information_schema.tables where table_name = 'service_orders';
-- select next_so_no();  -- expect SO-000001 (rolls back; sequence still advances)

-- ============ MERGE ============
create table if not exists public.service_orders (
  id            uuid primary key default gen_random_uuid(),
  so_no         text not null unique,
  company_id    uuid references public.companies(id) on delete set null,
  created_by    uuid references auth.users(id) on delete set null,
  service_type  text not null,                       -- drayage | customs | warehouse | freight | insurance | bond
  status        text not null default 'quote_requested',
  -- quote_requested → quoted → confirmed → in_progress → completed → invoiced → closed
  --                                                  ↘ cancelled (any time before invoiced)
  gttid         text,                                -- Trade Transaction id; null until linked
  quote_id      uuid references public.service_quotes(id) on delete set null,
  intake        jsonb not null default '{}'::jsonb,  -- service-specific fields (container #, LFD, ...)
  quoted_amount numeric,
  quoted_note   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists service_orders_company_time
  on public.service_orders (company_id, created_at desc);
create index if not exists service_orders_gttid
  on public.service_orders (gttid);
create index if not exists service_orders_quote
  on public.service_orders (quote_id);

create sequence if not exists so_seq start 1;
create or replace function public.next_so_no()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return 'SO-' || lpad(nextval('so_seq')::text, 6, '0');
end;
$$;

alter table public.service_orders enable row level security;

-- Public lead capture: insert-only (same shape as service_quotes).
drop policy if exists service_orders_public_insert on public.service_orders;
create policy service_orders_public_insert on public.service_orders
  for insert with check (true);

-- Customer workspace: a company sees its own service orders.
-- Ops triage: triage-enabled companies also see unclaimed (company_id null) rows.
drop policy if exists service_orders_select on public.service_orders;
create policy service_orders_select on public.service_orders
  for select using (
    company_id = public.own_company_id()
    or (
      company_id is null
      and exists (
        select 1 from public.companies c
        where c.id = public.own_company_id() and c.insurance_triage = true
      )
    )
  );

-- Ops updates its own rows (status workflow, intake enrichment, GTTID link).
drop policy if exists service_orders_update on public.service_orders;
create policy service_orders_update on public.service_orders
  for update using (
    company_id = public.own_company_id()
    or (
      company_id is null
      and exists (
        select 1 from public.companies c
        where c.id = public.own_company_id() and c.insurance_triage = true
      )
    )
  );
