-- compliance_v4.sql — allow the sync job to fill in Chinese translations
-- Run AFTER compliance_v3.sql.
--
-- The refresh endpoint runs as anon (cron) or as the logged-in user
-- (manual sync). Neither role has UPDATE on compliance_updates, so the
-- translation backfill was silently blocked. This SECURITY DEFINER
-- function lets either caller fill ONLY title_zh / body_zh on
-- auto-imported rows that don't have a translation yet — nothing else
-- is writable through it.

create or replace function public.fill_update_zh(p_id uuid, p_title_zh text, p_body_zh text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update compliance_updates
  set title_zh = p_title_zh,
      body_zh = p_body_zh
  where id = p_id
    and auto_imported = true
    and title_zh is null;
end;
$$;

grant execute on function public.fill_update_zh(uuid, text, text) to anon, authenticated;
