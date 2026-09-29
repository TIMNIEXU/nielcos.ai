-- integrations_v1.sql — Integrations module: API keys, webhooks, EDI inbox,
-- connector requests, audit log. Plus SECURITY DEFINER helpers so the
-- public /api/v1/* routes can authenticate an API key without a user JWT.
--
-- Run AFTER saas.sql (needs companies / own_company_id()).
-- Guarded: safe to re-run; existing rows are never touched.

-- ============ 1. API keys ============
create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  scopes text[] not null default '{read}',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists api_keys_company_idx on api_keys (company_id);
create index if not exists api_keys_hash_idx on api_keys (key_hash);

alter table api_keys enable row level security;
drop policy if exists "api_keys tenant read" on api_keys;
create policy "api_keys tenant read" on api_keys
  for select using (company_id = own_company_id());
drop policy if exists "api_keys tenant write" on api_keys;
create policy "api_keys tenant write" on api_keys
  for all using (company_id = own_company_id())
  with check (company_id = own_company_id());

-- ============ 2. Webhook endpoints ============
create table if not exists webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  url text not null,
  events text[] not null default '{}',
  secret text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, url)
);
create index if not exists webhook_endpoints_company_idx on webhook_endpoints (company_id);

alter table webhook_endpoints enable row level security;
drop policy if exists "webhook_endpoints tenant read" on webhook_endpoints;
create policy "webhook_endpoints tenant read" on webhook_endpoints
  for select using (company_id = own_company_id());
drop policy if exists "webhook_endpoints tenant write" on webhook_endpoints;
create policy "webhook_endpoints tenant write" on webhook_endpoints
  for all using (company_id = own_company_id())
  with check (company_id = own_company_id());

-- ============ 3. Webhook deliveries (log) ============
create table if not exists webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  endpoint_id uuid not null references webhook_endpoints(id) on delete cascade,
  event text not null,
  payload jsonb,
  status_code integer,
  ok boolean not null default false,
  error text,
  duration_ms integer,
  created_at timestamptz not null default now()
);
create index if not exists webhook_deliveries_endpoint_idx on webhook_deliveries (endpoint_id, created_at desc);
create index if not exists webhook_deliveries_company_idx on webhook_deliveries (company_id, created_at desc);

alter table webhook_deliveries enable row level security;
drop policy if exists "webhook_deliveries tenant read" on webhook_deliveries;
create policy "webhook_deliveries tenant read" on webhook_deliveries
  for select using (company_id = own_company_id());
-- Inserts happen from server code through the user's own session.
drop policy if exists "webhook_deliveries tenant write" on webhook_deliveries;
create policy "webhook_deliveries tenant write" on webhook_deliveries
  for all using (company_id = own_company_id())
  with check (company_id = own_company_id());

-- ============ 4. EDI inbox ============
create table if not exists edi_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  kind text not null default 'unknown' check (kind in ('850', '856', '810', 'unknown')),
  filename text,
  raw_text text,
  parsed jsonb,
  status text not null default 'parsed',
  created_at timestamptz not null default now()
);
create index if not exists edi_documents_company_idx on edi_documents (company_id, created_at desc);

alter table edi_documents enable row level security;
drop policy if exists "edi_documents tenant read" on edi_documents;
create policy "edi_documents tenant read" on edi_documents
  for select using (company_id = own_company_id());
drop policy if exists "edi_documents tenant write" on edi_documents;
create policy "edi_documents tenant write" on edi_documents
  for all using (company_id = own_company_id())
  with check (company_id = own_company_id());

-- ============ 5. Connector requests ============
create table if not exists connector_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  connector text not null,
  note text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
create index if not exists connector_requests_company_idx on connector_requests (company_id);

alter table connector_requests enable row level security;
drop policy if exists "connector_requests tenant read" on connector_requests;
create policy "connector_requests tenant read" on connector_requests
  for select using (company_id = own_company_id());
drop policy if exists "connector_requests tenant write" on connector_requests;
create policy "connector_requests tenant write" on connector_requests
  for all using (company_id = own_company_id())
  with check (company_id = own_company_id());

-- ============ 6. Audit log ============
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  actor text,
  action text not null,
  entity text,
  entity_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_company_idx on audit_log (company_id, created_at desc);

alter table audit_log enable row level security;
drop policy if exists "audit_log tenant read" on audit_log;
create policy "audit_log tenant read" on audit_log
  for select using (company_id = own_company_id());
-- Writes go through the app server under the user's own session.
drop policy if exists "audit_log tenant write" on audit_log;
create policy "audit_log tenant write" on audit_log
  for all using (company_id = own_company_id())
  with check (company_id = own_company_id());

-- ============ 7. SECURITY DEFINER helpers for /api/v1 (API-key auth) ============

-- Validate a key hash -> owning company. Called with the anon key; the
-- function itself bypasses RLS by design (it only reveals company_id for a
-- valid, non-revoked key hash).
create or replace function auth_api_key(p_hash text)
returns table (key_id uuid, company_id uuid, scopes text[])
language sql security definer set search_path = public
as $$
  select id, company_id, scopes
  from api_keys
  where key_hash = p_hash and revoked_at is null
  limit 1;
$$;

create or replace function touch_api_key(p_hash text)
returns void
language sql security definer set search_path = public
as $$
  update api_keys set last_used_at = now() where key_hash = p_hash;
$$;

-- v1 shipment reads, scoped to the key's company (columns verified against
-- the freight track route's select list).
create or replace function v1_list_shipments(p_company_id uuid)
returns table (
  id uuid, gttid text, mbl_no text, container_number text, status text,
  origin text, destination text, current_location text, eta date,
  updated_at timestamptz
)
language sql security definer set search_path = public
as $$
  select id, gttid, mbl_no, container_number, status, origin, destination,
         current_location, eta, updated_at
  from shipments
  where company_id = p_company_id
  order by updated_at desc
  limit 100;
$$;

create or replace function v1_get_shipment(p_company_id uuid, p_gttid text)
returns table (
  id uuid, gttid text, mbl_no text, container_number text, containers jsonb,
  status text, origin text, destination text, current_location text, eta date,
  milestones jsonb, updated_at timestamptz
)
language sql security definer set search_path = public
as $$
  select id, gttid, mbl_no, container_number, containers, status, origin,
         destination, current_location, eta, milestones, updated_at
  from shipments
  where company_id = p_company_id
    and (gttid = p_gttid or mbl_no = p_gttid or container_number = p_gttid)
  limit 1;
$$;

create or replace function v1_list_documents(p_company_id uuid)
returns table (
  id uuid, file_name text, file_size bigint, shipment_id uuid,
  parse_status text, created_at timestamptz
)
language sql security definer set search_path = public
as $$
  select id, file_name, file_size, shipment_id, parse_status, created_at
  from documents
  where company_id = p_company_id
  order by created_at desc
  limit 100;
$$;
