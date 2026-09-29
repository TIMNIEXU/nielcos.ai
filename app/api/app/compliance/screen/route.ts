import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { screenQuery, type WatchEntry } from "@/lib/screening";

/* Denied-party screening — session-authed; the watchlist is global
   reference data (+ the company's own internal entries); every check is
   written to the append-only screening_logs audit table. */

async function authed() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await sb.from("profiles").select("company_id").eq("id", user.id).single();
  return { sb, userId: user.id, companyId: profile?.company_id as string | undefined };
}

const noAuth = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

// In-memory watchlist cache (global reference data, refreshed every 10 min).
let cache: { at: number; rows: WatchEntry[] } | null = null;
async function watchlist(sb: any): Promise<WatchEntry[]> {
  if (cache && Date.now() - cache.at < 10 * 60 * 1000) return cache.rows;
  const { data, error } = await sb
    .from("denied_parties")
    .select("id, name, aliases, source, program")
    .limit(60000);
  if (error) throw new Error(error.message);
  cache = { at: Date.now(), rows: (data ?? []) as WatchEntry[] };
  return cache.rows;
}

/* POST /api/app/compliance/screen { name, country? } */
export async function POST(req: NextRequest) {
  const a = await authed();
  if (!a) return noAuth();
  if (!a.companyId) return NextResponse.json({ error: "no_company" }, { status: 400 });
  let body: any = {};
  try {
    body = await req.json();
  } catch { /* fall through */ }
  const name = String(body.name ?? "").trim().slice(0, 200);
  if (name.length < 3) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const country = String(body.country ?? "").trim().slice(0, 80) || null;

  let rows: WatchEntry[];
  try {
    rows = await watchlist(a.sb);
  } catch (e) {
    return NextResponse.json({ error: "db_error", detail: (e as Error).message }, { status: 500 });
  }
  const { result, matches } = screenQuery(rows, name);
  const top = matches[0] ?? null;

  const { data: log, error: logErr } = await a.sb
    .from("screening_logs")
    .insert({
      company_id: a.companyId,
      query_name: name,
      query_country: country,
      result,
      matched_party_id: top?.id ?? null,
      match_detail: top ? `${top.name} (${top.source}${top.program ? ` · ${top.program}` : ""}) score ${top.score}` : null,
      screened_by: a.userId,
    })
    .select("id, created_at")
    .single();
  if (logErr) return NextResponse.json({ error: "db_error", detail: logErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    result,
    matches: matches.map((m) => ({
      name: m.name, via: m.via, source: m.source, program: m.program, score: m.score,
    })),
    log_id: log.id,
    screened_at: log.created_at,
    watchlist_size: rows.length,
  });
}
