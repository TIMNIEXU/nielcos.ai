-- trades.sql — Trade parent object (spec TRD-01/02/03) + HTS review decisions + screening checks
-- Run AFTER supabase/saas.sql in the Supabase SQL editor (same project as jomaus).
--
-- What it creates:
--   trades                  one row per trade (the spec's north-star parent object)
--   shipments.trade_id      nullable link shipment -> trade
--   documents.trade_id      nullable link document -> trade
--   finance_cost_sheets.trade_id / finance_payables.trade_id / customs_entries.trade_id
--   hts_review_decisions    reviewer adopt/reject on HTS suggestions (customs workbench)
--   screening_checks        sanctioned-party screening log (compliance module)
--   next_trade_no()         NIEL-TRD-YYYY-000123 sequence
--   link_shipment_to_trade() SECURITY DEFINER helper (customer app has no
--                           UPDATE grant on shipments, so linking goes through this)
--
-- VERIFY (before): prerequisites ------------------------------------------------
do $$
begin
  if not exists (select 1 from information_schema.tables where table_name = 'companies') then
    raise exception 'VERIFY FAILED: companies missing — run saas.sql first';
  end if;
  if not exists (select 1 from information_schema.tables where table_name = 'shipments') then
    raise exception 'VERIFY FAILED: shipments missing — run jomaus schema.sql + saas.sql first';
  end if;
  if not exists (select 1 from information_schema.tables where table_name = 'documents') then
    raise exception 'VERIFY FAILED: documents missing — run saas.sql first';
  end if;
  if not exists (select 1 from pg_proc where proname = 'own_company_id') then
    raise exception 'VERIFY FAILED: own_company_id() missing — run saas.sql first';
  end if;
end $$;

-- 1. trades ---------------------------------------------------------------------
create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  trade_no text unique not null,
  title text not null,
  status text not null default 'draft'
    check (status in ('draft','active','completed','cancelled')),
  incoterm text,
  origin_country text,
  destination_country text,
  buyer_name text,
  supplier_name text,
  currency text not null default 'USD',
  total_value numeric,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trades_company_idx on trades (company_id);
create index if not exists trades_trade_no_idx on trades (trade_no);

-- Trade number sequence: NIEL-TRD-2026-000123
create sequence if not exists trade_no_seq start 1;
create or replace function public.next_trade_no()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return 'NIEL-TRD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('trade_no_seq')::text, 6, '0');
end;
$$;

-- 2. link columns ----------------------------------------------------------------
alter table shipments
  add column if not exists trade_id uuid references trades(id) on delete set null;
create index if not exists shipments_trade_idx on shipments (trade_id);

alter table documents
  add column if not exists trade_id uuid references trades(id) on delete set null;
create index if not exists documents_trade_idx on documents (trade_id);

do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'finance_cost_sheets') then
    alter table finance_cost_sheets
      add column if not exists trade_id uuid references trades(id) on delete set null;
  end if;
  if exists (select 1 from information_schema.tables where table_name = 'finance_payables') then
    alter table finance_payables
      add column if not exists trade_id uuid references trades(id) on delete set null;
  end if;
  if exists (select 1 from information_schema.tables where table_name = 'customs_entries') then
    alter table customs_entries
      add column if not exists trade_id uuid references trades(id) on delete set null;
  end if;
end $$;

-- 3. hts_review_decisions (customs workbench: reviewer adopt/reject, spec CUS-04) --
create table if not exists hts_review_decisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  hts text not null,
  origin_country text,
  decision text not null check (decision in ('adopted','rejected')),
  note text,
  reviewer uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists hts_review_company_idx on hts_review_decisions (company_id);

-- 4. screening_checks (compliance: sanctioned-party screening log) ----------------
create table if not exists screening_checks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  subject_type text not null default 'supplier'
    check (subject_type in ('supplier','customer','beneficiary','other')),
  subject_name text not null,
  subject_country text,
  result text not null default 'clear'
    check (result in ('clear','review','hit')),
  checked_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists screening_company_idx on screening_checks (company_id);

-- 5. link helper (SECURITY DEFINER: app has no UPDATE grant on shipments) ---------
create or replace function public.link_shipment_to_trade(p_trade_id uuid, p_gttid text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid := public.own_company_id();
  v_trade_company uuid;
  v_ship_company uuid;
begin
  if v_company is null then
    raise exception 'not authenticated';
  end if;
  if p_trade_id is not null then
    select company_id into v_trade_company from trades where id = p_trade_id;
    if v_trade_company is null or v_trade_company != v_company then
      raise exception 'trade not found';
    end if;
  end if;
  select company_id into v_ship_company from shipments where gttid = p_gttid;
  if v_ship_company is null or v_ship_company != v_company then
    raise exception 'shipment not found';
  end if;
  update shipments set trade_id = p_trade_id, updated_at = now() where gttid = p_gttid;
end;
$$;

-- 6. RLS --------------------------------------------------------------------------
alter table trades enable row level security;
alter table hts_review_decisions enable row level security;
alter table screening_checks enable row level security;

grant select, insert, update, delete on trades to authenticated;
grant select, insert on hts_review_decisions to authenticated;
grant select, insert on screening_checks to authenticated;
grant execute on function public.next_trade_no() to authenticated;
grant execute on function public.link_shipment_to_trade(uuid, text) to authenticated;

drop policy if exists "trades tenant read" on trades;
create policy "trades tenant read" on trades
  for select using (company_id = own_company_id());
drop policy if exists "trades tenant write" on trades;
create policy "trades tenant write" on trades
  for all using (company_id = own_company_id())
  with check (company_id = own_company_id());

drop policy if exists "hts_review tenant read" on hts_review_decisions;
create policy "hts_review tenant read" on hts_review_decisions
  for select using (company_id = own_company_id());
drop policy if exists "hts_review tenant write" on hts_review_decisions;
create policy "hts_review tenant write" on hts_review_decisions
  for all using (company_id = own_company_id())
  with check (company_id = own_company_id());

drop policy if exists "screening tenant read" on screening_checks;
create policy "screening tenant read" on screening_checks
  for select using (company_id = own_company_id());
drop policy if exists "screening tenant write" on screening_checks;
create policy "screening tenant write" on screening_checks
  for all using (company_id = own_company_id())
  with check (company_id = own_company_id());

-- VERIFY (after): expect one row each ------------------------------------------------
do $$
declare
  n_trades int; n_ship_col int; n_doc_col int;
begin
  select count(*) into n_trades from trades;
  select count(*) into n_ship_col
    from information_schema.columns
    where table_name = 'shipments' and column_name = 'trade_id';
  select count(*) into n_doc_col
    from information_schema.columns
    where table_name = 'documents' and column_name = 'trade_id';
  if n_ship_col != 1 then raise exception 'VERIFY FAILED: shipments.trade_id missing'; end if;
  if n_doc_col != 1 then raise exception 'VERIFY FAILED: documents.trade_id missing'; end if;
  raise notice 'trades.sql OK — trades rows: %, sample next_trade_no(): %', n_trades, public.next_trade_no();
  -- burn the verification number so live numbering starts clean (only on fresh install)
  if n_trades = 0 then
    perform setval('trade_no_seq', 1, false);
  end if;
end $$;
