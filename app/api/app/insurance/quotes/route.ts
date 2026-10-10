import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* /api/app/insurance/quotes — workbench triage for public quote requests.
   GET: quotes visible to the caller (own claimed + unclaimed lead pool for
   triage-enabled agency companies only).
   PATCH: { id, status?, quoted_premium?, quoted_note?, claim?: true }
   Claiming pins company_id to the caller's company (RLS with-check).
   DELETE: ?id= — hard-delete a quote (RLS tenant-delete policy applies). */

const FIELDS =
  "id, created_at, name, company, email, phone, cargo_value, currency, origin, destination, mode, coverage, message, status, company_id, quoted_premium, quoted_note, updated_at, bond_recommendation, bond_amount_est, annual_import_value, entries_per_year, duties_paid";

async function companyId(sb: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.rpc("own_company_id");
  return (data as string | null) ?? null;
}

export async function GET() {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await sb
    .from("insurance_quotes")
    .select(FIELDS)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ quotes: data ?? [] });
}

const STATUSES = new Set(["new", "quoted", "declined"]);

export async function PATCH(req: NextRequest) {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.claim) patch.company_id = cid;
  if (body.status !== undefined) {
    if (!STATUSES.has(body.status)) return NextResponse.json({ error: "bad_status" }, { status: 400 });
    patch.status = body.status;
  }
  if (body.quoted_premium !== undefined) {
    const n = Number(body.quoted_premium);
    patch.quoted_premium = body.quoted_premium === "" || body.quoted_premium == null ? null : (Number.isFinite(n) && n >= 0 ? n : null);
  }
  if (body.quoted_note !== undefined) patch.quoted_note = String(body.quoted_note ?? "").slice(0, 2000) || null;

  const { data, error } = await sb
    .from("insurance_quotes")
    .update(patch)
    .eq("id", id)
    .select(FIELDS)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ quote: data });
}

export async function DELETE(req: NextRequest) {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { error } = await sb.from("insurance_quotes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
