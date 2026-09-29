import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const CATS = new Set(["goods", "freight", "insurance", "duty", "drayage", "warehouse", "demurrage", "other"]);

async function sheetOf(sb: Awaited<ReturnType<typeof createClient>>, id: string) {
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

/* POST /api/app/finance/sheets/[id]/items — { category, label, amount, notes } */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = await createClient();
  const { id } = await params;
  const cid = await sheetOf(sb, id);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const category = CATS.has(String(body?.category ?? "").toLowerCase())
    ? String(body.category).toLowerCase() : "other";
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount < 0)
    return NextResponse.json({ error: "amount_invalid" }, { status: 400 });

  const { data: maxSort } = await sb
    .from("finance_cost_items")
    .select("sort")
    .eq("sheet_id", id)
    .order("sort", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await sb
    .from("finance_cost_items")
    .insert({
      company_id: cid,
      sheet_id: id,
      category,
      label: body?.label?.trim() || null,
      amount: Math.round(amount * 100) / 100,
      notes: body?.notes?.trim() || null,
      sort: (maxSort?.sort ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });

  await sb.from("finance_cost_sheets").update({ updated_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ id: data.id });
}
