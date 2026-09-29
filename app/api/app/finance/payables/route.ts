import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FIELDS =
  "id, payee, category, amount, currency, due_date, gttid, status, paid_date, notes, updated_at";

async function companyId(sb: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.rpc("own_company_id");
  return (data as string | null) ?? null;
}

const CATS = new Set(["duty", "freight", "drayage", "warehouse", "supplier", "other"]);
const STATUSES = new Set(["pending", "paid", "cancelled"]);

/* GET /api/app/finance/payables?q=&status= */
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const status = sp.get("status")?.trim().toLowerCase() ?? "";
  let query = sb
    .from("finance_payables")
    .select(FIELDS)
    .eq("company_id", cid)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(500);
  if (q) query = query.or(`payee.ilike.%${q}%,gttid.ilike.%${q}%`);
  if (STATUSES.has(status)) query = query.eq("status", status);
  const { data: rows, error } = await query;
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ payables: rows ?? [] });
}

/* POST /api/app/finance/payables — { payee*, amount*, ... } */
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
  const payee = String(body?.payee ?? "").trim();
  if (!payee) return NextResponse.json({ error: "payee_required" }, { status: 400 });
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount < 0)
    return NextResponse.json({ error: "amount_invalid" }, { status: 400 });

  const category = CATS.has(String(body?.category ?? "").toLowerCase())
    ? String(body.category).toLowerCase() : "other";
  const status = STATUSES.has(String(body?.status ?? "").toLowerCase())
    ? String(body.status).toLowerCase() : "pending";

  const { data, error } = await sb
    .from("finance_payables")
    .insert({
      company_id: cid,
      payee,
      category,
      amount: Math.round(amount * 100) / 100,
      currency: String(body?.currency ?? "USD").trim().toUpperCase().slice(0, 3) || "USD",
      due_date: body?.due_date?.trim() || null,
      gttid: body?.gttid?.trim()?.toUpperCase() || null,
      status,
      paid_date: body?.paid_date?.trim() || null,
      notes: body?.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
