-- insurance_quotes 删除权限：配合 /api/app/insurance/quotes DELETE 使用
-- 执行人：Tim（Supabase SQL Editor）
-- 背景：insurance_quotes 之前只有 select/update 授权，没有 delete；
--       前端"删除"按钮调 DELETE API 会被 RLS/grant 拦下，跑完这条才生效。

-- RLS：允许本公司删除自己的询价单；有 triage 权限的可删未认领线索
drop policy if exists "insurance_quotes tenant delete" on insurance_quotes;
create policy "insurance_quotes tenant delete" on insurance_quotes
  for delete to authenticated
  using (
    company_id = public.own_company_id()
    or (company_id is null and public.can_triage_insurance())
  );

grant delete on insurance_quotes to authenticated;

-- 验证（期望：1 条 policy，grant 含 DELETE）
select policyname, cmd from pg_policies
where tablename = 'insurance_quotes' and cmd = 'DELETE';
select grantee, privilege_type from information_schema.role_table_grants
where table_name = 'insurance_quotes' and grantee = 'authenticated';
