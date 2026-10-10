-- 删除 triage 测试单：service_quotes + service_orders（SO-000001–000006）
-- 执行人：Tim（Supabase SQL Editor）
-- 顺序：先 SELECT 核对 → 再 DELETE；先删 service_orders，再删 service_quotes

-- ============ STEP 1: 核对（只看不删） ============
-- 测试询价单
SELECT id, service, name, email, status, created_at
FROM public.service_quotes
WHERE email IN ('test@nielsc.com', 'test@nielcos.ai')
ORDER BY created_at;
-- 期望：6 条（2 条 Muse E2E Test + 4 条 Muse Test），status 都是 new

-- 关联的测试 SO
SELECT so_no, service_type, status, created_at, quote_id
FROM public.service_orders
WHERE quote_id IN (
  SELECT id FROM public.service_quotes
  WHERE email IN ('test@nielsc.com', 'test@nielcos.ai')
)
ORDER BY so_no;
-- 期望：SO-000001 ~ SO-000006

-- 兜底检查：有没有 quote_id 为空但 so_no 是测试号的孤儿单
SELECT so_no, service_type, status, created_at
FROM public.service_orders
WHERE so_no IN ('SO-000001','SO-000002','SO-000003','SO-000004','SO-000005','SO-000006')
  AND quote_id IS NULL;

-- ============ STEP 2: 删除（核对无误后再跑） ============
-- 先删 service_orders（quote_id 是 ON DELETE SET NULL，顺序不影响 FK，但逻辑上先删子表）
DELETE FROM public.service_orders
WHERE quote_id IN (
  SELECT id FROM public.service_quotes
  WHERE email IN ('test@nielsc.com', 'test@nielcos.ai')
);
-- 再删 service_quotes
DELETE FROM public.service_quotes
WHERE email IN ('test@nielsc.com', 'test@nielcos.ai');

-- ============ STEP 3: 确认删干净 ============
SELECT count(*) AS quotes_left FROM public.service_quotes
WHERE email IN ('test@nielsc.com', 'test@nielcos.ai');
-- 期望：0
SELECT count(*) AS orders_left FROM public.service_orders
WHERE so_no IN ('SO-000001','SO-000002','SO-000003','SO-000004','SO-000005','SO-000006');
-- 期望：0
