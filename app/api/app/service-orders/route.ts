import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureTradeCase } from "@/lib/tradeCase";

/* /api/app/service-orders — Mode B workspace APIs (authenticated).
   GET: list my company's service orders (newest first), with linked quote info.
   PATCH: { id, status?, quoted_note?, gttid? } — ops workflow transitions.
     status in: quoted|confirmed|in_progress|completed|invoiced|closed|cancelled
     gttid: link an existing Trade Transaction, or "auto" to mint via next_gttid().
   Graceful when the table does not exist yet (Tim runs service_orders_v1.sql). */

const FIELDS =
  "id, so_no, service_type, status, gttid, intake, quoted_amount, quoted_note, created_at, updated_at, quote_id";

const STATUSES = new Set([
  "quote_requested", "quoted", "confirmed", "in_progress",
  "completed", "invoiced", "closed", "cancelled",
]);

async function companyId(sb: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.rpc("own_company_id");
  return (data as string | null) ?? null;
}

function missingTable(err: { code?: string; message?: string } | null) {
  return !!err && (/service_orders/.test(err.message ?? "") || err.code === "42P01");
}

export async function GET() {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await sb
    .from("service_orders")
    .select(`${FIELDS}, service_quotes ( status, quoted_amount, quoted_note )`)
    .eq("company_id", cid)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    if (missingTable(error))
      return NextResponse.json({ orders: [], setup_required: true });
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ orders: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "");
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) {
    if (!STATUSES.has(String(body.status)))
      return NextResponse.json({ error: "bad_status" }, { status: 400 });
    patch.status = String(body.status);
  }
  if (body.quoted_note !== undefined)
    patch.quoted_note = String(body.quoted_note ?? "").slice(0, 2000) || null;
  if (body.gttid !== undefined) {
    if (body.gttid === "auto") {
      /* One GTTID per trade case — never a bare per-SO mint. */
      try {
        const { data: soRow } = await sb
          .from("service_orders")
          .select("case_id, so_no, service_type")
          .eq("id", id)
          .maybeSingle();
        const trade = await ensureTradeCase(sb as any, {
          companyId: cid,
          sourceCaseId: (soRow?.case_id as string | null) ?? null,
          title: (soRow?.case_id as string | null)
            ? `Supply Chain Case ${soRow?.case_id as string}`
            : `Service order ${(soRow?.so_no as string) ?? id} (${(soRow?.service_type as string) ?? "service"})`,
        });
        patch.gttid = trade.gttid ?? null;
      } catch {
        patch.gttid = null;
      }
    } else {
      patch.gttid = String(body.gttid ?? "").slice(0, 40) || null;
    }
  }

  const { data, error } = await sb
    .from("service_orders")
    .update(patch)
    .eq("id", id)
    .eq("company_id", cid)
    .select(FIELDS)
    .maybeSingle();
  if (error) {
    if (missingTable(error))
      return NextResponse.json({ error: "setup_required" }, { status: 503 });
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ order: data });
}
