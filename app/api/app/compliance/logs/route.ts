import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* Screening audit trail — read-only for the tenant (the table has no
   update/delete policies, so records are permanent). */

async function authed() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  return sb;
}

const noAuth = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

/* GET /api/app/compliance/logs?limit=100 */
export async function GET(req: NextRequest) {
  const sb = await authed();
  if (!sb) return noAuth();
  const limit = Math.min(500, Math.max(1, parseInt(new URL(req.url).searchParams.get("limit") ?? "100", 10) || 100));
  const { data, error } = await sb
    .from("screening_logs")
    .select("id, query_name, query_country, result, match_detail, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ logs: data ?? [] });
}
