import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* GET /api/app/customs/pga — all PGA flag rules (reference data). */
export async function GET() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await sb.from("pga_rules").select("hts_prefix, agency, agency_cn, note");
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ rules: data ?? [] });
}
