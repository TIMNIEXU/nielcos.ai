import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchRefTable } from "@/lib/dutyData";
import { matchPga, type PgaRule } from "@/lib/hts";
import {
  suggestAdditionalDuties,
  type DutyRule,
  type DutySuggestion,
} from "@/lib/additionalDuties";

export type EnrichedProduct = {
  id: string;
  sku: string;
  name_en: string | null;
  name_zh: string | null;
  hts_code: string | null;
  origin_country: string | null;
  material: string | null;
  pga_manual: string[];
  notes: string | null;
  updated_at: string;
  mfn_rate: number | null;
  rate_text: string | null;
  hts_description: string | null;
  hts_found: boolean;
  duties: DutySuggestion[];
  pga_auto: PgaRule[];
};

/** Normalize "95069100" -> "9506.91.00" for hts_schedule lookups. */
function normHts(raw: string | null): string | null {
  if (!raw) return null;
  const bare = raw.replace(/[^0-9]/g, "").slice(0, 8);
  if (bare.length < 8) return raw.trim() || null;
  return `${bare.slice(0, 4)}.${bare.slice(4, 6)}.${bare.slice(6, 8)}`;
}

async function companyId(sb: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.rpc("own_company_id");
  return (data as string | null) ?? null;
}

/* GET /api/app/products?q= — the company's products, enriched with live
   MFN rates (hts_schedule), additional-duty suggestions (232 / 301-FL) and
   auto-matched PGA flags. Rates are never stored on the product row. */
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  let query = sb
    .from("products")
    .select(
      "id, sku, name_en, name_zh, hts_code, origin_country, material, pga_manual, notes, updated_at"
    )
    .eq("company_id", cid)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (q) query = query.or(`sku.ilike.%${q}%,name_en.ilike.%${q}%,name_zh.ilike.%${q}%,hts_code.ilike.%${q}%`);
  const { data: rows, error } = await query;
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });

  const products = rows ?? [];
  const htsNos = [...new Set(products.map((p) => normHts(p.hts_code)).filter(Boolean))] as string[];

  const [{ data: htsRows }, { data: pgaRules }, dutyRules] = await Promise.all([
    htsNos.length
      ? sb.from("hts_schedule").select("hts_no, description, general_rate, rate_text").in("hts_no", htsNos)
      : Promise.resolve({ data: [] as any[] }),
    sb.from("pga_rules").select("hts_prefix, agency, agency_cn, note"),
    fetchRefTable(sb, "additional_duties", "*"),
  ]);
  const htsMap = new Map((htsRows ?? []).map((r: any) => [r.hts_no, r]));
  const rules = (pgaRules ?? []) as PgaRule[];
  const dRules = (dutyRules ?? []) as DutyRule[];

  const enriched: EnrichedProduct[] = products.map((p: any) => {
    const htsNo = normHts(p.hts_code);
    const htsRow = htsNo ? htsMap.get(htsNo) : undefined;
    return {
      id: p.id,
      sku: p.sku,
      name_en: p.name_en,
      name_zh: p.name_zh,
      hts_code: htsNo ?? p.hts_code,
      origin_country: p.origin_country,
      material: p.material,
      pga_manual: p.pga_manual ?? [],
      notes: p.notes,
      updated_at: p.updated_at,
      mfn_rate: htsRow?.general_rate ?? null,
      rate_text: htsRow?.rate_text ?? null,
      hts_description: htsRow?.description ?? null,
      hts_found: !!htsRow,
      duties: htsNo ? suggestAdditionalDuties(htsNo, p.origin_country ?? "", p.material ?? "", dRules) : [],
      pga_auto: htsNo ? matchPga(htsNo, rules) : [],
    };
  });

  return NextResponse.json({ products: enriched });
}

/* POST /api/app/products — create a product.
   { sku*, name_en, name_zh, hts_code, origin_country, material, pga_manual[], notes } */
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
  const sku = String(body?.sku ?? "").trim();
  if (!sku) return NextResponse.json({ error: "sku_required" }, { status: 400 });

  const htsNo = normHts(typeof body?.hts_code === "string" ? body.hts_code : null);
  const pgaManual = Array.isArray(body?.pga_manual)
    ? [...new Set(body.pga_manual.map((s: any) => String(s).trim().toUpperCase()).filter(Boolean))].slice(0, 12)
    : [];

  const { data, error } = await sb
    .from("products")
    .insert({
      company_id: cid,
      sku,
      name_en: body?.name_en?.trim() || null,
      name_zh: body?.name_zh?.trim() || null,
      hts_code: htsNo,
      origin_country: body?.origin_country?.trim()?.toUpperCase()?.slice(0, 2) || null,
      material: body?.material?.trim() || null,
      pga_manual: pgaManual,
      notes: body?.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: "dup_sku" }, { status: 409 });
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
