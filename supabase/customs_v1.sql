-- Customs Phase 1: pre-filing intelligence (no broker license required).
-- Run in the Supabase SQL editor AFTER saas.sql.
--
-- Tables:
--   hts_schedule   reference tariff data (seeded common codes; extend anytime)
--   pga_rules      HTS prefix -> Participating Government Agency flags
--   customs_entries  one "entry workbook" per import (tenant-isolated)
--   entry_lines      product lines with AI-suggested + human-confirmed HTS
--
-- NOTE on rates: seeded general rates are APPROXIMATE reference values.
-- Always verify against the current USITC HTS before filing. Every line's
-- rate stays editable in the app.

-- ============ reference: HTS schedule ============
create table if not exists hts_schedule (
  hts_no text primary key,
  description text not null,
  general_rate numeric,          -- percent, e.g. 16.5
  unit text not null default 'ad val',
  keywords text not null default '',  -- comma-separated EN+CN keywords for matching
  reference_only boolean not null default true
);

alter table hts_schedule enable row level security;
drop policy if exists "hts read" on hts_schedule;
create policy "hts read" on hts_schedule
  for select to authenticated using (true);

-- ============ reference: PGA rules ============
create table if not exists pga_rules (
  id uuid primary key default gen_random_uuid(),
  hts_prefix text not null,      -- match when hts_no starts with this (dots stripped)
  agency text not null,          -- e.g. 'FDA'
  agency_cn text not null default '',
  note text not null default ''
);

alter table pga_rules enable row level security;
drop policy if exists "pga read" on pga_rules;
create policy "pga read" on pga_rules
  for select to authenticated using (true);

-- ============ tenant: customs entries ============
create table if not exists customs_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  entry_no text,                 -- broker-filed entry number; blank while draft
  importer_name text,
  shipment_id uuid references shipments(id) on delete set null,
  status text not null default 'draft',  -- draft|classifying|packet_ready|filed|released
  milestones jsonb not null default '[]',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customs_entries_company_entry_uidx
  on customs_entries (company_id, entry_no)
  where entry_no is not null and entry_no <> '';

alter table customs_entries enable row level security;
drop policy if exists "tenant customs entries" on customs_entries;
create policy "tenant customs entries" on customs_entries
  for all to authenticated
  using (company_id = public.own_company_id())
  with check (company_id = public.own_company_id());

-- ============ tenant: entry lines ============
create table if not exists entry_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references customs_entries(id) on delete cascade,
  description text not null,
  quantity numeric,
  value_usd numeric not null default 0,
  suggested_hts jsonb not null default '[]',  -- [{hts_no, description, rate, score}]
  confirmed_hts text,
  duty_rate numeric,             -- %, prefilled from HTS, editable
  additional_pct numeric not null default 0,  -- 301/232 etc., %
  created_at timestamptz not null default now()
);

alter table entry_lines enable row level security;
drop policy if exists "tenant entry lines" on entry_lines;
create policy "tenant entry lines" on entry_lines
  for all to authenticated
  using (exists (
    select 1 from customs_entries e
    where e.id = entry_lines.entry_id and e.company_id = public.own_company_id()
  ))
  with check (exists (
    select 1 from customs_entries e
    where e.id = entry_lines.entry_id and e.company_id = public.own_company_id()
  ));
