import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* POST /api/app/import-book — GRI-001 Golden Path v1 "Book".
   Authenticated. Creates a Trade (the order record) in the customer workspace
   and files the chosen services as execution requests in service_quotes.
   Honesty contract: we create records, never prices — quotes come from humans. */

const SERVICES = new Set(["freight", "customs", "drayage", "warehouse", "insurance", "bond"]);

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { data: profile } = await sb
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  const company_id = profile?.company_id as string | undefined;
  if (!company_id) return NextResponse.json({ ok: false, error: "no_company" }, { status: 400 });

  let body: any = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const p = body?.plan ?? {};
  const services = Array.isArray(body?.services) ? body.services.filter((s: unknown) => typeof s === "string" && SERVICES.has(s)) : [];
  const contact = body?.contact ?? {};

  const productName = String(p.product_name ?? "Import").slice(0, 200);
  const origin = String(p.origin ?? "").slice(0, 80);

  const { data: tradeNo } = await sb.rpc("next_trade_no");
  const { data: trade, error: tErr } = await sb
    .from("trades")
    .insert({
      company_id,
      trade_no: tradeNo ?? `NIEL-TRD-${Date.now()}`,
      title: `Import: ${productName}`,
      status: "draft",
      origin_country: origin || null,
      destination_country: "United States",
      total_value: Number.isFinite(Number(p.value_usd)) && Number(p.value_usd) > 0 ? Number(p.value_usd) : null,
      description: [
        `Booked via /import funnel.`,
        p.hts ? `HTS: ${p.hts}` : null,
        p.total_duty_usd != null ? `Est. duty: $${Number(p.total_duty_usd).toLocaleString()}` : null,
        p.landed_usd != null ? `Est. landed: $${Number(p.landed_usd).toLocaleString()}` : null,
        p.summary ? `Plan: ${String(p.summary).slice(0, 400)}` : null,
      ]
        .filter(Boolean)
        .join(" "),
      created_by: user.id,
    })
    .select("id, trade_no")
    .single();
  if (tErr || !trade) {
    return NextResponse.json({ ok: false, error: "trade_failed" }, { status: 500 });
  }

  const cargo = [productName, p.hts ? `HTS ${p.hts}` : null, origin ? `Origin: ${origin}` : null]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 1000);
  let quoted = 0;
  for (const service of services) {
    const { error } = await sb.from("service_quotes").insert({
      company_id,
      service,
      name: String(contact.name ?? "").slice(0, 80) || null,
      company: String(contact.company ?? "").slice(0, 120) || null,
      email: String(contact.email ?? "").slice(0, 120) || user.email || null,
      origin: origin || null,
      destination: "United States",
      cargo,
      value_usd: Number.isFinite(Number(p.value_usd)) && Number(p.value_usd) > 0 ? Number(p.value_usd) : null,
      message: `Booked via /import. Trade ${trade.trade_no} — awaiting execution quote.`,
      status: "new",
    });
    if (!error) quoted++;
  }

  return NextResponse.json({ ok: true, trade_id: trade.id, trade_no: trade.trade_no, services_booked: quoted });
}
