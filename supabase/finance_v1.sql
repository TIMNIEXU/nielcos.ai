-- finance_v1.sql — Finance module: landed-cost sheets + line items + payables.
-- Run AFTER saas.sql (needs companies / own_company_id()).
--
-- finance_cost_sheets: one landed-cost sheet per shipment (linked by GTTID).
--   Totals are computed at read time from finance_cost_items.
--   Draft sheets with eta_date feed the duty-forecast tab.
-- finance_cost_items: category is one of
--   goods | freight | insurance | duty | drayage | warehouse | demurrage | other
-- finance_payables: payables ledger; "overdue" is computed client-side
--   (status pending + due_date < today). No FX conversion anywhere.

create table if not exists finance_cost_sheets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  gttid text,
  title text not null,
  currency text not null default 'USD',
  eta_date date,
  status text not null default 'draft' check (status in ('draft', 'final')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_cost_sheets_company_idx on finance_cost_sheets (company_id);

create table if not exists finance_cost_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  sheet_id uuid not null references finance_cost_sheets(id) on delete cascade,
  category text not null default 'other'
    check (category in ('goods','freight','insurance','duty','drayage','warehouse','demurrage','other')),
  label text,
  amount numeric not null default 0,
  notes text,
  sort smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists finance_cost_items_sheet_idx on finance_cost_items (sheet_id);

create table if not exists finance_payables (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  payee text not null,
  category text not null default 'other'
    check (category in ('duty','freight','drayage','warehouse','supplier','other')),
  amount numeric not null default 0,
  currency text not null default 'USD',
  due_date date,
  gttid text,
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  paid_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_payables_company_idx on finance_payables (company_id);
create index if not exists finance_payables_company_due_idx on finance_payables (company_id, due_date);

alter table finance_cost_sheets enable row level security;
alter table finance_cost_items enable row level security;
alter table finance_payables enable row level security;

drop policy if exists "finance_cost_sheets tenant read" on finance_cost_sheets;
create policy "finance_cost_sheets tenant read" on finance_cost_sheets
  for select using (company_id = own_company_id());
drop policy if exists "finance_cost_sheets tenant write" on finance_cost_sheets;
create policy "finance_cost_sheets tenant write" on finance_cost_sheets
  for all using (company_id = own_company_id())
  with check (company_id = own_company_id());

drop policy if exists "finance_cost_items tenant read" on finance_cost_items;
create policy "finance_cost_items tenant read" on finance_cost_items
  for select using (company_id = own_company_id());
drop policy if exists "finance_cost_items tenant write" on finance_cost_items;
create policy "finance_cost_items tenant write" on finance_cost_items
  for all using (company_id = own_company_id())
  with check (company_id = own_company_id());

drop policy if exists "finance_payables tenant read" on finance_payables;
create policy "finance_payables tenant read" on finance_payables
  for select using (company_id = own_company_id());
drop policy if exists "finance_payables tenant write" on finance_payables;
create policy "finance_payables tenant write" on finance_payables
  for all using (company_id = own_company_id())
  with check (company_id = own_company_id());
