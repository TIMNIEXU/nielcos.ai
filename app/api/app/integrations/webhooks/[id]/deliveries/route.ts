import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/integrations/session";

/* GET /api/app/integrations/webhooks/[id]/deliveries — recent delivery log. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireCompany();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { sb, cid } = ctx;
  const { id } = await params;

  const { data, error } = await sb
    .from("webhook_deliveries")
    .select("id, event, status_code, ok, error, duration_ms, created_at")
    .eq("endpoint_id", id)
    .eq("company_id", cid)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ deliveries: data ?? [] });
}
