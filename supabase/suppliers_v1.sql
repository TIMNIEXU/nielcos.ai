-- suppliers_v1.sql — Supplier directory: profiles + scorecard + document checklist + risk flags.
-- Run AFTER saas.sql (needs companies / own_company_id()).
--
-- One row per supplier per company. The scorecard (quality / delivery / cost /
-- service, 0-100) is stored raw; the overall score is computed as a plain
-- average at read time. `docs` is a jsonb map of doc_key -> status
-- ("ok" | "pending" | "missing"). `risk_flags` is a text[] of flag keys.
-- Doc keys (fixed set, labels live in the app i18n):
--   business_license, iso_cert, bank_info, tax_form, compliance_decl, insurance
-- Risk flag keys (fixed set):
--   financial, compliance, delivery, quality, geopolitical

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  code text not null,
  name_en text,
  name_zh text,
  country text,
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  payment_terms text,
  currency text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  score_quality smallint check (score_quality between 0 and 100),
  score_delivery smallint check (score_delivery between 0 and 100),
  score_cost smallint check (score_cost between 0 and 100),
  score_service smallint check (score_service between 0 and 100),
  docs jsonb not null default '{}',
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high')),
  risk_flags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code)
);

create index if not exists suppliers_company_idx on suppliers (company_id);
create index if not exists suppliers_company_code_idx on suppliers (company_id, code);

alter table suppliers enable row level security;

drop policy if exists "suppliers tenant read" on suppliers;
create policy "suppliers tenant read" on suppliers
  for select using (company_id = own_company_id());

drop policy if exists "suppliers tenant write" on suppliers;
create policy "suppliers tenant write" on suppliers
  for all using (company_id = own_company_id())
  with check (company_id = own_company_id());
