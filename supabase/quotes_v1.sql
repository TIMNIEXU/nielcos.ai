-- GRI-001 V4a — unified service quote requests (revenue funnel backend).
-- service_quotes: one RFQ table for customs / freight / drayage / warehouse /
--   insurance / bond. Public insert (lead capture), workbench triage.
-- rate_cards: versioned rate rules go here when Tim provides them (V4b).
--   No public access; server-side pricing only. Never invent rates.
-- Guarded / re-runnable. Run in Supabase SQL editor.

-- ============ VERIFY ============
-- select table_name from information_schema.tables
-- where table_name in ('service_quotes','rate_cards');

-- ============ MERGE ============
create table if not exists public.service_quotes (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid,
  service       text not null,
  name          text,
  company       text,
  email         text,
  phone         text,
  origin        text,
  destination   text,
  cargo         text,
  value_usd     numeric,
  message       text,
  status        text not null default 'new',
  quoted_amount numeric,
  quoted_note   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists service_quotes_status_time
  on public.service_quotes (status, created_at desc);

create table if not exists public.rate_cards (
  id         uuid primary key default gen_random_uuid(),
  code       text not null,
  version    int not null default 1,
  rules      jsonb not null default '{}'::jsonb,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (code, version)
);

alter table public.service_quotes enable row level security;
alter table public.rate_cards enable row level security;
-- rate_cards: no public policies at all (server-side only).

-- Public lead capture: insert-only.
drop policy if exists service_quotes_public_insert on public.service_quotes;
create policy service_quotes_public_insert on public.service_quotes
  for insert with check (true);

-- Workbench triage: same shape as insurance/hts_verification leads.
drop policy if exists service_quotes_triage_select on public.service_quotes;
create policy service_quotes_triage_select on public.service_quotes
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
drop policy if exists service_quotes_triage_update on public.service_quotes;
create policy service_quotes_triage_update on public.service_quotes
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
