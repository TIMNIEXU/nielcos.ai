import { createClient } from "@/lib/supabase/server";
import type { WatchEntry } from "@/lib/adcvd";

/* Fetch the AD/CVD watchlist. Falls back to the base column set when the
   v13 enrichment columns have not been applied yet, so deploys never 500
   in the window before the SQL is run. */
const FULL_COLS =
  "product_keyword, hts_prefix, origin, case_type, status, note, case_numbers, scope_summary, exclusions, last_verified";
const BASE_COLS = "product_keyword, hts_prefix, origin, case_type, status, note";

export async function fetchWatchEntries(limit = 200): Promise<WatchEntry[]> {
  const sb = await createClient();
  let { data, error } = await sb.from("ad_cvd_watch").select(FULL_COLS).limit(limit);
  if (error) {
    const fb = await sb.from("ad_cvd_watch").select(BASE_COLS).limit(limit);
    if (fb.error) throw new Error("db_error");
    data = (fb.data ?? []).map((r) => ({
      ...r,
      case_numbers: null,
      scope_summary: null,
      exclusions: null,
      last_verified: null,
    }));
  }
  return (data ?? []) as WatchEntry[];
}
