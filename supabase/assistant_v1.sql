-- assistant_v1.sql — AI assistant: conversation threads + messages.
-- Run AFTER saas.sql (needs companies / own_company_id()).
--
-- assistant_threads: one row per conversation; context keeps last HTS /
-- origin / GTTID so follow-ups like "那越南呢？" resolve.
-- assistant_messages: role = 'user' | 'assistant'; sources is a JSONB array
-- of {label, detail} shown under each assistant reply.

create table if not exists assistant_threads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null default 'New conversation',
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assistant_threads_company_idx on assistant_threads (company_id, updated_at desc);

create table if not exists assistant_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  thread_id uuid not null references assistant_threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists assistant_messages_thread_idx on assistant_messages (thread_id, created_at);

alter table assistant_threads enable row level security;
alter table assistant_messages enable row level security;

drop policy if exists "assistant_threads tenant read" on assistant_threads;
create policy "assistant_threads tenant read" on assistant_threads
  for select using (company_id = own_company_id());
drop policy if exists "assistant_threads tenant write" on assistant_threads;
create policy "assistant_threads tenant write" on assistant_threads
  for all using (company_id = own_company_id())
  with check (company_id = own_company_id());

drop policy if exists "assistant_messages tenant read" on assistant_messages;
create policy "assistant_messages tenant read" on assistant_messages
  for select using (company_id = own_company_id());
drop policy if exists "assistant_messages tenant write" on assistant_messages;
create policy "assistant_messages tenant write" on assistant_messages
  for all using (company_id = own_company_id())
  with check (company_id = own_company_id());
