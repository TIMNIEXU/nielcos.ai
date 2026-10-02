import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRate, clientIpHash } from "@/lib/rateLimit";

/* POST /api/public/service-order — Mode B "Service Entry" intake.
   Public, no login. Creates a Service Order IMMEDIATELY (Quick Service Order:
   minimum fields first, enrich later) plus a service_quotes row for human triage.
   The SO starts at status=quote_requested with no GTTID; ops links/assigns
   the Trade Transaction on accept. Required fields are service-dependent.
   No invented prices, ever. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const s = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
const b = (v: unknown) => v === true;

type IntakeSpec = {
  intake: Record<string, unknown>;
  missing: boolean;
  cargo: string;
  message: string | null;
  origin: string | null;
  destination: string | null;
};

function drayageIntake(it: Record<string, unknown>): IntakeSpec {
  const intake = {
    container_no: s(it.container_no, 40),
    ssl: s(it.ssl, 60),
    bl_no: s(it.bl_no, 60),
    pickup: s(it.pickup, 160),
    delivery: s(it.delivery, 160),
    container_size: s(it.container_size, 20),
    weight_lbs: s(it.weight_lbs, 20),
    overweight: b(it.overweight),
    hazmat: b(it.hazmat),
    lfd: s(it.lfd, 20),
    needed_date: s(it.needed_date, 20),
    return_location: s(it.return_location, 160),
    notes: s(it.notes, 2000),
  };
  const missing = !intake.container_no || !intake.pickup || !intake.delivery;
  const cargo = [
    intake.container_no,
    intake.container_size || null,
    `Pickup: ${intake.pickup}`,
    `Delivery: ${intake.delivery}`,
    intake.lfd ? `LFD: ${intake.lfd}` : intake.needed_date ? `Needed: ${intake.needed_date}` : null,
    intake.overweight ? "OVERWEIGHT" : null,
    intake.hazmat ? "HAZMAT" : null,
  ].filter(Boolean).join(" · ").slice(0, 1000);
  const message = [
    intake.ssl ? `SSL: ${intake.ssl}` : null,
    intake.bl_no ? `B/L: ${intake.bl_no}` : null,
    intake.weight_lbs ? `Weight: ${intake.weight_lbs} lbs` : null,
    intake.return_location ? `Empty return: ${intake.return_location}` : null,
    intake.notes ? `Notes: ${intake.notes}` : null,
  ].filter(Boolean).join("\n").slice(0, 2000) || null;
  return { intake, missing, cargo, message, origin: intake.pickup, destination: intake.delivery };
}

function customsIntake(it: Record<string, unknown>): IntakeSpec {
  const intake = {
    importer_name: s(it.importer_name, 120),
    entry_port: s(it.entry_port, 80),
    bl_awb_no: s(it.bl_awb_no, 60),
    invoice_no: s(it.invoice_no, 60),
    product_desc: s(it.product_desc, 500),
    hts: s(it.hts, 20),
    quantity: s(it.quantity, 40),
    value_usd: s(it.value_usd, 20),
    arrival_date: s(it.arrival_date, 20),
    has_bond: b(it.has_bond),
    needs_bond: b(it.needs_bond),
    notes: s(it.notes, 2000),
  };
  const missing = !intake.entry_port || !intake.bl_awb_no || !intake.product_desc;
  const cargo = [
    `Port: ${intake.entry_port}`,
    `B/L: ${intake.bl_awb_no}`,
    intake.product_desc,
    intake.hts ? `HTS ${intake.hts}` : null,
  ].filter(Boolean).join(" · ").slice(0, 1000);
  const message = [
    intake.importer_name ? `Importer: ${intake.importer_name}` : null,
    intake.invoice_no ? `Invoice: ${intake.invoice_no}` : null,
    intake.quantity ? `Qty: ${intake.quantity}` : null,
    intake.value_usd ? `Value: $${intake.value_usd}` : null,
    intake.arrival_date ? `Arrival: ${intake.arrival_date}` : null,
    intake.has_bond ? "Has continuous bond" : intake.needs_bond ? "NEEDS BOND QUOTE" : null,
    intake.notes ? `Notes: ${intake.notes}` : null,
  ].filter(Boolean).join("\n").slice(0, 2000) || null;
  return { intake, missing, cargo, message, origin: null, destination: intake.entry_port };
}

function warehouseIntake(it: Record<string, unknown>): IntakeSpec {
  const inbound_type = ["container", "truck"].includes(s(it.inbound_type, 20)) ? s(it.inbound_type, 20) : "container";
  const intake = {
    warehouse_location: s(it.warehouse_location, 120),
    inbound_type,
    inbound_ref: s(it.inbound_ref, 60),
    pallets: s(it.pallets, 20),
    cartons: s(it.cartons, 20),
    skus: s(it.skus, 20),
    weight_lbs: s(it.weight_lbs, 20),
    dimensions: s(it.dimensions, 120),
    receiving_date: s(it.receiving_date, 20),
    storage_req: s(it.storage_req, 200),
    handling_req: s(it.handling_req, 500),
    outbound_instructions: s(it.outbound_instructions, 500),
    notes: s(it.notes, 2000),
  };
  const missing = !intake.warehouse_location || !intake.inbound_ref || !intake.receiving_date;
  const cargo = [
    `Warehouse: ${intake.warehouse_location}`,
    `Inbound ${inbound_type}: ${intake.inbound_ref}`,
    `Receiving: ${intake.receiving_date}`,
    intake.pallets ? `${intake.pallets} pallets` : null,
    intake.cartons ? `${intake.cartons} cartons` : null,
  ].filter(Boolean).join(" · ").slice(0, 1000);
  const message = [
    intake.skus ? `SKUs: ${intake.skus}` : null,
    intake.weight_lbs ? `Weight: ${intake.weight_lbs} lbs` : null,
    intake.dimensions ? `Dims: ${intake.dimensions}` : null,
    intake.storage_req ? `Storage: ${intake.storage_req}` : null,
    intake.handling_req ? `Handling: ${intake.handling_req}` : null,
    intake.outbound_instructions ? `Outbound: ${intake.outbound_instructions}` : null,
    intake.notes ? `Notes: ${intake.notes}` : null,
  ].filter(Boolean).join("\n").slice(0, 2000) || null;
  return { intake, missing, cargo, message, origin: null, destination: intake.warehouse_location };
}

const BUILDERS: Record<string, (it: Record<string, unknown>) => IntakeSpec> = {
  drayage: drayageIntake,
  customs: customsIntake,
  warehouse: warehouseIntake,
};

export async function POST(req: NextRequest) {
  const ipHash = clientIpHash(req);
  if (!(await checkRate(ipHash, "service-order", 10, 60))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const service = s(body?.service, 20).toLowerCase();
  const build = BUILDERS[service];
  if (!build) {
    return NextResponse.json({ ok: false, error: "service_not_open" }, { status: 400 });
  }

  const name = s(body?.name, 80);
  const email = s(body?.email, 120);
  const phone = s(body?.phone, 40);
  const company = s(body?.company, 120);
  const spec = build((body?.intake ?? {}) as Record<string, unknown>);
  // Quick Service Order minimum: who + service-specific critical fields.
  if (!name || !EMAIL_RE.test(email) || spec.missing) {
    return NextResponse.json({ ok: false, error: "missing_required" }, { status: 400 });
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  let company_id: string | null = null;
  if (user) {
    const { data: profile } = await sb.from("profiles").select("company_id").eq("id", user.id).single();
    company_id = (profile?.company_id as string | null) ?? null;
  }

  // NOTE: no .select() after insert — under RLS the anon role can insert
  // (public lead capture) but cannot SELECT the row back. Ids are minted here.
  const quoteId = crypto.randomUUID();
  const { error: qErr } = await sb.from("service_quotes").insert({
    id: quoteId,
    company_id,
    service,
    name, company: company || null, email, phone: phone || null,
    origin: spec.origin, destination: spec.destination,
    cargo: spec.cargo,
    message: spec.message,
    status: "new",
  });
  if (qErr) {
    console.error("service-order quote insert failed:", qErr.message);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  const { data: soNo } = await sb.rpc("next_so_no");
  const finalSoNo = soNo ?? `SO-${Date.now()}`;
  const { error: soErr } = await sb.from("service_orders").insert({
    id: crypto.randomUUID(),
    so_no: finalSoNo,
    company_id,
    created_by: user?.id ?? null,
    service_type: service,
    status: "quote_requested",
    gttid: null,
    quote_id: quoteId,
    intake: spec.intake,
  });
  if (soErr) {
    console.error("service-order insert failed:", soErr.message);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, so_no: finalSoNo });
}
