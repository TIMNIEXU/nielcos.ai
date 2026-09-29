-- NIEL COS 合规板块 (Compliance) — 拒止方筛查 / 审计轨迹 / 法规更新
-- Run in the same Supabase project AFTER supabase/saas.sql.
-- denied_parties: global reference rows (company_id null, e.g. OFAC SDN seed)
--   plus per-company internal entries. screening_logs is append-only
--   (no update/delete policies) so every check is a permanent audit record.

-- ── 1. Watchlist ─────────────────────────────────────────────────────
create table if not exists denied_parties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aliases text[] not null default '{}',
  source text not null,                 -- 'OFAC SDN' | 'BIS Entity List' | 'internal'
  program text,                         -- sanctions program, e.g. 'CUBA', 'IRAN'
  country text,
  company_id uuid references companies(id) on delete cascade,  -- null = global
  created_at timestamptz not null default now(),
  unique (source, name)
);
create index if not exists denied_parties_company_idx on denied_parties (company_id);

alter table denied_parties enable row level security;
grant select, insert on denied_parties to authenticated;

drop policy if exists "watchlist read" on denied_parties;
create policy "watchlist read" on denied_parties
  for select to authenticated
  using (company_id is null or company_id = public.own_company_id());
drop policy if exists "watchlist add" on denied_parties;
create policy "watchlist add" on denied_parties
  for insert to authenticated
  with check (company_id is null or company_id = public.own_company_id());

-- ── 2. Screening audit log (append-only) ─────────────────────────────
create table if not exists screening_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  query_name text not null,
  query_country text,
  result text not null check (result in ('clear', 'review', 'hit')),
  matched_party_id uuid references denied_parties(id) on delete set null,
  match_detail text,
  screened_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists screening_logs_company_idx on screening_logs (company_id);
create index if not exists screening_logs_created_idx on screening_logs (created_at desc);

alter table screening_logs enable row level security;
grant select, insert on screening_logs to authenticated;

drop policy if exists "screening log read" on screening_logs;
create policy "screening log read" on screening_logs
  for select to authenticated
  using (company_id = public.own_company_id());
drop policy if exists "screening log write" on screening_logs;
create policy "screening log write" on screening_logs
  for insert to authenticated
  with check (company_id = public.own_company_id());
-- NOTE: intentionally no update/delete policies → the log is immutable.

-- ── 3. Regulatory updates bulletin ──────────────────────────────────
create table if not exists compliance_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  source text,
  effective_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (title, effective_date)
);

alter table compliance_updates enable row level security;
grant select, insert on compliance_updates to authenticated;

drop policy if exists "updates read" on compliance_updates;
create policy "updates read" on compliance_updates
  for select to authenticated using (true);
drop policy if exists "updates write" on compliance_updates;
create policy "updates write" on compliance_updates
  for insert to authenticated with check (true);

-- ── 4. Seed: verified 2026 regulatory changes ────────────────────────
insert into compliance_updates (title, body, source, effective_date)
values
  ('USTR 301 强制劳动附加税生效',
   'USTR 2026-07-23 最终行动：对 38 个经济体（含中国、越南、泰国、巴西）加征 12.5% flat 301 附加税；17 个经济体 10% flat；欧盟+台湾、 日韩瑞士适用 MFN+301 合计上限。USMCA 合格品、232 适用产品、Annex I/II 豁免等例外须人工核对。',
   'USTR final action 2026-07-23', '2026-07-24'),
  ('232 钢铝铜关税上调至 50%',
   'Proclamation 11021：钢铁、铝、铜及其衍生品的 232 条款关税上调至 50%（按整票货值计征），2026-04-06 生效。衍生品按 Annex I-B 名单逐 HTS 核对。',
   'Proclamation 11021', '2026-04-06'),
  ('MPF FY2027 新上下限',
   'CBP 公告：2026-10-01 起 MPF 最低 $34.58 / 最高 $670.86（税率 0.3464% 不变）。估算器已按日期自动切换。',
   'CBP notice Jul 2026', '2026-10-01')
on conflict do nothing;
