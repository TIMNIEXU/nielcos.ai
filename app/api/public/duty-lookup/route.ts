import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestHts, matchPga } from "@/lib/hts";
import { suggestAdditionalDuties, type DutyRule, type Scope232Row } from "@/lib/additionalDuties";
import { fetchRefTable } from "@/lib/dutyData";

/* GET /api/public/duty-lookup?hts=95069100&origin=China&material=steel
   GET /api/public/duty-lookup?description=horizontal+bar+steel&origin=China
   Public, no login: USITC general rate + additional-duty suggestions
   for the homepage duty estimator. Read-only reference data.
   Requires supabase/customs_v5.sql (anon SELECT on hts_schedule and
   additional_duties). All figures advisory — verify before filing. */
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const q = req.nextUrl.searchParams;
  const origin = (q.get("origin") ?? "").trim();
  const material = (q.get("material") ?? "").trim();
  const description = (q.get("description") ?? "").trim();
  const digits = (q.get("hts") ?? "").replace(/[^0-9]/g, "");
  const bare = digits.slice(0, 8);

  const dutyRules = await fetchRefTable(sb, "additional_duties", "*");
  const rules = (dutyRules ?? []) as DutyRule[];
  // Section 232 metals scope (customs_v23). Optional enrichment: if the
  // table is not there yet, the matcher falls back to headline rules.
  let scope232: Scope232Row[] = [];
  try {
    scope232 = (await fetchRefTable(sb, "hts_232_scope", "*")) as Scope232Row[];
  } catch { /* scope table not loaded yet */ }
  const metal = (q.get("metal") ?? "").trim();
  const mwp = Number(q.get("metal_weight_pct"));
  const ucp = Number(q.get("us_content_pct"));
  const dutyOpts = {
    scope232,
    metal: metal || undefined,
    metalWeightPct: Number.isFinite(mwp) && q.get("metal_weight_pct") ? mwp : undefined,
    metalOriginCountry: (q.get("metal_origin") ?? "").trim() || undefined,
    usContentPct: Number.isFinite(ucp) && q.get("us_content_pct") ? ucp : undefined,
    entryDate: (q.get("entry_date") ?? "").trim() || undefined,
  };

  /* ---- direct HTS mode ---- */
  if (bare.length >= 6) {
    const htsNo =
      bare.length >= 8
        ? `${bare.slice(0, 4)}.${bare.slice(4, 6)}.${bare.slice(6, 8)}`
        : `${bare.slice(0, 4)}.${bare.slice(4)}`;
    const { data: row } = await sb
      .from("hts_schedule")
      .select("hts_no, description, general_rate, rate_text, revision")
      .eq("hts_no", htsNo)
      .maybeSingle();
    // MFN schedule is 8-digit; additional-duty rules may be 10-digit, so the
    // full input (up to 10 digits) goes to the duty matcher.
    const duty_suggestions = suggestAdditionalDuties(digits, origin, material, rules, dutyOpts);
    // GRI-001 V3: PGA flags for the public /classify page (same rule table as the workbench).
    let pga_flags: { agency: string; agency_cn: string; note: string }[] = [];
    try {
      const { data: pgaRules } = await sb
        .from("pga_rules")
        .select("hts_prefix, agency, agency_cn, note");
      pga_flags = matchPga(htsNo, (pgaRules ?? []) as any[]).map((r) => ({
        agency: r.agency, agency_cn: r.agency_cn, note: r.note,
      }));
    } catch { /* PGA is advisory enrichment; never break the lookup */ }
    if (!row)
      return NextResponse.json({ found: false, hts_no: htsNo, duty_suggestions, pga_flags });
    // FTA / preference program rates (customs_v24): the Special-column
    // segments for this line. Optional enrichment — until the SQL is run
    // the estimator simply offers no program selection.
    let special_rates: { spis: string[]; rate: number | null; rate_text: string }[] = [];
    try {
      const { data: srows, error: serr } = await sb
        .from("hts_special_rates")
        .select("spis, rate, rate_text")
        .eq("hts_no", row.hts_no);
      if (!serr && srows) {
        special_rates = srows.map((r: any) => ({
          spis: String(r.spis ?? "")
            .split(",")
            .map((x: string) => x.trim())
            .filter(Boolean),
          rate: r.rate == null ? null : Number(r.rate),
          rate_text: String(r.rate_text ?? ""),
        }));
      }
    } catch { /* special-rates table not loaded yet */ }
    return NextResponse.json({
      found: true,
      hts_no: row.hts_no,
      description: row.description,
      general_rate: row.general_rate,
      rate_text: row.rate_text,
      revision: row.revision,
      duty_suggestions,
      pga_flags,
      special_rates,
    });
  }

  /* ---- keyword candidate mode ---- */
  if (description) {
    const rows = await fetchRefTable(sb, "hts_schedule", "hts_no, description, general_rate, keywords, rate_text");
    const candidates = suggestHts(description, (rows ?? []) as any[]).map((c: any) => {
      const row = (rows ?? []).find((r: any) => r.hts_no === c.hts_no) as any;
      return { ...c, rate_text: row?.rate_text ?? null };
    });
    return NextResponse.json({ found: false, candidates });
  }

  return NextResponse.json({ found: false });
}
