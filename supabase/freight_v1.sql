-- NIEL COS 货运板块 (Freight) — 异常工单 (exception tickets)
-- Run in the same Supabase project AFTER supabase/saas.sql.
-- Tenant isolation via public.own_company_id(), same pattern as saas.sql.

create table if not exists freight_exceptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  shipment_id uuid references shipments(id) on delete cascade,
  type text not null check (type in (
    'customs_hold',    -- 海关查验/扣留
    'demurrage_risk',  -- 滞箱/滞港风险
    'doc_missing',     -- 单证缺失
    'schedule_delay',  -- 船期延误/甩柜
    'damage_claim',    -- 货损索赔
    'other'            -- 其他
  )),
  title text not null,
  note text not null default '',
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists freight_exceptions_company_idx on freight_exceptions (company_id);
create index if not exists freight_exceptions_shipment_idx on freight_exceptions (shipment_id);
create index if not exists freight_exceptions_status_idx on freight_exceptions (status);

alter table freight_exceptions enable row level security;

grant select, insert, update on freight_exceptions to authenticated;

drop policy if exists "tenant freight_exceptions" on freight_exceptions;
create policy "tenant freight_exceptions" on freight_exceptions
  for all to authenticated
  using (company_id = public.own_company_id())
  with check (company_id = public.own_company_id());
