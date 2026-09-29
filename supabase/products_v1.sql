-- products_v1.sql — Product catalog (SKU + HTS + duty rates + PGA flags).
-- Run AFTER saas.sql (needs companies / own_company_id()).
--
-- One row per SKU per company. Duty rates are NOT stored here: the app
-- enriches each product at read time from hts_schedule (USITC 2026 Rev 19),
-- additional_duties (232 / 301-FL rules) and pga_rules, so rates always
-- reflect the current official library. pga_manual holds only the user's
-- own flags on top of the auto-matched pga_rules.

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  sku text not null,
  name_en text,
  name_zh text,
  hts_code text,
  origin_country text,
  material text,
  pga_manual text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, sku)
);

create index if not exists products_company_idx on products (company_id);
create index if not exists products_company_sku_idx on products (company_id, sku);

alter table products enable row level security;

drop policy if exists "products tenant read" on products;
create policy "products tenant read" on products
  for select using (company_id = own_company_id());

drop policy if exists "products tenant write" on products;
create policy "products tenant write" on products
  for all using (company_id = own_company_id())
  with check (company_id = own_company_id());
