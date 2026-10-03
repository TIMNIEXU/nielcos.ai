-- ============================================================
-- nielcos.ai SSO v1 — One NIEL Account (IdP tables)
-- 2026-10-03.
--
-- nielcos.ai is the identity provider. Brand sites (nielsc.com first)
-- redirect here to authenticate; we hand back a single-use ticket that
-- the client exchanges server-to-server for the user profile.
--
-- Tables:
--   sso_clients  — registered SSO clients (per-site client_id, redirect
--                  allowlist, secret SHA-256 hash). Secret plaintext is
--                  NEVER stored.
--   sso_tickets  — single-use login tickets (only the SHA-256 hash is
--                  stored; the plaintext goes in the redirect URL).
--
-- The ticket exchange runs inside exchange_sso_ticket() (SECURITY
-- DEFINER): it verifies the client secret, ticket hash, expiry, and
-- single-use, marks the ticket used, and returns the profile. The
-- Next.js token route calls it via anon key — no service-role key
-- needed anywhere.
--
-- A public view sso_clients_public exposes id/name/redirect_uris (no
-- secret hash) for the authorize endpoint.
--
-- Run in the Supabase SQL editor. Re-runnable: guarded.
-- ============================================================

-- ---------- clients ----------
create table if not exists sso_clients (
  id text primary key,                 -- e.g. 'nielsc'
  name text not null,                  -- display name, e.g. 'Niel Supply Chain'
  redirect_uris text[] not null,       -- exact-match allowlist
  secret_hash text not null,           -- SHA-256 hex of the client secret
  created_at timestamptz not null default now()
);

alter table sso_clients enable row level security;
-- no direct policies: access only via the public view + exchange function

drop view if exists sso_clients_public;
create view sso_clients_public as
  select id, name, redirect_uris from sso_clients;
grant select on sso_clients_public to anon, authenticated;

-- ---------- tickets ----------
create table if not exists sso_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_hash text not null unique,    -- SHA-256 hex of the ticket
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null references sso_clients(id) on delete cascade,
  redirect_uri text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists sso_tickets_hash_idx on sso_tickets(ticket_hash);

alter table sso_tickets enable row level security;

drop policy if exists sso_tickets_insert_own on sso_tickets;
create policy sso_tickets_insert_own on sso_tickets
  for insert to authenticated
  with check (user_id = auth.uid());
-- no select/update/delete policies: only the exchange function touches rows

-- ---------- exchange function ----------
create or replace function exchange_sso_ticket(
  p_ticket text, p_client_id text, p_client_secret text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client sso_clients%rowtype;
  v_ticket sso_tickets%rowtype;
  v_email text;
  v_name text;
begin
  if p_ticket is null or p_ticket = '' then
    raise exception 'bad_ticket';
  end if;

  select * into v_client from sso_clients where id = p_client_id;
  if v_client.id is null then
    raise exception 'unknown_client';
  end if;
  if encode(sha256(p_client_secret::bytea), 'hex') <> v_client.secret_hash then
    raise exception 'bad_client_secret';
  end if;

  select * into v_ticket from sso_tickets
    where ticket_hash = encode(sha256(p_ticket::bytea), 'hex');
  if v_ticket.id is null then
    raise exception 'bad_ticket';
  end if;
  if v_ticket.used_at is not null then
    raise exception 'ticket_reused';
  end if;
  if v_ticket.expires_at < now() then
    raise exception 'ticket_expired';
  end if;
  if v_ticket.client_id <> p_client_id then
    raise exception 'ticket_client_mismatch';
  end if;

  update sso_tickets set used_at = now() where id = v_ticket.id;

  select email, coalesce(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', '')
    into v_email, v_name
  from auth.users where id = v_ticket.user_id;

  return jsonb_build_object(
    'user', jsonb_build_object(
      'id', v_ticket.user_id,
      'email', v_email,
      'name', v_name
    )
  );
end;
$$;

-- ---------- seed: nielsc.com ----------
-- secret_hash = SHA-256 of the client secret handed to Tim in chat
-- (plaintext never committed). Redirect URI allowlist is exact-match.
insert into sso_clients (id, name, redirect_uris, secret_hash)
values (
  'nielsc',
  'Niel Supply Chain',
  array['https://www.nielsc.com/api/auth/sso/callback'],
  '2199530e6d72a056cbad1a3fd1095ee585cdb1a8430957e11be5d1d9f620e8f8'
)
on conflict (id) do update set
  name = excluded.name,
  redirect_uris = excluded.redirect_uris,
  secret_hash = excluded.secret_hash;

-- ---------- verify ----------
select id, name, redirect_uris from sso_clients_public;
