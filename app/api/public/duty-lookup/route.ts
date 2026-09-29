import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestAdditionalDuties, type DutyRule } from "@/lib/additionalDuties";

/* GET /api/public/duty-lookup?hts=95069100&origin=China
   Public, no login: USITC general rate + additional-duty suggestions
   for the homepage duty estimator. Read-only reference data.
   Requires supabase/customs_v5.sql (anon SELECT on hts_schedule and
   additional_duties). All figures advisory — verify before filing. */
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const q = req.nextUrl.searchParams;
  const origin = (q.get("origin") ?? "").trim();
  const bare = (q.get("hts") ?? "").replace(/[^0-9]/g, "").slice(0, 8);
  if (bare.length < 6) return NextResponse.json({ found: false });

  const htsNo =
    bare.length >= 8
      ? `${bare.slice(0, 4)}.${bare.slice(4, 6)}.${bare.slice(6, 8)}`
      : `${bare.slice(0, 4)}.${bare.slice(4)}`;

  const { data: row } = await sb
    .from("hts_schedule")
    .select("hts_no, description, general_rate, rate_text, revision")
    .eq("hts_no", htsNo)
    .maybeSingle();

  const { data: dutyRules } = await sb.from("additional_duties").select("*");
  const duty_suggestions = suggestAdditionalDuties(
    htsNo,
    origin,
    "",
    (dutyRules ?? []) as DutyRule[]
  ).filter((s) => s.kind === "rate");

  if (!row) return NextResponse.json({ found: false, hts_no: htsNo, duty_suggestions });
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
