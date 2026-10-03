import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureTradeCase } from "@/lib/tradeCase";

/* /api/app/cases — Global Trade Case (GTTID) APIs (authenticated).
   GET:  list my company's trade cases (newest first) with child counts.
   POST: { source_case_id?, title? } — find-or-create the trade case.
         One nielsc.com Supply Chain Case (SC-2026-XXXXX) → exactly one
         trade; all its service orders share the trade's GTTID. */

async function companyId(sb: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.rpc("own_company_id");
  return (data as string | null) ?? null;
}

export async function GET() {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: trades, error } = await sb
    .from("trades")
    .select("id, gttid, trade_no, title, status, source_case_id, origin_country, destination_country, updated_at, created_at")
    .eq("company_id", cid)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });

  const list = await Promise.all(
    (trades ?? []).map(async (tr: any) => {
      const [so, sh] = await Promise.all([
        tr.gttid
          ? sb.from("service_orders").select("id", { count: "exact", head: true }).eq("gttid", tr.gttid)
          : { count: 0 },
        sb.from("shipments").select("id", { count: "exact", head: true }).eq("trade_id", tr.id),
      ]);
      return { ...tr, service_orders: (so as any).count ?? 0, shipments: (sh as any).count ?? 0 };
    })
  );
  return NextResponse.json({ cases: list });
}

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const sourceCaseId = String(body?.source_case_id ?? "").trim().slice(0, 40) || null;
  const title = String(body?.title ?? "").trim().slice(0, 200) || undefined;

  try {
    const trade = await ensureTradeCase(sb as any, {
      companyId: cid,
      sourceCaseId,
      title,
    });
    return NextResponse.json({ case: trade });
  } catch (e) {
    return NextResponse.json(
      { error: "db_error", detail: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
