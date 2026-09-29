import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CATS = new Set(["goods", "freight", "insurance", "duty", "drayage", "warehouse", "demurrage", "other"]);

async function itemOf(sb: Awaited<ReturnType<typeof createClient>>, itemId: string) {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: cid } = await sb.rpc("own_company_id");
  if (!cid) return null;
  const { data: row } = await sb
    .from("finance_cost_items")
    .select("id, sheet_id")
    .eq("id", itemId)
    .eq("company_id", cid as string)
    .maybeSingle();
  return row ? { cid: cid as string, sheetId: row.sheet_id as string } : null;
}

/* PATCH /api/app/finance/items/[itemId] */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const sb = await createClient();
  const { itemId } = await params;
  const found = await itemOf(sb, itemId);
  if (!found) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const patch: Record<string, any> = {};
  if (typeof body?.category === "string" && CATS.has(body.category.toLowerCase()))
    patch.category = body.category.toLowerCase();
  if (typeof body?.label === "string") patch.label = body.label.trim() || null;
  if (body?.amount !== undefined) {
    const n = Number(body.amount);
    if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "amount_invalid" }, { status: 400 });
    patch.amount = Math.round(n * 100) / 100;
  }
  if (typeof body?.notes === "string") patch.notes = body.notes.trim() || null;

  const { error } = await sb.from("finance_cost_items").update(patch).eq("id", itemId);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  await sb.from("finance_cost_sheets").update({ updated_at: new Date().toISOString() }).eq("id", found.sheetId);
  return NextResponse.json({ ok: true });
}

/* DELETE /api/app/finance/items/[itemId] */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const sb = await createClient();
  const { itemId } = await params;
  const found = await itemOf(sb, itemId);
  if (!found) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { error } = await sb.from("finance_cost_items").delete().eq("id", itemId);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  await sb.from("finance_cost_sheets").update({ updated_at: new Date().toISOString() }).eq("id", found.sheetId);
  return NextResponse.json({ ok: true });
}
