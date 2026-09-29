-- Compliance v2: 法规更新自动同步联邦公报 (Federal Register)
-- 为 compliance_updates 加原文链接 + 自动同步标记，用于去重。

alter table compliance_updates
  add column if not exists url text,
  add column if not exists auto_imported boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_indexes where indexname = 'compliance_updates_url_uidx'
  ) then
    create unique index compliance_updates_url_uidx on compliance_updates (url);
  end if;
end $$;
