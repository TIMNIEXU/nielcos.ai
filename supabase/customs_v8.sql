-- ============================================================
-- nielcos.ai customs v8: two tariff-accuracy fixes (2026-09-30).
--
-- FIX 1 — classic Section 301 List 4A on 9506.91.00 (8-digit).
-- A live estimate for 9506.91.00.30 / China / $10,000 ocean came out at
-- 17.10% (MFN 4.6% + 301-FL 12.5%) while Flexport Tariff Simulator shows
-- 24.60% — the missing 7.5% is List 4A (9903.88.15). Root cause: v7 only
-- seeded the 10-digit row 9506.91.0010, so the .00.30 suffix had no
-- classic-301 rule and the engine silently under-reported.
-- Evidence that List 4A covers the whole 9506.91.00 subheading:
--   (a) CBP ruling NY N321348 — 9506.91.0010 at 7.5% List 4A;
--   (b) Flexport Tariff Simulator — 9506.91.00.30 at 7.5% (9903.88.15).
-- USTR lists are published at 8-digit level, so an 8-digit rule is the
-- correct shape here. The existing 10-digit 9506910010 row stays
-- (longest-prefix wins, same rate — harmless).
--
-- FIX 2 — show the real 9903.05.xx provision code on every 301-FL
-- (forced-labor) line, e.g. 9903.05.31 for China instead of "—".
-- Every code below was read from OUR OWN USITC HTS 2026 Rev 19 library
-- (customs_hts_full_p4.sql): description "articles the product of
-- <country>" + rate text "+10%" / "+12.5%" matching the row's rate.
-- Countries where our rule rate does NOT match the USITC rate text are
-- deliberately SKIPPED (not papered over): TAIWAN (we have 10%, USITC
-- 9903.05.76 says +12.5%), JAPAN (we have 12.5%, USITC 9903.05.49 says
-- +10%), SOUTH KOREA (we have 12.5%, USITC 9903.05.71 says +10%),
-- SWITZERLAND (we have 12.5%, USITC 9903.05.74 rate needs review).
-- Those four need a data decision before their codes go on.
--
-- Run AFTER customs_v7.sql in the Supabase SQL editor, once.
-- Re-runnable: guarded by NOT EXISTS / NOT LIKE.
-- ============================================================

-- VERIFY (before): expect the 10-digit 9506910010 row, no 8-digit rule
select duty_type, hts_prefix, origin_country, rate
from additional_duties
where duty_type = '301-CN' and hts_prefix like '950691%'
order by hts_prefix;

-- 1) List 4A 7.5% at the 8-digit level for 9506.91.00
insert into additional_duties
  (duty_type, hts_prefix, origin_country, rate, basis, effective_from, source, note)
select '301-CN','95069100','CHINA',7.5,'full_value','2020-02-14',
  'CBP ruling NY N321348 (9506.91.0010); Flexport Tariff Simulator cross-check (9506.91.00.30); USTR Section 301 List 4A (9903.88.15)',
  'Sports equipment 9506.91.00 — List 4A 7.5% (9903.88.15). Confirmed on two statistical suffixes (.0010 via CBP ruling, .00.30 via Flexport); List 4A is published at 8-digit level.'
where not exists (
  select 1 from additional_duties
  where duty_type = '301-CN' and hts_prefix = '95069100' and origin_country = 'CHINA'
);

-- 2) 9903.05.xx codes on 301-FL notes (verified against USITC 2026 Rev 19)
update additional_duties set note = note || ' (9903.05.20)'
where duty_type = '301-FL' and origin_country = 'ALGERIA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.21)'
where duty_type = '301-FL' and origin_country = 'ANGOLA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.22)'
where duty_type = '301-FL' and origin_country = 'ARGENTINA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.23)'
where duty_type = '301-FL' and origin_country = 'AUSTRALIA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'AUSTRIA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.24)'
where duty_type = '301-FL' and origin_country = 'BAHAMAS' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.25)'
where duty_type = '301-FL' and origin_country = 'BAHRAIN' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.26)'
where duty_type = '301-FL' and origin_country = 'BANGLADESH' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'BELGIUM' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.01)'
where duty_type = '301-FL' and origin_country = 'BRAZIL' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'BULGARIA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.28)'
where duty_type = '301-FL' and origin_country = 'CAMBODIA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.29)'
where duty_type = '301-FL' and origin_country = 'CANADA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.30)'
where duty_type = '301-FL' and origin_country = 'CHILE' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.31)'
where duty_type = '301-FL' and origin_country = 'CHINA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.32)'
where duty_type = '301-FL' and origin_country = 'COLOMBIA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.33)'
where duty_type = '301-FL' and origin_country = 'COSTA RICA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'CROATIA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'CYPRUS' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'CZECH REPUBLIC' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'DENMARK' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.34)'
where duty_type = '301-FL' and origin_country = 'DOMINICAN REPUBLIC' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.35)'
where duty_type = '301-FL' and origin_country = 'ECUADOR' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.36)'
where duty_type = '301-FL' and origin_country = 'EGYPT' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.37)'
where duty_type = '301-FL' and origin_country = 'EL SALVADOR' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'ESTONIA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'FINLAND' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'FRANCE' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'GERMANY' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'GREECE' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.40)'
where duty_type = '301-FL' and origin_country = 'GUATEMALA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.41)'
where duty_type = '301-FL' and origin_country = 'GUYANA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.42)'
where duty_type = '301-FL' and origin_country = 'HONDURAS' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.43)'
where duty_type = '301-FL' and origin_country = 'HONG KONG' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'HUNGARY' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.44)'
where duty_type = '301-FL' and origin_country = 'INDIA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.45)'
where duty_type = '301-FL' and origin_country = 'INDONESIA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.46)'
where duty_type = '301-FL' and origin_country = 'IRAQ' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'IRELAND' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.47)'
where duty_type = '301-FL' and origin_country = 'ISRAEL' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'ITALY' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.50)'
where duty_type = '301-FL' and origin_country = 'JORDAN' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.51)'
where duty_type = '301-FL' and origin_country = 'KAZAKHSTAN' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.52)'
where duty_type = '301-FL' and origin_country = 'KUWAIT' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'LATVIA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.53)'
where duty_type = '301-FL' and origin_country = 'LIBYA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'LITHUANIA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'LUXEMBOURG' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.54)'
where duty_type = '301-FL' and origin_country = 'MALAYSIA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'MALTA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.55)'
where duty_type = '301-FL' and origin_country = 'MEXICO' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.56)'
where duty_type = '301-FL' and origin_country = 'MOROCCO' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'NETHERLANDS' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.57)'
where duty_type = '301-FL' and origin_country = 'NEW ZEALAND' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.58)'
where duty_type = '301-FL' and origin_country = 'NICARAGUA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.59)'
where duty_type = '301-FL' and origin_country = 'NIGERIA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.60)'
where duty_type = '301-FL' and origin_country = 'NORWAY' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.61)'
where duty_type = '301-FL' and origin_country = 'OMAN' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.62)'
where duty_type = '301-FL' and origin_country = 'PAKISTAN' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.63)'
where duty_type = '301-FL' and origin_country = 'PERU' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.64)'
where duty_type = '301-FL' and origin_country = 'PHILIPPINES' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'POLAND' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'PORTUGAL' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.65)'
where duty_type = '301-FL' and origin_country = 'QATAR' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'ROMANIA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.66)'
where duty_type = '301-FL' and origin_country = 'RUSSIA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.67)'
where duty_type = '301-FL' and origin_country = 'SAUDI ARABIA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.68)'
where duty_type = '301-FL' and origin_country = 'SINGAPORE' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'SLOVAKIA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'SLOVENIA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.69)'
where duty_type = '301-FL' and origin_country = 'SOUTH AFRICA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'SPAIN' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.72)'
where duty_type = '301-FL' and origin_country = 'SRI LANKA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.39)'
where duty_type = '301-FL' and origin_country = 'SWEDEN' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.77)'
where duty_type = '301-FL' and origin_country = 'THAILAND' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.78)'
where duty_type = '301-FL' and origin_country = 'TRINIDAD AND TOBAGO' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.79)'
where duty_type = '301-FL' and origin_country = 'TURKEY' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.80)'
where duty_type = '301-FL' and origin_country = 'UNITED ARAB EMIRATES' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.81)'
where duty_type = '301-FL' and origin_country = 'UNITED KINGDOM' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.82)'
where duty_type = '301-FL' and origin_country = 'URUGUAY' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.83)'
where duty_type = '301-FL' and origin_country = 'VENEZUELA' and note not like '%9903.05%';
update additional_duties set note = note || ' (9903.05.84)'
where duty_type = '301-FL' and origin_country = 'VIETNAM' and note not like '%9903.05%';
-- VERIFY (after)
select duty_type, hts_prefix, origin_country, rate from additional_duties where duty_type = '301-CN' order by hts_prefix;
select duty_type, origin_country, rate, right(note, 14) as note_tail from additional_duties where duty_type = '301-FL' order by origin_country;
