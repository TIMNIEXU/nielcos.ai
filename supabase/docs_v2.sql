-- Phase B: Document Intelligence — classify + extract fields from uploaded PDFs.
-- Run AFTER supabase/saas.sql in the Supabase SQL editor.

alter table documents
  add column if not exists doc_type text,
  add column if not exists extracted jsonb not null default '{}',
  add column if not exists parse_status text not null default 'pending',
  add column if not exists parsed_at timestamptz;

-- doc_type: arrival_notice | bill_of_lading | commercial_invoice | packing_list | other
-- parse_status: pending | parsed | no_text | not_pdf | failed

grant update on documents to authenticated;

drop policy if exists "tenant documents update" on documents;
create policy "tenant documents update" on documents
  for update to authenticated
  using (company_id = public.own_company_id())
  with check (company_id = public.own_company_id());
