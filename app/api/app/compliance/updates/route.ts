import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* Regulatory updates bulletin — every workspace can read; the team
   posts new entries (tariff changes, CBP notices, PGA rule updates). */

async function authed() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  return { sb, userId: user.id };
}

const noAuth = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

/* GET /api/app/compliance/updates */
export async function GET() {
  const a = await authed();
  if (!a) return noAuth();
  const { data, error } = await a.sb
    .from("compliance_updates")
    .select("id, title, title_zh, body, body_zh, source, effective_date, url, auto_imported, created_at")
    .order("effective_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ updates: data ?? [] });
}

/* POST /api/app/compliance/updates { title, body?, source?, effective_date? } */
export async function POST(req: NextRequest) {
  const a = await authed();
  if (!a) return noAuth();
  let body: any = {};
  try {
    body = await req.json();
  } catch { /* fall through */ }
  const title = String(body.title ?? "").trim().slice(0, 200);
  if (!title) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { data, error } = await a.sb
    .from("compliance_updates")
    .insert({
      title,
      body: String(body.body ?? "").trim().slice(0, 5000),
      source: body.source ? String(body.source).slice(0, 200) : null,
      effective_date: body.effective_date || null,
      created_by: a.userId,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
