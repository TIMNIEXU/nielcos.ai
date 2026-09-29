-- docs_v3.sql — Document versioning + one-click sharing
-- Run AFTER supabase/docs_v2.sql in the Supabase SQL editor.
--
-- Version model: every logical document is a group of rows sharing group_id.
-- The first upload sets group_id = its own id; later uploads reuse the group
-- with version_no + 1 and flip the older rows to is_current = false.
-- Sharing: share_token on a row makes that version publicly readable via the
-- token link (metadata + AI-extracted fields only; the file itself stays
-- behind login in the private shipment-docs bucket).

alter table documents
  add column if not exists group_id uuid,
  add column if not exists version_no int not null default 1,
  add column if not exists is_current boolean not null default true,
  add column if not exists share_token text,
  add column if not exists share_expires_at timestamptz;

-- Existing rows: each becomes a single-version group.
update documents set group_id = id where group_id is null;

do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'documents_group_idx') then
    create index documents_group_idx on documents (group_id);
  end if;
  if not exists (select 1 from pg_indexes where indexname = 'documents_share_token_uidx') then
    create unique index documents_share_token_uidx on documents (share_token);
  end if;
end $$;

-- Public read: only rows with an active (unexpired) share token.
grant select on documents to anon;

drop policy if exists "share link read" on documents;
create policy "share link read" on documents
  for select to anon
  using (
    share_token is not null
    and (share_expires_at is null or share_expires_at > now())
  );

-- The share page shows which shipment (GTTID) the document is pinned to.
-- Anon cannot read shipments directly, so this definer function exposes
-- only the GTTID of the shipment linked to an active share token.
create or replace function public.shared_doc_gttid(p_token text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select s.gttid
  from documents d
  join shipments s on s.id = d.shipment_id
  where d.share_token = p_token
    and (d.share_expires_at is null or d.share_expires_at > now())
  limit 1;
$$;

grant execute on function public.shared_doc_gttid(text) to anon;
