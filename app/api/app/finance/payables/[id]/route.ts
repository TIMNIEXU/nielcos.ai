import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CATS = new Set(["duty", "freight", "drayage", "warehouse", "supplier", "other"]);
const STATUSES = new Set(["pending", "paid", "cancelled"]);

async function scoped(sb: Awaited<ReturnType<typeof createClient>>, id: string) {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: cid } = await sb.rpc("own_company_id");
  if (!cid) return null;
  const { data: row } = await sb
    .from("finance_payables")
    .select("id")
    .eq("id", id)
    .eq("company_id", cid as string)
    .maybeSingle();
  return row ? (cid as string) : null;
}

/* PATCH /api/app/finance/payables/[id] */
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
  if (typeof body?.payee === "string" && body.payee.trim()) patch.payee = body.payee.trim();
  if (typeof body?.category === "string" && CATS.has(body.category.toLowerCase()))
    patch.category = body.category.toLowerCase();
  if (body?.amount !== undefined) {
    const n = Number(body.amount);
    if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "amount_invalid" }, { status: 400 });
    patch.amount = Math.round(n * 100) / 100;
  }
  if (typeof body?.currency === "string" && body.currency.trim())
    patch.currency = body.currency.trim().toUpperCase().slice(0, 3);
  if (typeof body?.due_date === "string") patch.due_date = body.due_date.trim() || null;
  if (typeof body?.gttid === "string") patch.gttid = body.gttid.trim().toUpperCase() || null;
  if (typeof body?.status === "string" && STATUSES.has(body.status.toLowerCase())) {
    patch.status = body.status.toLowerCase();
    if (patch.status === "paid" && !body?.paid_date)
      patch.paid_date = new Date().toISOString().slice(0, 10);
  }
  if (typeof body?.paid_date === "string") patch.paid_date = body.paid_date.trim() || null;
  if (typeof body?.notes === "string") patch.notes = body.notes.trim() || null;

  const { error } = await sb.from("finance_payables").update(patch).eq("id", id).eq("company_id", cid);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/* DELETE /api/app/finance/payables/[id] */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = await createClient();
  const { id } = await params;
  const cid = await scoped(sb, id);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { error } = await sb.from("finance_payables").delete().eq("id", id).eq("company_id", cid);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
