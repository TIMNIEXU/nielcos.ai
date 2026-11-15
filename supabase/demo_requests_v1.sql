-- Demo requests from the public contact form (/contact).
-- Run in the Supabase SQL editor (same project as the rest of the app).
-- Requires insurance_v1.sql (can_triage_insurance) — already live.
-- Idempotent: safe to re-run.
--
-- Before this file, the form was a mailto: link — the request only
-- reached sales@nielcos.ai if the visitor sent the email from their
-- own mail client, and nothing was stored anywhere. After this file
-- + the /api/public/demo-request route, submissions are stored here
-- and emailed to the operator via Resend (lib/demoNotify.ts).

create table if not exists demo_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- contact (from the public form)
  name text not null,
  company text,
  email text not null,
  message text,
  locale text,

  -- triage (workbench)
  status text not null default 'new'
    check (status in ('new', 'contacted', 'closed')),
  company_id uuid references companies(id) on delete set null
);

create index if not exists demo_requests_status_idx
  on demo_requests (status, created_at desc);

alter table demo_requests enable row level security;

-- Public demo form: anyone may insert a fresh lead. company_id/status are
-- forced by the check so the form cannot claim or pre-triage.
drop policy if exists "demo_requests public insert" on demo_requests;
create policy "demo_requests public insert" on demo_requests
  for insert to anon, authenticated
  with check (
    company_id is null
    and status = 'new'
    and char_length(name) between 1 and 120
    and char_length(coalesce(company, '')) <= 160
    and char_length(email) between 3 and 200
    and char_length(coalesce(message, '')) <= 2000
    and char_length(coalesce(locale, '')) <= 10
  );

-- Workbench read: own claimed rows; unclaimed leads ONLY for the agency
-- company. Reuses the insurance triage flag — the same operator company
-- triages demo leads, so no second flag to set.
drop policy if exists "demo_requests tenant read" on demo_requests;
create policy "demo_requests tenant read" on demo_requests
  for select to authenticated
  using (
    company_id = public.own_company_id()
    or (company_id is null and public.can_triage_insurance())
  );

-- Workbench triage: members update their company's rows; the agency may
-- claim unclaimed leads (the with-check pins company_id to their own company).
drop policy if exists "demo_requests tenant update" on demo_requests;
create policy "demo_requests tenant update" on demo_requests
  for update to authenticated
  using (
    company_id = public.own_company_id()
    or (company_id is null and public.can_triage_insurance())
  )
  with check (company_id = public.own_company_id());

grant insert on demo_requests to anon, authenticated;
grant select, update on demo_requests to authenticated;
