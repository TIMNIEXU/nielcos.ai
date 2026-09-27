-- NIEL COS SaaS — multi-tenant backend
-- Run AFTER supabase/schema.sql (from the jomaus.com repo) in the SAME
-- Supabase project. One database, multiple front doors:
--   jomaus.com  → public tracking by container # (service_role API)
--   nielcos.ai  → logged-in customer workspace (user JWT + RLS)
--
-- Tenant isolation is enforced by Postgres RLS: a signed-in user only ever
-- sees rows belonging to their own company.

-- ── 1. Companies & profiles ──────────────────────────────────────────────
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','member')),
  created_at timestamptz not null default now()
);

-- ── 2. Extend shipments with tenant + GTTID ──────────────────────────────
alter table shipments
  add column if not exists company_id uuid references companies(id) on delete set null;
alter table shipments
  add column if not exists gttid text unique;
create index if not exists shipments_company_idx on shipments (company_id);

-- GTTID format: NIEL-2026-000123 (change the prefix here if Tim wants another)
create sequence if not exists gttid_seq start 1;
create or replace function public.next_gttid()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return 'NIEL-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('gttid_seq')::text, 6, '0');
end;
$$;

-- ── 3. Document metadata (files live in the shipment-docs storage bucket) ─
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  shipment_id uuid references shipments(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists documents_shipment_idx on documents (shipment_id);

-- ── 4. RLS: tenant isolation ─────────────────────────────────────────────
alter table companies enable row level security;
alter table profiles enable row level security;
alter table documents enable row level security;
-- shipments RLS was already enabled in schema.sql

grant select on companies to authenticated;
grant select on profiles to authenticated;
grant select on shipments to authenticated;
grant select, insert, delete on documents to authenticated;

-- helper: the signed-in user's company (security definer so it bypasses RLS)
create or replace function public.own_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

drop policy if exists "read own company" on companies;
create policy "read own company" on companies
  for select to authenticated using (id = public.own_company_id());

drop policy if exists "read own profile" on profiles;
create policy "read own profile" on profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "tenant shipments" on shipments;
create policy "tenant shipments" on shipments
  for select to authenticated using (company_id = public.own_company_id());

drop policy if exists "tenant documents read" on documents;
create policy "tenant documents read" on documents
  for select to authenticated using (company_id = public.own_company_id());
drop policy if exists "tenant documents write" on documents;
create policy "tenant documents write" on documents
  for insert to authenticated with check (company_id = public.own_company_id());
drop policy if exists "tenant documents delete" on documents;
create policy "tenant documents delete" on documents
  for delete to authenticated using (company_id = public.own_company_id());

-- ── 5. Storage bucket for shipment documents ─────────────────────────────
insert into storage.buckets (id, name, public)
values ('shipment-docs', 'shipment-docs', false)
on conflict (id) do nothing;

drop policy if exists "tenant docs read" on storage.objects;
create policy "tenant docs read" on storage.objects
  for select to authenticated
  using (bucket_id = 'shipment-docs'
    and (storage.foldername(name))[1] = public.own_company_id()::text);

drop policy if exists "tenant docs upload" on storage.objects;
create policy "tenant docs upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'shipment-docs'
    and (storage.foldername(name))[1] = public.own_company_id()::text);

drop policy if exists "tenant docs delete" on storage.objects;
create policy "tenant docs delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'shipment-docs'
    and (storage.foldername(name))[1] = public.own_company_id()::text);

-- ── 6. Signup trigger: new auth user → company + owner profile ───────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  insert into public.companies (name)
  values (coalesce(nullif(trim(new.raw_user_meta_data->>'company_name'), ''), 'My Company'))
  returning id into cid;

  insert into public.profiles (id, company_id, role)
  values (new.id, cid, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
