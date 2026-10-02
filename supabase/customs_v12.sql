-- ============================================================
-- nielcos.ai customs v12: USTR 2024 Section 301 four-year review —
-- steel & aluminum increase to 25% (9903.91.01)
--
-- The 2024 review raised Section 301 on steel/aluminum products from
-- 0%/7.5% (Lists 1/2/3/4A) to a flat 25%. It REPLACES the earlier
-- list rate on the same goods (same duty_type, later effective_from
-- wins in lib/additionalDuties.ts) and STACKS with Section 232.
-- Scope: headings 72 (iron/steel), 73 (articles of iron/steel),
-- 76 (aluminum) — the chapters the 2024 steel/aluminum action covers.
--
-- Run AFTER customs_v11.sql in the Supabase SQL editor, once.
-- Re-runnable: every INSERT is guarded by NOT EXISTS.
-- ============================================================

-- VERIFY (before)
select duty_type, count(*) from additional_duties
where duty_type = '301-CN' and hts_prefix in ('72','73','76')
group by duty_type;

insert into additional_duties
  (duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
select '301-CN', v.hts_prefix, 'CHINA', 25, 'full_value', '2024-09-27',
  'USTR 2024 Section 301 four-year review — steel/aluminum increase to 25% (9903.91.01)',
  '2024 Section 301 review: steel & aluminum products raised to a flat 25% (9903.91.01). Replaces the earlier List 1/2/3/4A rate on the same goods; stacks with Section 232. Verify subheading coverage with a licensed broker before filing.'
from (values ('72'), ('73'), ('76')) as v(hts_prefix)
where not exists (
  select 1 from additional_duties d
  where d.duty_type = '301-CN'
    and d.hts_prefix = v.hts_prefix
    and d.origin_country = 'CHINA'
    and d.effective_from = '2024-09-27'
);

-- VERIFY (after): expect 3 rows
select duty_type, hts_prefix, origin_country, rate, effective_from
from additional_duties
where duty_type = '301-CN' and hts_prefix in ('72','73','76')
order by hts_prefix;
