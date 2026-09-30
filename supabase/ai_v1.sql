-- GRI-001 V2 — AI plumbing tables.
-- ai_usage: DB-backed rate limiting for public AI endpoints (per IP hash + endpoint + window).
-- ai_import_plans: archive of Universal Import Box plans (analytics + abuse review).
-- Guarded / re-runnable. Run in Supabase SQL editor.

-- ============ VERIFY ============
-- select table_name from information_schema.tables where table_name in ('ai_usage','ai_import_plans');

-- ============ MERGE ============
create table if not exists public.ai_usage (
  id         bigint generated always as identity primary key,
  endpoint   text not null,
  ip_hash    text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_ip_endpoint_time
  on public.ai_usage (ip_hash, endpoint, created_at desc);

create table if not exists public.ai_import_plans (
  id         uuid primary key default gen_random_uuid(),
  input_text text,
  locale     text,
  plan       jsonb not null,
  ip_hash    text,
  created_at timestamptz not null default now()
);
create index if not exists ai_import_plans_created
  on public.ai_import_plans (created_at desc);

alter table public.ai_usage enable row level security;
alter table public.ai_import_plans enable row level security;
-- No public policies: both tables are touched only through the
-- SECURITY DEFINER functions below (server-side), never from the client.

-- Atomic check-and-log: returns false when the caller is over the limit.
create or replace function public.ai_check_rate(
  p_ip_hash text, p_endpoint text, p_limit int, p_window_minutes int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.ai_usage
  where ip_hash = p_ip_hash
    and endpoint = p_endpoint
    and created_at > now() - make_interval(mins => p_window_minutes);
  if v_count >= p_limit then
    return false;
  end if;
  insert into public.ai_usage (endpoint, ip_hash) values (p_endpoint, p_ip_hash);
  return true;
end;
$$;

-- Archive one import plan; returns its id. Best-effort from the API route.
create or replace function public.ai_save_plan(
  p_input text, p_locale text, p_plan jsonb, p_ip_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.ai_import_plans (input_text, locale, plan, ip_hash)
  values (p_input, p_locale, p_plan, p_ip_hash)
  returning id into v_id;
  return v_id;
end;
$$;
