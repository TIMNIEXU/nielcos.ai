import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* /api/app/quotes — GRI-001 V4a workbench triage for unified service RFQs.
   GET: visible rows (own claimed + unclaimed pool for triage-enabled companies).
   PATCH: { id, status?, quoted_amount?, quoted_note?, claim?: true } */

const FIELDS =
  "id, created_at, service, name, company, email, phone, origin, destination, cargo, value_usd, message, status, company_id, quoted_amount, quoted_note, updated_at";

async function companyId(sb: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.rpc("own_company_id");
  return (data as string | null) ?? null;
}

export async function GET() {
  const sb = await createClient();
  if (!(await companyId(sb)))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await sb
    .from("service_quotes")
    .select(FIELDS)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ quotes: data ?? [] });
}

const STATUSES = new Set(["new", "quoted", "won", "lost", "declined"]);

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
  if (body.quoted_amount !== undefined) {
    const n = Number(body.quoted_amount);
    patch.quoted_amount =
      body.quoted_amount === "" || body.quoted_amount == null
        ? null
        : Number.isFinite(n) && n >= 0 ? n : null;
  }
  if (body.quoted_note !== undefined)
    patch.quoted_note = String(body.quoted_note ?? "").slice(0, 2000) || null;

  const { data, error } = await sb
    .from("service_quotes")
    .update(patch)
    .eq("id", id)
    .select(FIELDS)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  /* Mode B — keep linked Service Orders in sync with the triage decision.
     Best-effort under RLS (ops triage works the unclaimed lead pool). */
  if (body.status !== undefined) {
    try {
      const soPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.status === "quoted") {
        soPatch.status = "quoted";
        if (patch.quoted_amount !== undefined) soPatch.quoted_amount = patch.quoted_amount;
        if (patch.quoted_note !== undefined) soPatch.quoted_note = patch.quoted_note;
      } else if (body.status === "won") {
        soPatch.status = "confirmed";
        const { data: soRow } = await sb
          .from("service_orders")
          .select("id, gttid")
          .eq("quote_id", id)
          .maybeSingle();
        if (soRow && !soRow.gttid) {
          const { data: gttid } = await sb.rpc("next_gttid");
          if (gttid) soPatch.gttid = gttid;
        }
      } else if (body.status === "lost" || body.status === "declined") {
        soPatch.status = "cancelled";
      }
      if (soPatch.status) {
        await sb.from("service_orders").update(soPatch).eq("quote_id", id);
      }
    } catch { /* table may not exist yet; triage still succeeds */ }
  }

  return NextResponse.json({ quote: data });
}
