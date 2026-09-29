-- compliance_v3.sql — Chinese translations for regulatory updates
-- Run AFTER compliance_v1.sql and compliance_v2.sql.

alter table compliance_updates
  add column if not exists title_zh text,
  add column if not exists body_zh text;
