import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/integrations/session";

/* GET /api/app/integrations/audit?limit= — company audit trail. */
export async function GET(req: NextRequest) {
  const ctx = await requireCompany();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { sb, cid } = ctx;

  const limit = Math.min(Math.max(parseInt(new URL(req.url).searchParams.get("limit") ?? "100", 10) || 100, 1), 500);
  const { data, error } = await sb
    .from("audit_log")
    .select("id, actor, action, entity, entity_id, meta, created_at")
    .eq("company_id", cid)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}
