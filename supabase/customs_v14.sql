-- ============================================================
-- customs_v14.sql — AD/CVD Case Registry (Layer 2 evidence)
-- NIEL AD/CVD Risk Checker v1.0 backend.
--
-- Layer 1 (fast screening)  = ad_cvd_watch  (v1, v13 columns)
-- Layer 2 (evidence)        = ad_cvd_cases   (this file)
--
-- Guarded / re-runnable: all DDL uses IF NOT EXISTS, seeds use
-- ON CONFLICT DO NOTHING / DO UPDATE keyed on the business natural key.
-- Run in Supabase SQL Editor as the project owner.
-- ============================================================

-- ---------- 1. table ----------
create table if not exists public.ad_cvd_cases (
  id                      uuid primary key default gen_random_uuid(),
  case_number             text not null,              -- A-570-967
  case_type               text not null,              -- AD | CVD
  country                 text not null,              -- China
  product_name            text not null,              -- Aluminum Extrusions
  scope_text_original     text,                       -- key excerpt of official scope language
  scope_summary           text,                       -- 2-3 sentence plain summary
  included_products       text,                       -- notable included product types
  exclusions              text,                       -- notable exclusions / scope rulings
  hts_references          text,                       -- HTS numbers cited in scope / FR notice
  status                  text not null default 'order_in_place',
  effective_date          date,                       -- order date (or final determination)
  commerce_source_url     text,                       -- IA ACCESS case page
  federal_register_documents jsonb,                   -- [{title,url,date}]
  last_verified_at        date,
  verification_status     text not null default 'unverified',  -- verified | partial | unverified
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create unique index if not exists ad_cvd_cases_number
  on public.ad_cvd_cases (case_number);
create index if not exists ad_cvd_cases_country_product
  on public.ad_cvd_cases (country, product_name);

-- ---------- 2. RLS: curated public information, world-readable ----------
alter table public.ad_cvd_cases enable row level security;
drop policy if exists ad_cvd_cases_public_read on public.ad_cvd_cases;
create policy ad_cvd_cases_public_read on public.ad_cvd_cases
  for select using (true);

-- ---------- 3. seed placeholder (real seeds land after case research) ----------
-- Seeds are keyed on case_number; re-running never duplicates.
-- NOTE: run the corridor seed script (customs_v14_seed.sql) after this file.

-- ---------- 4. verify ----------
-- select case_type, count(*) from public.ad_cvd_cases group by case_type;
