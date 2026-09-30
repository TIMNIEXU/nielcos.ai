import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* /api/app/insurance/policies — per-company policy CRUD.
   POST: { policy_no*, insurer, coverage, cargo_value, currency, premium,
           effective_date, expiry_date, status, gttid?, quote_id?, notes }
   gttid is resolved against the company's shipments (GTTID / MBL / container).
   PATCH: { id, ...fields }  DELETE: ?id= */

const FIELDS =
  "id, company_id, quote_id, shipment_id, gttid, policy_no, insurer, coverage, cargo_value, currency, premium, effective_date, expiry_date, status, notes, created_at, updated_at";

const COVERAGES = new Set(["marine", "warehouse", "contingent", "stock"]);
const STATUSES = new Set(["pending", "active", "expired", "cancelled"]);

async function companyId(sb: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.rpc("own_company_id");
  return (data as string | null) ?? null;
}

async function resolveShipment(sb: Awaited<ReturnType<typeof createClient>>, cid: string, key: string) {
  const k = key.trim();
  if (!k) return null;
  const { data } = await sb
    .from("shipments")
    .select("id, gttid")
    .eq("company_id", cid)
    .or(`gttid.eq.${k},mbl_no.eq.${k},container_number.eq.${k}`)
    .maybeSingle();
  return data as { id: string; gttid: string } | null;
}

function clean(body: any) {
  const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  const num = (v: unknown) => {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const date = (v: unknown) => {
    const t = String(v ?? "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
  };
  return {
    policy_no: s(body.policy_no, 80),
    insurer: s(body.insurer, 160) || null,
    coverage: COVERAGES.has(body.coverage) ? body.coverage : "marine",
    cargo_value: num(body.cargo_value),
    currency: s(body.currency, 8) || "USD",
    premium: num(body.premium),
    effective_date: date(body.effective_date),
    expiry_date: date(body.expiry_date),
    status: STATUSES.has(body.status) ? body.status : "pending",
    notes: s(body.notes, 2000) || null,
    quote_id: s(body.quote_id, 40) || null,
  };
}

export async function GET() {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await sb
    .from("insurance_policies")
    .select(FIELDS)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ policies: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const c = clean(body);
  if (!c.policy_no) return NextResponse.json({ error: "policy_no_required" }, { status: 400 });

  const ship = await resolveShipment(sb, cid, String(body?.gttid ?? ""));
  const row = {
    ...c,
    company_id: cid,
    shipment_id: ship?.id ?? null,
    gttid: ship?.gttid ?? String(body?.gttid ?? "").trim().slice(0, 80) ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await sb.from("insurance_policies").insert(row).select(FIELDS).single();
  if (error) {
    const dup = /duplicate|unique/i.test(error.message);
    return NextResponse.json({ error: dup ? "dup_policy_no" : "db_error", detail: error.message }, { status: dup ? 409 : 500 });
  }
  return NextResponse.json({ policy: data });
}

export async function PATCH(req: NextRequest) {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const c = clean(body);
  if (!c.policy_no) return NextResponse.json({ error: "policy_no_required" }, { status: 400 });

  const ship = await resolveShipment(sb, cid, String(body?.gttid ?? ""));
  const row = {
    ...c,
    shipment_id: ship?.id ?? null,
    gttid: ship?.gttid ?? String(body?.gttid ?? "").trim().slice(0, 80) ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await sb
    .from("insurance_policies")
    .update(row)
    .eq("id", id)
    .select(FIELDS)
    .maybeSingle();
  if (error) {
    const dup = /duplicate|unique/i.test(error.message);
    return NextResponse.json({ error: dup ? "dup_policy_no" : "db_error", detail: error.message }, { status: dup ? 409 : 500 });
  }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ policy: data });
}

export async function DELETE(req: NextRequest) {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { error } = await sb.from("insurance_policies").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
