-- GRI-001 V3 — HTS Intelligence tables.
-- hts_verifications: broker verification requests (public lead form + workbench triage).
-- alert_subscriptions: regulatory-impact alert signups (public lead form).
-- ad_cvd_watch: curated AD/CVD high-risk corridor watchlist (public read).
--   This is a curated watchlist, NOT a complete AD/CVD database — the UI must say so.
-- Guarded / re-runnable. Run in Supabase SQL editor.

-- ============ VERIFY ============
-- select table_name from information_schema.tables
-- where table_name in ('hts_verifications','alert_subscriptions','ad_cvd_watch');

-- ============ MERGE ============
create table if not exists public.hts_verifications (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid,
  hts_no              text not null,
  product_description text,
  origin              text,
  status              text not null default 'requested',
  contact_name        text,
  contact_email       text,
  contact_phone       text,
  broker_note         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists hts_verifications_status_time
  on public.hts_verifications (status, created_at desc);

create table if not exists public.alert_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid,
  email      text not null,
  keywords   text not null,
  locale     text not null default 'en',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists alert_subscriptions_email
  on public.alert_subscriptions (email);

create table if not exists public.ad_cvd_watch (
  id              uuid primary key default gen_random_uuid(),
  product_keyword text not null,
  hts_prefix      text,
  origin          text not null,
  case_type       text not null,
  status          text not null default 'order_in_place',
  note            text,
  source_url      text,
  updated_at      timestamptz not null default now()
);
create index if not exists ad_cvd_watch_kw_origin
  on public.ad_cvd_watch (product_keyword, origin);
-- Business-natural unique key so the seed below is truly re-runnable.
create unique index if not exists ad_cvd_watch_business_key
  on public.ad_cvd_watch (product_keyword, coalesce(hts_prefix, ''), origin, case_type);

alter table public.hts_verifications enable row level security;
alter table public.alert_subscriptions enable row level security;
alter table public.ad_cvd_watch enable row level security;

-- Public lead capture: insert-only.
drop policy if exists hts_verifications_public_insert on public.hts_verifications;
create policy hts_verifications_public_insert on public.hts_verifications
  for insert with check (true);
drop policy if exists alert_subscriptions_public_insert on public.alert_subscriptions;
create policy alert_subscriptions_public_insert on public.alert_subscriptions
  for insert with check (true);

-- Workbench triage: own company's rows + the unclaimed public lead pool
-- (visible only to triage-enabled companies, same flag as insurance leads).
drop policy if exists hts_verifications_triage_select on public.hts_verifications;
create policy hts_verifications_triage_select on public.hts_verifications
  for select using (
    company_id = public.own_company_id()
    or (
      company_id is null
      and exists (
        select 1 from public.companies c
        where c.id = public.own_company_id() and c.insurance_triage = true
      )
    )
  );
drop policy if exists hts_verifications_triage_update on public.hts_verifications;
create policy hts_verifications_triage_update on public.hts_verifications
  for update using (
    company_id = public.own_company_id()
    or (
      company_id is null
      and exists (
        select 1 from public.companies c
        where c.id = public.own_company_id() and c.insurance_triage = true
      )
    )
  );

-- Watchlist is curated public information: world-readable, no PII.
drop policy if exists ad_cvd_watch_public_read on public.ad_cvd_watch;
create policy ad_cvd_watch_public_read on public.ad_cvd_watch
  for select using (true);

-- GRI-001 V3: pga_rules is reference data (agency names + notes, no PII).
-- The public duty-lookup enriches HTS results with PGA flags, so anon needs read.
drop policy if exists "pga public read" on public.pga_rules;
create policy "pga public read" on public.pga_rules
  for select to anon using (true);

-- ============ SEED: curated watchlist (~30 known high-risk corridors) ============
-- Scope notes are intentionally conservative: "verify current scope" everywhere.
insert into public.ad_cvd_watch (product_keyword, hts_prefix, origin, case_type, status, note, source_url)
values
  ('aluminum extrusions','7610','China','AD/CVD','order_in_place','Long-standing AD/CVD orders. Verify current scope and exclusions before quoting.','https://access.trade.gov'),
  ('wooden bedroom furniture','9403','China','AD','order_in_place','AD order with broad scope. Verify current scope before quoting.','https://access.trade.gov'),
  ('steel wheels','8708','China','AD/CVD','order_in_place','AD/CVD orders in place. Verify current scope.','https://access.trade.gov'),
  ('passenger vehicle tires','4011','China','AD','order_in_place','AD order; also watch Thailand/Vietnam/ Korea tires cases.','https://access.trade.gov'),
  ('passenger vehicle tires','4011','Thailand','AD','order_in_place','AD order. Verify current scope.','https://access.trade.gov'),
  ('passenger vehicle tires','4011','Vietnam','AD','order_in_place','AD order. Verify current scope.','https://access.trade.gov'),
  ('solar cells and modules','8541','China','AD/CVD','order_in_place','AD/CVD orders; circumvention cases cover SE Asia assembly. Verify scope.','https://access.trade.gov'),
  ('solar cells and modules','8541','Cambodia','AD/CVD','order_in_place','AD/CVD investigations tied to circumvention. Verify scope.','https://access.trade.gov'),
  ('solar cells and modules','8541','Malaysia','AD/CVD','order_in_place','AD/CVD investigations tied to circumvention. Verify scope.','https://access.trade.gov'),
  ('solar cells and modules','8541','Thailand','AD/CVD','order_in_place','AD/CVD investigations tied to circumvention. Verify scope.','https://access.trade.gov'),
  ('solar cells and modules','8541','Vietnam','AD/CVD','order_in_place','AD/CVD investigations tied to circumvention. Verify scope.','https://access.trade.gov'),
  ('mattresses','9404','China','AD','order_in_place','AD orders; scope expanded over time. Verify.','https://access.trade.gov'),
  ('mattresses','9404','Vietnam','AD','order_in_place','AD orders. Verify current scope.','https://access.trade.gov'),
  ('quartz surface products','6810','China','AD/CVD','order_in_place','AD/CVD orders. Verify current scope and exclusions.','https://access.trade.gov'),
  ('ceramic tile','6907','China','AD/CVD','order_in_place','AD/CVD orders. Verify current scope.','https://access.trade.gov'),
  ('steel nails','7317','China','AD','order_in_place','AD order with extensive scope. Verify.','https://access.trade.gov'),
  ('paper shopping bags','4819','China','AD/CVD','order_in_place','AD/CVD orders. Verify current scope.','https://access.trade.gov'),
  ('hardwood plywood','4412','China','AD/CVD','order_in_place','AD/CVD orders. Verify current scope and exclusions.','https://access.trade.gov'),
  ('cast iron soil pipe','7303','China','AD/CVD','order_in_place','AD/CVD orders. Verify scope.','https://access.trade.gov'),
  ('forged steel fittings','7307','China','AD','order_in_place','AD orders. Verify scope.','https://access.trade.gov'),
  ('stainless steel flanges','7307','China','AD','order_in_place','AD orders. Verify scope.','https://access.trade.gov'),
  ('wooden cabinets and vanities','9403','China','AD/CVD','order_in_place','AD/CVD orders. Verify current scope and exclusions.','https://access.trade.gov'),
  ('polyester textured yarn','5402','China','AD/CVD','order_in_place','AD/CVD orders. Verify scope.','https://access.trade.gov'),
  ('common alloy aluminum sheet','7606','China','AD/CVD','order_in_place','AD/CVD orders. Verify scope.','https://access.trade.gov'),
  ('steel propane cylinders','7311','China','AD','order_in_place','AD orders. Verify scope.','https://access.trade.gov'),
  ('large residential washers','8450','China','AD','order_in_place','AD order. Verify scope.','https://access.trade.gov'),
  ('truck and bus tires','4011','China','AD/CVD','order_in_place','AD/CVD orders. Verify scope.','https://access.trade.gov'),
  ('glycine','2922','China','AD','order_in_place','AD orders. Verify scope.','https://access.trade.gov'),
  ('citric acid','2918','China','AD/CVD','order_in_place','AD/CVD orders. Verify scope.','https://access.trade.gov'),
  ('diamond sawblades','8202','China','AD','order_in_place','AD order. Verify scope.','https://access.trade.gov'),
  ('steel concrete reinforcing bar','7213','China','AD/CVD','order_in_place','AD/CVD orders; multiple origins covered. Verify.','https://access.trade.gov'),
  ('oil country tubular goods','7304','China','AD/CVD','order_in_place','AD/CVD orders. Verify scope.','https://access.trade.gov'),
  ('cold-rolled steel flat products','7209','China','AD/CVD','order_in_place','AD/CVD orders. Verify scope.','https://access.trade.gov'),
  ('corrosion-resistant steel','7210','China','AD/CVD','order_in_place','AD/CVD orders. Verify scope.','https://access.trade.gov')
on conflict (product_keyword, coalesce(hts_prefix, ''), origin, case_type) do nothing;
