import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* HTS review decisions — audit trail for adopted/rejected HTS suggestions.
   Table hts_review_decisions is created by E-track's trades.sql; until it
   exists this route degrades to { pending: true } instead of crashing. */

async function scoped() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: cid } = await sb.rpc("own_company_id");
  if (!cid) return null;
  return { sb, cid: cid as string, reviewer: user.email ?? "" };
}

const isMissingTable = (e: any) => e?.code === "42P01";

/* GET /api/app/customs/hts-reviews?hts=9403.60.80&origin=CHINA
   -> { decision: {...} | null, pending?: true } */
export async function GET(req: NextRequest) {
  const sc = await scoped();
  if (!sc) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const hts = (q.get("hts") ?? "").trim();
  const origin = (q.get("origin") ?? "").trim();
  if (!hts) return NextResponse.json({ decision: null });

  const { data, error } = await sc.sb
    .from("hts_review_decisions")
    .select("hts, origin_country, decision, note, reviewer, created_at")
    .eq("company_id", sc.cid)
    .eq("hts", hts)
    .eq("origin_country", origin)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ decision: null, pending: true });
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  return NextResponse.json({ decision: data ?? null });
}

/* POST /api/app/customs/hts-reviews
   { hts, origin_country, decision: 'adopted'|'rejected', note }
   -> { ok: true } | 503 { error: 'migration_pending' } */
export async function POST(req: NextRequest) {
  const sc = await scoped();
  if (!sc) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const hts = String(body?.hts ?? "").trim();
  const origin_country = String(body?.origin_country ?? "").trim();
  const decision = String(body?.decision ?? "");
  const note = String(body?.note ?? "").trim().slice(0, 500);
  if (!hts || !["adopted", "rejected"].includes(decision)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { error } = await sc.sb.from("hts_review_decisions").insert({
    company_id: sc.cid,
    hts,
    origin_country,
    decision,
    note: note || null,
    reviewer: sc.reviewer,
  });
  if (error) {
    if (isMissingTable(error)) {
      return NextResponse.json({ error: "migration_pending" }, { status: 503 });
    }
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
