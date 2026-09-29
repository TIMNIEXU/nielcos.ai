import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FIELDS =
  "id, warehouse_name, address, appt_at, appt_type, container_number, reference, status, notes, updated_at";

async function companyId(sb: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.rpc("own_company_id");
  return (data as string | null) ?? null;
}

const APPT_TYPES = new Set(["inbound", "outbound"]);
const STATUSES = new Set(["scheduled", "confirmed", "completed", "cancelled", "missed"]);

/* GET /api/app/logistics/appts?q= */
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  let query = sb
    .from("warehouse_appts")
    .select(FIELDS)
    .eq("company_id", cid)
    .order("appt_at", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(500);
  if (q) query = query.or(`warehouse_name.ilike.%${q}%,container_number.ilike.%${q}%,reference.ilike.%${q}%`);
  const { data: rows, error } = await query;
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ appts: rows ?? [] });
}

/* POST /api/app/logistics/appts — { warehouse_name*, ... } */
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const name = String(body?.warehouse_name ?? "").trim();
  if (!name) return NextResponse.json({ error: "warehouse_required" }, { status: 400 });

  const apptType = APPT_TYPES.has(String(body?.appt_type ?? "").toLowerCase())
    ? String(body.appt_type).toLowerCase() : "inbound";
  const status = STATUSES.has(String(body?.status ?? "").toLowerCase())
    ? String(body.status).toLowerCase() : "scheduled";

  const { data, error } = await sb
    .from("warehouse_appts")
    .insert({
      company_id: cid,
      warehouse_name: name,
      address: body?.address?.trim() || null,
      appt_at: body?.appt_at?.trim() || null,
      appt_type: apptType,
      container_number: body?.container_number?.trim()?.toUpperCase() || null,
      reference: body?.reference?.trim() || null,
      status,
      notes: body?.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
