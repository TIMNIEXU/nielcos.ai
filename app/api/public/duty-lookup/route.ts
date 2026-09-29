import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestHts } from "@/lib/hts";
import { suggestAdditionalDuties, type DutyRule } from "@/lib/additionalDuties";

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
  const bare = (q.get("hts") ?? "").replace(/[^0-9]/g, "").slice(0, 8);

  const { data: dutyRules } = await sb.from("additional_duties").select("*");
  const rules = (dutyRules ?? []) as DutyRule[];

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
    const duty_suggestions = suggestAdditionalDuties(htsNo, origin, material, rules);
    if (!row)
      return NextResponse.json({ found: false, hts_no: htsNo, duty_suggestions });
    return NextResponse.json({
      found: true,
      hts_no: row.hts_no,
      description: row.description,
      general_rate: row.general_rate,
      rate_text: row.rate_text,
      revision: row.revision,
      duty_suggestions,
    });
  }

  /* ---- keyword candidate mode ---- */
  if (description) {
    const { data: rows } = await sb
      .from("hts_schedule")
      .select("hts_no, description, general_rate, keywords, rate_text");
    const candidates = suggestHts(description, (rows ?? []) as any[]).map((c: any) => {
      const row = (rows ?? []).find((r: any) => r.hts_no === c.hts_no) as any;
      return { ...c, rate_text: row?.rate_text ?? null };
    });
    return NextResponse.json({ found: false, candidates });
  }

  return NextResponse.json({ found: false });
}
