-- NIEL GROUP DIGITAL COMMERCE LOOP v1.0 — Global Trade Case (GTTID) as the
-- transaction spine.
--
-- Canonical model: Customer/Tenant → Trade Transaction (GTTID) → multiple
-- Service Orders (SO-xxxxxx). One GTTID connects every order, shipment,
-- entry, document and payment of a trade.
--
-- What it does:
--   trades.gttid            canonical public case ID (NIEL-2026-000123,
--                           via next_gttid()); backfilled for existing rows
--   trades.source_case_id   the nielsc.com Supply Chain Case (SC-2026-XXXXX)
--                           this trade was born from; one SC case → one trade
--   service_orders.gttid    already exists — now always the trade's gttid,
--                           never a per-SO mint (see quotes won flow)
--
-- Guarded / re-runnable. Run in Supabase SQL editor as owner,
-- AFTER supabase/trades.sql and supabase/saas.sql.

-- ============ VERIFY (before) ============
-- select column_name from information_schema.columns
--  where table_name = 'trades' and column_name in ('gttid','source_case_id');
-- (zero rows before, two rows after)

-- ============ MERGE ============
alter table public.trades
  add column if not exists gttid text unique;

alter table public.trades
  add column if not exists source_case_id text;

create index if not exists trades_gttid_idx
  on public.trades (gttid);

create index if not exists trades_source_case_idx
  on public.trades (source_case_id);

-- Backfill: every existing trade gets a canonical GTTID.
do $$
declare r record;
begin
  for r in select id from public.trades where gttid is null loop
    update public.trades
       set gttid = public.next_gttid(),
           updated_at = now()
     where id = r.id;
  end loop;
end $$;

-- ============ VERIFY (after) ============
-- select count(*) as total, count(gttid) as with_gttid from public.trades;
-- expect total = with_gttid
-- select gttid, trade_no from public.trades limit 5;
