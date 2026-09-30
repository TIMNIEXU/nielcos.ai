-- insurance_v1.sql — Insurance module: public quote requests + per-company policies.
-- Run AFTER saas.sql (needs companies / profiles / shipments / own_company_id()).
--
-- Design notes (honest scoping):
--   * insurance_quotes are LEADS for the agency (Niel Insurance Agency LLC).
--     Anyone on the public site can submit one (anon INSERT). Triage happens
--     in the workbench.
--   * LEAD VISIBILITY (multi-tenant safety): unclaimed leads (company_id is
--     null) are visible ONLY to companies flagged with insurance_triage = true
--     (the agency's own company). Ordinary customer companies can NEVER see
--     other people's leads — they only see quotes they have claimed themselves.
--     After running this file, flag the agency company once:
--       update companies set insurance_triage = true where id = '<AGENCY_COMPANY_UUID>';
--     (find the id with: select id, name from companies;)
--   * Claiming pins company_id to the caller's own company (RLS with-check),
--     so a lead can never be claimed into someone else's tenant.
--   * insurance_policies are per-tenant: one row per policy, optionally linked
--     to a shipment (GTTID) and/or the quote it was converted from.
--   * The agency is a licensed broker (IL #3004050191, NJ licensed), not an
--     underwriter. The app never invents rates or terms — quotes are
--     request-for-quote; premiums are entered manually after the agency
--     responds.
--   * Guarded + re-runnable: every DDL uses IF NOT EXISTS / DROP IF EXISTS.

-- Agency triage flag on the shared companies table (safe to re-run).
alter table public.companies
  add column if not exists insurance_triage boolean not null default false;

-- Helper: does the signed-in user belong to a company allowed to triage
-- insurance leads (i.e. the agency's own company)?
create or replace function public.can_triage_insurance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.companies c on c.id = p.company_id
    where p.id = auth.uid()
      and c.insurance_triage = true
  );
$$;

-- ---------------------------------------------------------------- quotes ---
create table if not exists insurance_quotes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- contact (from the public form)
  name text not null,
  company text,
  email text not null,
  phone text,

  -- shipment facts
  cargo_value numeric check (cargo_value is null or cargo_value >= 0),
  currency text not null default 'USD',
  origin text,
  destination text,
  mode text not null default 'ocean' check (mode in ('ocean', 'air')),
  coverage text not null default 'marine'
    check (coverage in ('marine', 'warehouse', 'contingent', 'stock')),
  message text,

  -- triage (workbench)
  status text not null default 'new'
    check (status in ('new', 'quoted', 'declined')),
  company_id uuid references companies(id) on delete set null,
  quoted_premium numeric check (quoted_premium is null or quoted_premium >= 0),
  quoted_note text
);

create index if not exists insurance_quotes_status_idx
  on insurance_quotes (status, created_at desc);
create index if not exists insurance_quotes_company_idx
  on insurance_quotes (company_id);

alter table insurance_quotes enable row level security;

-- Public quote form: anyone may insert a fresh lead. company_id/status are
-- forced by the check so the form cannot claim or pre-triage.
drop policy if exists "insurance_quotes public insert" on insurance_quotes;
create policy "insurance_quotes public insert" on insurance_quotes
  for insert to anon, authenticated
  with check (
    company_id is null
    and status = 'new'
    and char_length(name) between 1 and 120
    and char_length(email) between 3 and 200
    and char_length(coalesce(company, '')) <= 160
    and char_length(coalesce(phone, '')) <= 40
    and char_length(coalesce(message, '')) <= 2000
  );

-- Workbench read: own claimed quotes; unclaimed leads ONLY for the agency's
-- triage-enabled company. Ordinary tenants never see the lead pool.
drop policy if exists "insurance_quotes tenant read" on insurance_quotes;
create policy "insurance_quotes tenant read" on insurance_quotes
  for select to authenticated
  using (
    company_id = public.own_company_id()
    or (company_id is null and public.can_triage_insurance())
  );

-- Workbench triage: members update their company's quotes; the agency may
-- claim unclaimed leads (the with-check pins company_id to their own company).
drop policy if exists "insurance_quotes tenant update" on insurance_quotes;
create policy "insurance_quotes tenant update" on insurance_quotes
  for update to authenticated
  using (
    company_id = public.own_company_id()
    or (company_id is null and public.can_triage_insurance())
  )
  with check (company_id = public.own_company_id());

grant insert on insurance_quotes to anon, authenticated;
grant select, update on insurance_quotes to authenticated;

-- --------------------------------------------------------------- policies ---
create table if not exists insurance_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  quote_id uuid references insurance_quotes(id) on delete set null,
  shipment_id uuid references shipments(id) on delete set null,
  gttid text,

  policy_no text not null,
  insurer text,                       -- 承保公司 (underwriter), free text
  coverage text not null default 'marine'
    check (coverage in ('marine', 'warehouse', 'contingent', 'stock')),
  cargo_value numeric check (cargo_value is null or cargo_value >= 0),
  currency text not null default 'USD',
  premium numeric check (premium is null or premium >= 0),
  effective_date date,
  expiry_date date,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'expired', 'cancelled')),
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, policy_no)
);

create index if not exists insurance_policies_company_idx
  on insurance_policies (company_id, status);
create index if not exists insurance_policies_expiry_idx
  on insurance_policies (company_id, expiry_date)
  where status = 'active';
create index if not exists insurance_policies_shipment_idx
  on insurance_policies (shipment_id);

alter table insurance_policies enable row level security;

drop policy if exists "insurance_policies tenant read" on insurance_policies;
create policy "insurance_policies tenant read" on insurance_policies
  for select to authenticated
  using (company_id = public.own_company_id());

drop policy if exists "insurance_policies tenant write" on insurance_policies;
create policy "insurance_policies tenant write" on insurance_policies
  for all to authenticated
  using (company_id = public.own_company_id())
  with check (company_id = public.own_company_id());

grant select, insert, update, delete on insurance_policies to authenticated;

-- ----------------------------------------------------------------- verify ---
-- After running, expect:
--   select * from insurance_quotes limit 0;    -- ok (RLS on)
--   select * from insurance_policies limit 0;  -- ok (RLS on)
--   select column_name from information_schema.columns
--     where table_name = 'companies' and column_name = 'insurance_triage';  -- 1 row
-- Public form insert works with the anon key; workbench reads only after login.
-- Remember to flag the agency company:
--   update companies set insurance_triage = true where id = '<AGENCY_COMPANY_UUID>';
