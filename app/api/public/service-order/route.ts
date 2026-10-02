import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRate, clientIpHash } from "@/lib/rateLimit";

/* POST /api/public/service-order — Mode B "Service Entry" intake (v1: drayage only).
   Public, no login. Creates a Service Order IMMEDIATELY (Quick Service Order:
   minimum fields first, enrich later) plus a service_quotes row for human triage.
   The SO starts at status=quote_requested with no GTTID; ops links/assigns
   the Trade Transaction on accept. No invented prices, ever. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const s = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

export async function POST(req: NextRequest) {
  const ipHash = clientIpHash(req);
  if (!(await checkRate(ipHash, "service-order", 10, 60))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const service = s(body?.service, 20).toLowerCase();
  if (service !== "drayage") {
    return NextResponse.json({ ok: false, error: "service_not_open" }, { status: 400 });
  }

  const name = s(body?.name, 80);
  const email = s(body?.email, 120);
  const phone = s(body?.phone, 40);
  const company = s(body?.company, 120);
  const it = (body?.intake ?? {}) as Record<string, unknown>;
  const intake = {
    container_no: s(it.container_no, 40),
    ssl: s(it.ssl, 60),
    bl_no: s(it.bl_no, 60),
    pickup: s(it.pickup, 160),
    delivery: s(it.delivery, 160),
    container_size: s(it.container_size, 20),
    weight_lbs: s(it.weight_lbs, 20),
    overweight: it.overweight === true,
    hazmat: it.hazmat === true,
    lfd: s(it.lfd, 20),
    needed_date: s(it.needed_date, 20),
    return_location: s(it.return_location, 160),
    notes: s(it.notes, 2000),
  };
  // Quick Service Order minimum: who + what box + where + when.
  if (!name || !EMAIL_RE.test(email) || !intake.container_no || !intake.pickup || !intake.delivery) {
    return NextResponse.json({ ok: false, error: "missing_required" }, { status: 400 });
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  let company_id: string | null = null;
  if (user) {
    const { data: profile } = await sb.from("profiles").select("company_id").eq("id", user.id).single();
    company_id = (profile?.company_id as string | null) ?? null;
  }

  const cargo = [
    intake.container_no,
    intake.container_size ? `${intake.container_size}` : null,
    `Pickup: ${intake.pickup}`,
    `Delivery: ${intake.delivery}`,
    intake.lfd ? `LFD: ${intake.lfd}` : intake.needed_date ? `Needed: ${intake.needed_date}` : null,
    intake.overweight ? "OVERWEIGHT" : null,
    intake.hazmat ? "HAZMAT" : null,
  ].filter(Boolean).join(" · ").slice(0, 1000);

  const { data: quote, error: qErr } = await sb.from("service_quotes").insert({
    company_id,
    service: "drayage",
    name, company: company || null, email, phone: phone || null,
    origin: intake.pickup, destination: intake.delivery,
    cargo,
    message: [
      intake.ssl ? `SSL: ${intake.ssl}` : null,
      intake.bl_no ? `B/L: ${intake.bl_no}` : null,
      intake.weight_lbs ? `Weight: ${intake.weight_lbs} lbs` : null,
      intake.return_location ? `Empty return: ${intake.return_location}` : null,
      intake.notes ? `Notes: ${intake.notes}` : null,
    ].filter(Boolean).join("\n").slice(0, 2000) || null,
    status: "new",
  }).select("id").single();
  if (qErr || !quote) {
    console.error("service-order quote insert failed:", qErr?.message);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  const { data: soNo } = await sb.rpc("next_so_no");
  const { data: so, error: soErr } = await sb.from("service_orders").insert({
    so_no: soNo ?? `SO-${Date.now()}`,
    company_id,
    created_by: user?.id ?? null,
    service_type: "drayage",
    status: "quote_requested",
    gttid: null,
    quote_id: quote.id,
    intake,
  }).select("id, so_no").single();
  if (soErr || !so) {
    console.error("service-order insert failed:", soErr?.message);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, so_no: so.so_no });
}
