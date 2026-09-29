import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* Freight exception tickets — tenant-isolated via RLS. */

async function authed() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await sb.from("profiles").select("company_id").eq("id", user.id).single();
  return { sb, userId: user.id, companyId: profile?.company_id as string | undefined };
}

const noAuth = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

const TYPES = ["customs_hold", "demurrage_risk", "doc_missing", "schedule_delay", "damage_claim", "other"];

/* GET /api/app/freight/exceptions — list own company's tickets */
export async function GET() {
  const a = await authed();
  if (!a) return noAuth();
  const { data, error } = await a.sb
    .from("freight_exceptions")
    .select(
      "id, type, title, note, status, created_at, updated_at, resolved_at, shipment_id, shipments ( gttid, mbl_no, container_number )"
    )
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ exceptions: data ?? [] });
}

/* POST /api/app/freight/exceptions — create a ticket */
export async function POST(req: NextRequest) {
  const a = await authed();
  if (!a) return noAuth();
  if (!a.companyId) return NextResponse.json({ error: "no_company" }, { status: 400 });
  let body: any = {};
  try {
    body = await req.json();
  } catch { /* fall through */ }

  const type = String(body.type ?? "");
  const title = String(body.title ?? "").trim().slice(0, 120);
  if (!TYPES.includes(type) || !title)
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // The shipment must belong to the same company (RLS double-check).
  let shipmentId: string | null = null;
  if (body.shipment_id) {
    const { data: s } = await a.sb
      .from("shipments")
      .select("id")
      .eq("id", body.shipment_id)
      .single();
    if (!s) return NextResponse.json({ error: "shipment_not_found" }, { status: 404 });
    shipmentId = s.id;
  }

  const { data, error } = await a.sb
    .from("freight_exceptions")
    .insert({
      company_id: a.companyId,
      shipment_id: shipmentId,
      type,
      title,
      note: String(body.note ?? "").trim().slice(0, 2000),
      created_by: a.userId,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

/* PATCH /api/app/freight/exceptions — advance status / edit note */
export async function PATCH(req: NextRequest) {
  const a = await authed();
  if (!a) return noAuth();
  let body: any = {};
  try {
    body = await req.json();
  } catch { /* fall through */ }
  if (!body.id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (["open", "in_progress", "resolved"].includes(body.status)) {
    patch.status = body.status;
    patch.resolved_at = body.status === "resolved" ? new Date().toISOString() : null;
  }
  if (typeof body.note === "string") patch.note = body.note.trim().slice(0, 2000);

  const { error } = await a.sb.from("freight_exceptions").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
