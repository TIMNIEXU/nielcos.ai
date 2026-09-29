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

-- Vercel Cron 调用同步接口时没有用户会话（anon 角色），只允许它写入
-- 联邦公报来源的行；匿名读取也只限自动同步的行，手动发布的内部更新
-- 仍只有登录用户可见。
grant insert, select on compliance_updates to anon;

drop policy if exists "auto sync insert" on compliance_updates;
create policy "auto sync insert" on compliance_updates
  for insert to anon
  with check (
    auto_imported = true
    and url like 'https://www.federalregister.gov/documents/%'
  );

drop policy if exists "auto sync read" on compliance_updates;
create policy "auto sync read" on compliance_updates
  for select to anon
  using (auto_imported = true);
