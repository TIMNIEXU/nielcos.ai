-- Customs Phase 1b: document import support.
-- Run once in the Supabase SQL editor.

alter table entry_lines
  add column if not exists material text not null default '',
  add column if not exists origin_country text not null default '',
  add column if not exists hts_source text;  -- 'imported' | 'suggested' | 'manual'
