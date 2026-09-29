import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function scoped(sb: Awaited<ReturnType<typeof createClient>>, id: string) {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: cid } = await sb.rpc("own_company_id");
  if (!cid) return null;
  const { data: row } = await sb
    .from("finance_cost_sheets")
    .select("id")
    .eq("id", id)
    .eq("company_id", cid as string)
    .maybeSingle();
  return row ? (cid as string) : null;
}

const STATUSES = new Set(["draft", "final"]);

/* GET /api/app/finance/sheets/[id] — sheet + items. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = await createClient();
  const { id } = await params;
  const cid = await scoped(sb, id);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: sheet, error } = await sb
    .from("finance_cost_sheets")
    .select("id, gttid, title, currency, eta_date, status, notes, updated_at")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  const { data: items } = await sb
    .from("finance_cost_items")
    .select("id, category, label, amount, notes, sort")
    .eq("company_id", cid)
    .eq("sheet_id", id)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });
  return NextResponse.json({ sheet, items: items ?? [] });
}

/* PATCH /api/app/finance/sheets/[id] */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = await createClient();
  const { id } = await params;
  const cid = await scoped(sb, id);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (typeof body?.title === "string" && body.title.trim()) patch.title = body.title.trim();
  if (typeof body?.gttid === "string") patch.gttid = body.gttid.trim().toUpperCase() || null;
  if (typeof body?.currency === "string" && body.currency.trim())
    patch.currency = body.currency.trim().toUpperCase().slice(0, 3);
  if (typeof body?.eta_date === "string") patch.eta_date = body.eta_date.trim() || null;
  if (typeof body?.status === "string" && STATUSES.has(body.status.toLowerCase()))
    patch.status = body.status.toLowerCase();
  if (typeof body?.notes === "string") patch.notes = body.notes.trim() || null;

  const { error } = await sb.from("finance_cost_sheets").update(patch).eq("id", id).eq("company_id", cid);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/* DELETE /api/app/finance/sheets/[id] — items cascade. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = await createClient();
  const { id } = await params;
  const cid = await scoped(sb, id);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { error } = await sb.from("finance_cost_sheets").delete().eq("id", id).eq("company_id", cid);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
