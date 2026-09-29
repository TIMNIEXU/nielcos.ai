import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FIELDS =
  "id, container_number, mbl, gttid, move_type, origin, destination, carrier, driver_name, truck_plate, scheduled_date, completed_date, status, last_free_day, demurrage_rate, detention_rate, notes, updated_at";

async function companyId(sb: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.rpc("own_company_id");
  return (data as string | null) ?? null;
}

const MOVE_TYPES = new Set(["pickup", "delivery", "reposition"]);
const STATUSES = new Set(["scheduled", "in_transit", "completed", "cancelled"]);

function num(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/* GET /api/app/logistics/moves?q= — the company's drayage moves. */
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  let query = sb
    .from("drayage_moves")
    .select(FIELDS)
    .eq("company_id", cid)
    .order("scheduled_date", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(500);
  if (q)
    query = query.or(
      `container_number.ilike.%${q}%,mbl.ilike.%${q}%,carrier.ilike.%${q}%,driver_name.ilike.%${q}%,gttid.ilike.%${q}%`
    );
  const { data: rows, error } = await query;
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ moves: rows ?? [] });
}

/* POST /api/app/logistics/moves — create a move. { container_number*, ... } */
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
  const container = String(body?.container_number ?? "").trim().toUpperCase();
  if (!container) return NextResponse.json({ error: "container_required" }, { status: 400 });

  const moveType = MOVE_TYPES.has(String(body?.move_type ?? "").toLowerCase())
    ? String(body.move_type).toLowerCase()
    : "delivery";
  const status = STATUSES.has(String(body?.status ?? "").toLowerCase())
    ? String(body.status).toLowerCase()
    : "scheduled";

  const { data, error } = await sb
    .from("drayage_moves")
    .insert({
      company_id: cid,
      container_number: container,
      mbl: body?.mbl?.trim() || null,
      gttid: body?.gttid?.trim() || null,
      move_type: moveType,
      origin: body?.origin?.trim() || null,
      destination: body?.destination?.trim() || null,
      carrier: body?.carrier?.trim() || null,
      driver_name: body?.driver_name?.trim() || null,
      truck_plate: body?.truck_plate?.trim() || null,
      scheduled_date: body?.scheduled_date?.trim() || null,
      completed_date: body?.completed_date?.trim() || null,
      status,
      last_free_day: body?.last_free_day?.trim() || null,
      demurrage_rate: num(body?.demurrage_rate),
      detention_rate: num(body?.detention_rate),
      notes: body?.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  // Webhook event (fire-and-forget).
  try {
    const { fireWebhooks } = await import("@/lib/integrations/webhooks");
    fireWebhooks(sb, cid, "drayage_move.created", {
      move_id: data.id,
      container_number: container,
      move_type: moveType,
      status,
    });
  } catch { /* never break the response */ }
  return NextResponse.json({ id: data.id });
}
