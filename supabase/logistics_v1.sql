-- logistics_v1.sql — Logistics module: drayage moves + warehouse appointments.
-- Run AFTER saas.sql (needs companies / own_company_id()).
--
-- drayage_moves: one row per container move (pickup / delivery / reposition).
-- last_free_day + demurrage_rate feed the demurrage monitor tab, which is
-- computed at read time (no stored charges).
-- warehouse_appts: inbound / outbound appointments at a warehouse.

create table if not exists drayage_moves (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  container_number text not null,
  mbl text,
  gttid text,
  move_type text not null default 'delivery' check (move_type in ('pickup', 'delivery', 'reposition')),
  origin text,
  destination text,
  carrier text,
  driver_name text,
  truck_plate text,
  scheduled_date date,
  completed_date date,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_transit', 'completed', 'cancelled')),
  last_free_day date,
  demurrage_rate numeric,
  detention_rate numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists drayage_moves_company_idx on drayage_moves (company_id);
create index if not exists drayage_moves_company_container_idx on drayage_moves (company_id, container_number);

create table if not exists warehouse_appts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  warehouse_name text not null,
  address text,
  appt_at timestamptz,
  appt_type text not null default 'inbound' check (appt_type in ('inbound', 'outbound')),
  container_number text,
  reference text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'confirmed', 'completed', 'cancelled', 'missed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists warehouse_appts_company_idx on warehouse_appts (company_id);

alter table drayage_moves enable row level security;
alter table warehouse_appts enable row level security;

drop policy if exists "drayage_moves tenant read" on drayage_moves;
create policy "drayage_moves tenant read" on drayage_moves
  for select using (company_id = own_company_id());

drop policy if exists "drayage_moves tenant write" on drayage_moves;
create policy "drayage_moves tenant write" on drayage_moves
  for all using (company_id = own_company_id())
  with check (company_id = own_company_id());

drop policy if exists "warehouse_appts tenant read" on warehouse_appts;
create policy "warehouse_appts tenant read" on warehouse_appts
  for select using (company_id = own_company_id());

drop policy if exists "warehouse_appts tenant write" on warehouse_appts;
create policy "warehouse_appts tenant write" on warehouse_appts
  for all using (company_id = own_company_id())
  with check (company_id = own_company_id());
