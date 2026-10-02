import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestAdditionalDuties, type DutyRule } from "@/lib/additionalDuties";

/** Normalize "95069100" -> "9506.91.00" for hts_schedule lookups. */
function normHts(raw: string | null): string | null {
  if (!raw) return null;
  const bare = raw.replace(/[^0-9]/g, "").slice(0, 8);
  if (bare.length < 8) return raw.trim() || null;
  return `${bare.slice(0, 4)}.${bare.slice(4, 6)}.${bare.slice(6, 8)}`;
}

/* GET /api/app/products/[id]/passport — GRI-001 6a Product Passport.
   Returns the SKU profile, its auto-accumulated import events, and a
   tariff-change analysis: last confirmed rate vs the CURRENT live rate
   (hts_schedule MFN + deterministic additional-duty suggestions).
   Rates are percent units everywhere. Nothing is invented. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: cid } = await sb.rpc("own_company_id");
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const { data: product } = await sb
    .from("products")
    .select("id, sku, name_en, name_zh, hts_code, origin_country, material, notes")
    .eq("id", id)
    .eq("company_id", cid as string)
    .maybeSingle();
  if (!product)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: events } = await sb
    .from("product_events")
    .select("id, entry_id, hts_code, duty_rate, customs_value, occurred_at")
    .eq("company_id", cid as string)
    .eq("sku", product.sku)
    .order("occurred_at", { ascending: true })
    .limit(200);
  const evts = (events ?? []).map((e: any) => ({
    ...e,
    duty_rate: e.duty_rate != null ? Number(e.duty_rate) : null,
    customs_value: e.customs_value != null ? Number(e.customs_value) : 0,
  }));

  // ---- current live rate for the catalog HTS ----
  const htsNo = normHts(product.hts_code);
  let mfnRate: number | null = null;
  let rateText: string | null = null;
  let htsFound = false;
  let addl: { duty_type: string; rate: number; source: string }[] = [];
  if (htsNo) {
    const [{ data: htsRow }, { data: rules }] = await Promise.all([
      sb
        .from("hts_schedule")
        .select("hts_no, general_rate, rate_text")
        .eq("hts_no", htsNo)
        .maybeSingle(),
      sb.from("additional_duties").select("*"),
    ]);
    if (htsRow) {
      htsFound = true;
      mfnRate = htsRow.general_rate != null ? Number(htsRow.general_rate) : null;
      rateText = htsRow.rate_text ?? null;
    }
    const sugg = suggestAdditionalDuties(
      htsNo,
      product.origin_country ?? "",
      product.material ?? "",
      (rules ?? []) as DutyRule[]
    );
    addl = sugg
      .filter((s) => s.kind === "rate")
      .map((s: any) => ({
        duty_type: s.duty_type,
        rate: Number(s.rate),
        source: s.source ?? "",
      }));
  }
  const currentRate =
    mfnRate != null
      ? mfnRate + addl.reduce((a, d) => a + d.rate, 0)
      : null;

  // ---- tariff-change analysis ----
  const last = evts.length ? evts[evts.length - 1] : null;
  const lastRate = last?.duty_rate ?? null;
  const changed =
    lastRate != null &&
    currentRate != null &&
    Math.abs(currentRate - lastRate) > 0.005;
  const deltaPct = changed ? (currentRate as number) - (lastRate as number) : 0;

  // annual impact: trailing-365d entered value x rate delta; falls back to
  // all events on file (labeled), so early data never pretends to be a year
  const yearAgo = Date.now() - 365 * 24 * 3600 * 1000;
  const recent = evts.filter(
    (e) => new Date(e.occurred_at).getTime() >= yearAgo
  );
  const basisEvts = recent.length ? recent : evts;
  const basisValue = basisEvts.reduce((a, e) => a + (e.customs_value || 0), 0);
  const impactUsd = changed ? (basisValue * Math.abs(deltaPct)) / 100 : 0;

  const totalValue = evts.reduce((a, e) => a + (e.customs_value || 0), 0);

  return NextResponse.json({
    product,
    events: [...evts].reverse(), // newest first for the table
    analysis: {
      htsNo,
      htsFound,
      mfnRate,
      rateText,
      addl,
      currentRate,
      lastRate,
      lastHts: last?.hts_code ?? null,
      lastAt: last?.occurred_at ?? null,
      changed,
      deltaPct,
      impactUsd,
      impactBasis: recent.length ? "year" : evts.length ? "partial" : "none",
      basisCount: basisEvts.length,
      basisValue,
      importCount: evts.length,
      totalValue,
    },
  });
}
