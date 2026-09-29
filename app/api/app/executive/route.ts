import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function companyId(sb: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.rpc("own_company_id");
  return (data as string | null) ?? null;
}

function todayStr(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDaysStr(base: string, n: number) {
  const d = new Date(base + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return todayStr(d);
}

// Doc types the clearance check requires before arrival.
const REQUIRED_DOCS = ["commercial_invoice", "packing_list", "bill_of_lading"];
// Supplier doc checklist keys (suppliers_v1.sql).
const SUPPLIER_DOC_KEYS = [
  "business_license",
  "iso_cert",
  "bank_info",
  "tax_form",
  "compliance_decl",
  "insurance",
];

/* GET /api/app/executive — Executive AI risk aggregation (read-only).
   Three risk families, all derived live from existing tables:
   1. duty exposure   <- finance_cost_items (category='duty') + finance_cost_sheets
   2. clearance delay <- shipments with ETA <= 14d missing key documents
   3. supplier docs   <- suppliers.docs checklist not 'ok' */
export async function GET() {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const today = todayStr(new Date());
  const soon14 = addDaysStr(today, 14);

  // --- 1. Duty exposure ----------------------------------------------------
  const { data: sheetsRaw } = await sb
    .from("finance_cost_sheets")
    .select("id, gttid, title, currency, eta_date, status")
    .eq("company_id", cid)
    .order("updated_at", { ascending: false })
    .limit(300);
  const sheets = sheetsRaw ?? [];
  const sheetIds = sheets.map((s: any) => s.id);
  let dutyItems: any[] = [];
  if (sheetIds.length) {
    const { data } = await sb
      .from("finance_cost_items")
      .select("sheet_id, category, amount, description")
      .eq("company_id", cid)
      .in("sheet_id", sheetIds)
      .eq("category", "duty");
    dutyItems = data ?? [];
  }
  const dutyBySheet: Record<string, number> = {};
  for (const it of dutyItems) {
    dutyBySheet[it.sheet_id] = (dutyBySheet[it.sheet_id] ?? 0) + (Number(it.amount) || 0);
  }
  const dutyRows = sheets
    .map((s: any) => ({ ...s, duty: Math.round((dutyBySheet[s.id] ?? 0) * 100) / 100 }))
    .filter((s: any) => s.duty > 0)
    .sort((a: any, b: any) => b.duty - a.duty);
  const dutyTotal = Math.round(dutyRows.reduce((a: number, s: any) => a + s.duty, 0) * 100) / 100;
  const dutyShipments = new Set(dutyRows.map((s: any) => s.gttid).filter(Boolean)).size;

  // --- 2. Clearance delay risk ---------------------------------------------
  const { data: nearRaw } = await sb
    .from("shipments")
    .select("id, gttid, mbl_no, container_number, status, origin, destination, eta")
    .eq("company_id", cid)
    .gte("eta", today)
    .lte("eta", soon14)
    .order("eta", { ascending: true })
    .limit(100);
  const nearShips = nearRaw ?? [];
  let docsByShip: Record<string, Set<string>> = {};
  if (nearShips.length) {
    const { data: docs } = await sb
      .from("documents")
      .select("shipment_id, doc_type")
      .eq("company_id", cid)
      .eq("is_current", true)
      .in(
        "shipment_id",
        nearShips.map((s: any) => s.id)
      );
    for (const d of docs ?? []) {
      if (!d.shipment_id) continue;
      (docsByShip[d.shipment_id] ??= new Set()).add(String(d.doc_type ?? "other"));
    }
  }
  const clearanceRisks = nearShips
    .map((s: any) => {
      const have = docsByShip[s.id] ?? new Set<string>();
      const missing = REQUIRED_DOCS.filter((t) => !have.has(t));
      return { ...s, missing_docs: missing };
    })
    .filter((s: any) => s.missing_docs.length > 0);

  // --- 3. Supplier document issues ------------------------------------------
  const { data: supRaw } = await sb
    .from("suppliers")
    .select("id, code, name_en, name_zh, country, docs, risk_level")
    .eq("company_id", cid)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(300);
  const supplierRisks = (supRaw ?? [])
    .map((s: any) => {
      const docs = (s.docs ?? {}) as Record<string, string>;
      const missing = SUPPLIER_DOC_KEYS.filter((k) => (docs[k] ?? "missing") !== "ok").map(
        (k) => ({ key: k, state: docs[k] ?? "missing" })
      );
      return { ...s, docs: undefined, missing_docs: missing };
    })
    .filter((s: any) => s.missing_docs.length > 0);

  return NextResponse.json({
    duty: {
      total: dutyTotal,
      currency: "USD",
      shipment_count: dutyShipments,
      rows: dutyRows.slice(0, 20),
    },
    clearance: {
      count: clearanceRisks.length,
      window_days: 14,
      required_docs: REQUIRED_DOCS,
      rows: clearanceRisks,
    },
    suppliers: {
      count: supplierRisks.length,
      rows: supplierRisks,
    },
    generated_at: new Date().toISOString(),
  });
}
