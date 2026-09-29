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
    .from("warehouse_appts")
    .select("id")
    .eq("id", id)
    .eq("company_id", cid as string)
    .maybeSingle();
  return row ? (cid as string) : null;
}

const APPT_TYPES = new Set(["inbound", "outbound"]);
const STATUSES = new Set(["scheduled", "confirmed", "completed", "cancelled", "missed"]);

/* PATCH /api/app/logistics/appts/[id] */
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
  if (typeof body?.warehouse_name === "string" && body.warehouse_name.trim())
    patch.warehouse_name = body.warehouse_name.trim();
  for (const f of ["address", "reference", "notes"] as const) {
    if (typeof body?.[f] === "string") patch[f] = body[f].trim() || null;
  }
  if (typeof body?.container_number === "string")
    patch.container_number = body.container_number.trim().toUpperCase() || null;
  if (typeof body?.appt_at === "string") patch.appt_at = body.appt_at.trim() || null;
  if (typeof body?.appt_type === "string" && APPT_TYPES.has(body.appt_type.toLowerCase()))
    patch.appt_type = body.appt_type.toLowerCase();
  if (typeof body?.status === "string" && STATUSES.has(body.status.toLowerCase()))
    patch.status = body.status.toLowerCase();

  const { error } = await sb.from("warehouse_appts").update(patch).eq("id", id).eq("company_id", cid);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/* DELETE /api/app/logistics/appts/[id] */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = await createClient();
  const { id } = await params;
  const cid = await scoped(sb, id);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { error } = await sb.from("warehouse_appts").delete().eq("id", id).eq("company_id", cid);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
