import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function companyId(sb: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.rpc("own_company_id");
  return (data as string | null) ?? null;
}

/* GET /api/app/assistant/threads — list threads */
export async function GET() {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await sb
    .from("assistant_threads")
    .select("id, title, updated_at")
    .eq("company_id", cid)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ threads: data ?? [] });
}

/* POST /api/app/assistant/threads — new thread */
export async function POST() {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await sb
    .from("assistant_threads")
    .insert({ company_id: cid })
    .select("id, title, updated_at")
    .single();
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ thread: data });
}
