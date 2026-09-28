-- ============================================================
-- nielcos.ai customs v3: additional duties rule table (301 / 232 / etc.)
-- Run AFTER customs_v1.sql in the shared Supabase SQL editor.
--
-- Purpose: suggest (never silently file) additional duty % based on
-- confirmed HTS + origin country. Every rule carries its legal source
-- and effective date, and the UI always asks the user to verify,
-- because 301/232/IEEPA rates change by proclamation.
-- ============================================================

create table if not exists additional_duties (
  id uuid primary key default gen_random_uuid(),
  duty_type text not null,            -- '232' | '301' | 'IEEPA' | 'reciprocal'
  hts_prefix text not null,          -- dot-stripped HTS prefix, e.g. '73' (chapter) or '950691'
  origin_country text not null default '',  -- '' = any origin
  rate numeric not null,              -- percent, applied on full entered value unless noted
  basis text not null default 'full_value',
  effective_from date,
  source text not null default '',   -- e.g. 'Proclamation 11021'
  note text not null default '',
  reference_only boolean not null default true
);

alter table additional_duties enable row level security;
drop policy if exists "additional duties read" on additional_duties;
create policy "additional duties read" on additional_duties
  for select to authenticated using (true);

-- ---- Seed: Section 232 headline rules (verified 2026-09-28) ----
-- Proclamation 11021 (2026-04-06): 50% on full entered value for articles
-- composed wholly/almost wholly of steel, aluminum or copper (Annex I-A);
-- 25% for listed derivative articles (Annex I-B, HTS-specific list —
-- the UI warns rather than auto-fills for derivatives).
-- Reduced rates exist for UK-melted metal and US-melted content;
-- Annex I-C partner-economy tiers apply from 2026-06-08.
-- ALWAYS verify against the current Federal Register / CBP guidance.

insert into additional_duties
  (duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
values
  ('232','72','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','73','',50,'full_value','2026-04-06','Proclamation 11021','Steel articles (Annex I-A), full entered value'),
  ('232','76','',50,'full_value','2026-04-06','Proclamation 11021','Aluminum articles (Annex I-A), full entered value'),
  ('232','74','',50,'full_value','2026-04-06','Proclamation 11021','Copper articles (Annex I-A), full entered value')
on conflict do nothing;
