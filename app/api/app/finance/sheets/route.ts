import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function companyId(sb: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.rpc("own_company_id");
  return (data as string | null) ?? null;
}

const STATUSES = new Set(["draft", "final"]);

/* GET /api/app/finance/sheets?q= — sheets with item count + total. */
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  let query = sb
    .from("finance_cost_sheets")
    .select("id, gttid, title, currency, eta_date, status, notes, updated_at")
    .eq("company_id", cid)
    .order("updated_at", { ascending: false })
    .limit(300);
  if (q) query = query.or(`title.ilike.%${q}%,gttid.ilike.%${q}%`);
  const { data: sheets, error } = await query;
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });

  const ids = (sheets ?? []).map((s: any) => s.id);
  let totals: Record<string, { count: number; total: number; duty: number }> = {};
  if (ids.length) {
    const { data: items } = await sb
      .from("finance_cost_items")
      .select("sheet_id, category, amount")
      .eq("company_id", cid)
      .in("sheet_id", ids);
    for (const it of items ?? []) {
      const t = (totals[it.sheet_id] ??= { count: 0, total: 0, duty: 0 });
      t.count++;
      t.total += Number(it.amount) || 0;
      if (it.category === "duty") t.duty += Number(it.amount) || 0;
    }
  }
  return NextResponse.json({
    sheets: (sheets ?? []).map((s: any) => ({
      ...s,
      item_count: totals[s.id]?.count ?? 0,
      total: Math.round((totals[s.id]?.total ?? 0) * 100) / 100,
      duty_total: Math.round((totals[s.id]?.duty ?? 0) * 100) / 100,
    })),
  });
}

/* POST /api/app/finance/sheets — { title*, gttid, currency, eta_date, status, notes } */
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
  const title = String(body?.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title_required" }, { status: 400 });
  const status = STATUSES.has(String(body?.status ?? "").toLowerCase())
    ? String(body.status).toLowerCase() : "draft";

  const { data, error } = await sb
    .from("finance_cost_sheets")
    .insert({
      company_id: cid,
      gttid: body?.gttid?.trim()?.toUpperCase() || null,
      title,
      currency: String(body?.currency ?? "USD").trim().toUpperCase().slice(0, 3) || "USD",
      eta_date: body?.eta_date?.trim() || null,
      status,
      notes: body?.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
