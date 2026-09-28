import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestHts, matchPga } from "@/lib/hts";

/* POST /api/app/customs/suggest — { description } ->
   { candidates: [{hts_no, description, rate, score}], pga: [...] }.
   Rule-based keyword matching over hts_schedule (offline, deterministic).
   An LLM rerank can be added here later without changing the contract. */
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let description = "";
  try {
    const body = await req.json();
    if (typeof body?.description === "string") description = body.description;
  } catch { /* fall through */ }
  if (!description.trim()) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { data: rows, error } = await sb
    .from("hts_schedule")
    .select("hts_no, description, general_rate, keywords");
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });

  const candidates = suggestHts(description, rows ?? []);
  const { data: rules } = await sb.from("pga_rules").select("hts_prefix, agency, agency_cn, note");
  const pga = candidates.length ? matchPga(candidates[0].hts_no, rules ?? []) : [];

  return NextResponse.json({ candidates, pga });
}
