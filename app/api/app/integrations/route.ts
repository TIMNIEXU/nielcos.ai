import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/integrations/session";

/* GET /api/app/integrations — module summary counts. */
export async function GET() {
  const ctx = await requireCompany();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { sb, cid } = ctx;

  const [keys, endpoints, edi, requests] = await Promise.all([
    sb.from("api_keys").select("id", { count: "exact", head: true }).eq("company_id", cid).is("revoked_at", null),
    sb.from("webhook_endpoints").select("id", { count: "exact", head: true }).eq("company_id", cid).eq("is_active", true),
    sb.from("edi_documents").select("id", { count: "exact", head: true }).eq("company_id", cid),
    sb.from("connector_requests").select("id", { count: "exact", head: true }).eq("company_id", cid),
  ]);

  return NextResponse.json({
    activeKeys: keys.count ?? 0,
    activeWebhooks: endpoints.count ?? 0,
    ediDocuments: edi.count ?? 0,
    connectorRequests: requests.count ?? 0,
  });
}
