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
    .from("drayage_moves")
    .select("id")
    .eq("id", id)
    .eq("company_id", cid as string)
    .maybeSingle();
  return row ? (cid as string) : null;
}

const MOVE_TYPES = new Set(["pickup", "delivery", "reposition"]);
const STATUSES = new Set(["scheduled", "in_transit", "completed", "cancelled"]);

function num(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/* PATCH /api/app/logistics/moves/[id] */
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
  if (typeof body?.container_number === "string" && body.container_number.trim())
    patch.container_number = body.container_number.trim().toUpperCase();
  for (const f of ["mbl", "gttid", "origin", "destination", "carrier", "driver_name", "truck_plate", "notes"] as const) {
    if (typeof body?.[f] === "string") patch[f] = body[f].trim() || null;
  }
  if (typeof body?.move_type === "string" && MOVE_TYPES.has(body.move_type.toLowerCase()))
    patch.move_type = body.move_type.toLowerCase();
  if (typeof body?.status === "string" && STATUSES.has(body.status.toLowerCase()))
    patch.status = body.status.toLowerCase();
  for (const f of ["scheduled_date", "completed_date", "last_free_day"] as const) {
    if (typeof body?.[f] === "string") patch[f] = body[f].trim() || null;
  }
  for (const f of ["demurrage_rate", "detention_rate"] as const) {
    if (body?.[f] !== undefined) patch[f] = num(body[f]);
  }

  const { error } = await sb.from("drayage_moves").update(patch).eq("id", id).eq("company_id", cid);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/* DELETE /api/app/logistics/moves/[id] */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = await createClient();
  const { id } = await params;
  const cid = await scoped(sb, id);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { error } = await sb.from("drayage_moves").delete().eq("id", id).eq("company_id", cid);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
