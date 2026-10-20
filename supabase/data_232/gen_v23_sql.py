#!/usr/bin/env python3
"""Generate supabase/customs_v23.sql from scope_v23.json (parsed from the
CBP Metals HTS List, CSMS #68855869 attachment). Run parse_metals_list.py
first. Output goes to ../customs_v23.sql."""
import json

rows = json.load(open("scope_v23.json"))
NEW_0608 = {"37013000", "9403200075", "9403200082", "9403999040"}
SOURCE = "CBP Metals HTS List — CSMS #68855869 attachment (2026-06-05); U.S. Note 16 to HTSUS Chapter 99"

NOTES = {
    "std50": "Section 232 metals, U.S. Note 16(c)({subdiv}) — standard heading 9903.82.02: 50% additional duty on full customs value (Proclamation 11021 regime).",
    "std25": "Section 232 metals, U.S. Note 16(c)({subdiv}) — standard heading 9903.82.09: 25% additional duty on full customs value (Proclamation 11021 regime). Derivative articles are dutiable only when they contain the listed metal.",
    "floor10": "Section 232 metals, U.S. Note 16(c)({subdiv}) — headings 9903.82.07/.08: column 1 rate + Section 232 combined floor of 10% through 2027-12-31 (additional duty = max(0, 10% - column 1 rate)). Articles qualifying under Note 16(f) (metal-intensive industrial / agricultural equipment) instead take the 15% combined floor under 9903.82.10/.11 — end-use refinement pending.",
}


def esc(s):
    return s.replace("'", "''")


lines = []
lines.append("""-- ============================================================
-- nielcos.ai customs v23: Section 232 metals SCOPE table
-- (hts_232_scope) — derivative/article membership by HTS code,
-- metal and U.S. Note 16(c) subdivision, with the standard-tier
-- resolution used by lib/additionalDuties.ts.
--
-- Why: the landed-cost estimator had NO Section 232 derivative
-- data at all — e.g. 8302.50.0000 (aluminum derivative, Note
-- 16(c)(vi)) returned no 232 line and stacked the 301-FL blanket
-- instead (37.50% vs the correct 50.00% for an aluminum article:
-- 25% List 3 + 25% 232, FL excluded at $0 via 9903.05.90).
-- additional_duties keeps the curated headline rules (chapters
-- 72/73/74/76 etc.); this table adds the HTS-specific derivative
-- scope from CBP's official Metals HTS List (CSMS #68855869
-- attachment, 2026-06-05). Membership is per metal: a code listed
-- for aluminum is NOT steel scope (8302.50.0000 is the canonical
-- example — CBP ruling NY N346991).
--
-- Tier semantics (standard origins; special origin/metal-origin
-- tiers — UK, USMCA, U.S.-metal 10%, Russia — are Phase 3):
--   std50   -> 9903.82.02, 50% on full customs value
--   std25   -> 9903.82.09, 25% on full customs value
--   floor10 -> 9903.82.07/.08, combined col.1 + 232 floor of 10%
--              through 2027-12-31 (basis 'floor10' in matcher)
-- The <=15%-metal-weight 0% treatment (9903.82.03, non-metal
-- chapters only) is resolved in the matcher from the declared
-- metal weight, not stored per row.
--
-- Run in the Supabase SQL editor, after customs_v22.sql.
-- Re-runnable: inserts are guarded by NOT EXISTS.
-- Data: supabase/data_232/metals_hts_list_2026-06.docx parsed by
-- supabase/data_232/parse_metals_list.py (scope_v23.json).
-- ============================================================

create table if not exists hts_232_scope (
  id uuid primary key default gen_random_uuid(),
  hts_prefix text not null,           -- dot-stripped HTS prefix as listed (4/6/8/10 digits)
  metal text not null,                -- 'steel' | 'aluminum' | 'copper'
  subdiv text not null,               -- U.S. Note 16(c) subdivision: i..xi
  kind text not null,                 -- 'article' | 'derivative'
  tier text not null,                 -- 'std50' | 'std25' | 'floor10'
  effective_from date,
  source text not null default '',
  note text not null default '',
  unique (hts_prefix, metal, subdiv)
);

create index if not exists hts_232_scope_prefix_idx on hts_232_scope (hts_prefix);

alter table hts_232_scope enable row level security;
drop policy if exists "hts 232 scope read" on hts_232_scope;
create policy "hts 232 scope read" on hts_232_scope
  for select to authenticated using (true);
drop policy if exists "hts 232 scope read anon" on hts_232_scope;
create policy "hts 232 scope read anon" on hts_232_scope
  for select to anon using (true);

insert into hts_232_scope
  (hts_prefix, metal, subdiv, kind, tier, effective_from, source, note)
select v.hts_prefix, v.metal, v.subdiv, v.kind, v.tier,
       v.effective_from::date, v.source, v.note
from (values""")

for r in rows:
    eff = "2026-06-08" if r["prefix"] in NEW_0608 else "2026-04-06"
    note = NOTES[r["tier"]].format(subdiv=r["subdiv"])
    lines.append(
        f"  ('{r['prefix']}','{r['metal']}','{r['subdiv']}','{r['kind']}','{r['tier']}','{eff}','{esc(SOURCE)}','{esc(note)}'),"
    )

# strip trailing comma on last values row
lines[-1] = lines[-1].rstrip(",")

lines.append(""") as v(hts_prefix, metal, subdiv, kind, tier, effective_from, source, note)
where not exists (
  select 1 from hts_232_scope s
  where s.hts_prefix = v.hts_prefix
    and s.metal = v.metal
    and s.subdiv = v.subdiv
);

-- ============================================================
-- VERIFY (after running):
-- 1) total rows — expect 742
select count(*) as scope_rows from hts_232_scope;
-- 2) counts by metal x tier — expect:
--    aluminum std50=26 std25=101 floor10=18
--    steel    std50=178 std25=270 floor10=69
--    copper   std50=76 std25=4
select metal, tier, count(*) from hts_232_scope
group by metal, tier order by metal, tier;
-- 3) the trigger case — expect one row: 83025000 / aluminum / vi / std25
select hts_prefix, metal, subdiv, kind, tier from hts_232_scope
where hts_prefix = '83025000';
-- ============================================================""")

out = "\n".join(lines) + "\n"
open("../customs_v23.sql", "w").write(out)
print("wrote ../customs_v23.sql with", len(rows), "rows,", len(out), "bytes")
