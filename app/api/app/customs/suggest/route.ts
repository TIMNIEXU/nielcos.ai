import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestHts, matchPga } from "@/lib/hts";
import { suggestAdditionalDuties, type DutyRule } from "@/lib/additionalDuties";

/* POST /api/app/customs/suggest
   { description } -> { candidates: [{hts_no, description, rate, rate_text, score}], pga }
   { hts }         -> { hts_no, general_rate, rate_text, revision, pga, duty_suggestions }
   Rule-based keyword matching over hts_schedule (offline, deterministic).
   Duty suggestions come from additional_duties (source + effective date
   labeled) and are advisory — the user always verifies. */
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let description = "";
  let hts = "";
  let origin = "";
  let material = "";
  try {
    const body = await req.json();
    if (typeof body?.description === "string") description = body.description;
    if (typeof body?.hts === "string") hts = body.hts.trim();
    if (typeof body?.origin === "string") origin = body.origin.trim();
    if (typeof body?.material === "string") material = body.material.trim();
  } catch { /* fall through */ }

  const { data: rules } = await sb.from("pga_rules").select("hts_prefix, agency, agency_cn, note");

  if (hts) {
    const bare = hts.replace(/[^0-9]/g, "").slice(0, 8);
    const htsNo =
      bare.length >= 8 ? `${bare.slice(0, 4)}.${bare.slice(4, 6)}.${bare.slice(6, 8)}` : hts;
    const { data: row } = await sb
      .from("hts_schedule")
      .select("hts_no, description, general_rate, rate_text, revision")
      .eq("hts_no", htsNo)
      .maybeSingle();
    const { data: dutyRules } = await sb.from("additional_duties").select("*");
    // MFN schedule is 8-digit (htsNo); duty rules may be 10-digit, so pass
    // the raw input through instead of the truncated 8-digit code.
    const duty_suggestions = suggestAdditionalDuties(hts, origin, material, (dutyRules ?? []) as DutyRule[]);
    if (!row)
      return NextResponse.json({ hts_no: htsNo, found: false, duty_suggestions });
    const pga = matchPga(row.hts_no, rules ?? []);
    return NextResponse.json({
      hts_no: row.hts_no,
      found: true,
      description: row.description,
      general_rate: row.general_rate,
      rate_text: row.rate_text,
      revision: row.revision,
      pga,
      duty_suggestions,
    });
  }

  if (!description.trim()) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { data: rows, error } = await sb
    .from("hts_schedule")
    .select("hts_no, description, general_rate, keywords, rate_text");
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });

  const candidates = suggestHts(description, rows ?? []).map((c) => {
    const row = (rows ?? []).find((r: any) => r.hts_no === c.hts_no) as any;
    return { ...c, rate_text: row?.rate_text ?? null };
  });
  const pga = candidates.length ? matchPga(candidates[0].hts_no, rules ?? []) : [];

  return NextResponse.json({ candidates, pga });
}
