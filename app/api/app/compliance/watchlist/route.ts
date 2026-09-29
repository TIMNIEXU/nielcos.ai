import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* Watchlist management — global reference data (OFAC SDN seed etc.)
   readable by every signed-in workspace; companies can also add their
   own internal entries. */

async function authed() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await sb.from("profiles").select("company_id").eq("id", user.id).single();
  return { sb, companyId: profile?.company_id as string | undefined };
}

const noAuth = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

/* GET /api/app/compliance/watchlist — counts by source */
export async function GET() {
  const a = await authed();
  if (!a) return noAuth();
  const { data, error } = await a.sb.from("denied_parties").select("source");
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  const bySource: Record<string, number> = {};
  for (const r of data ?? []) bySource[r.source] = (bySource[r.source] ?? 0) + 1;
  return NextResponse.json({ total: (data ?? []).length, bySource });
}

/* POST /api/app/compliance/watchlist
   { entries: [{ name, aliases?, source, program?, country? }], companyScoped?: boolean }
   Chunked upsert — the UI posts the bundled SDN seed in batches. */
export async function POST(req: NextRequest) {
  const a = await authed();
  if (!a) return noAuth();
  let body: any = {};
  try {
    body = await req.json();
  } catch { /* fall through */ }
  const entries = Array.isArray(body.entries) ? body.entries.slice(0, 2000) : [];
  if (!entries.length) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const rows = entries
    .map((e: any) => ({
      name: String(e.name ?? "").trim().slice(0, 300),
      aliases: Array.isArray(e.aliases) ? e.aliases.map((x: any) => String(x).slice(0, 200)).slice(0, 10) : [],
      source: String(e.source ?? "internal").slice(0, 60),
      program: e.program ? String(e.program).slice(0, 60) : null,
      country: e.country ? String(e.country).slice(0, 60) : null,
      company_id: body.companyScoped && a.companyId ? a.companyId : null,
    }))
    .filter((r: any) => r.name.length >= 2);

  // upsert in sub-batches to stay under statement limits
  let upserted = 0;
  for (let i = 0; i < rows.length; i += 400) {
    const { error } = await a.sb
      .from("denied_parties")
      .upsert(rows.slice(i, i + 400), { onConflict: "source,name", ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
    upserted += Math.min(400, rows.length - i);
  }
  return NextResponse.json({ ok: true, received: upserted });
}
