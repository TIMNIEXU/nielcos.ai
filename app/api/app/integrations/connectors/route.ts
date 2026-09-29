import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/integrations/session";
import { audit } from "@/lib/integrations/audit";

/* Fixed connector catalog. `available` ones work today; the rest are
   request-access (a row lands in connector_requests for the Niel team). */
export const CONNECTORS = [
  { id: "rest-api", status: "available" },
  { id: "webhooks", status: "available" },
  { id: "edi", status: "available" },
  { id: "excel-import", status: "available" },
  { id: "netsuite", status: "request" },
  { id: "sap", status: "request" },
  { id: "quickbooks", status: "request" },
  { id: "shopify", status: "request" },
] as const;

/* GET /api/app/integrations/connectors — catalog + this company's requests. */
export async function GET() {
  const ctx = await requireCompany();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { sb, cid } = ctx;
  const { data } = await sb
    .from("connector_requests")
    .select("connector, status, created_at")
    .eq("company_id", cid)
    .order("created_at", { ascending: false });
  return NextResponse.json({ connectors: CONNECTORS, requests: data ?? [] });
}

/* POST /api/app/integrations/connectors/request {connector, note?} */
export async function POST(req: NextRequest) {
  const ctx = await requireCompany();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { sb, cid, user } = ctx;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const connector = String(body?.connector ?? "").trim().slice(0, 60);
  const known = CONNECTORS.find((c) => c.id === connector && c.status === "request");
  if (!known) return NextResponse.json({ error: "unknown_connector" }, { status: 400 });

  const { data, error } = await sb
    .from("connector_requests")
    .insert({
      company_id: cid,
      connector,
      note: String(body?.note ?? "").trim().slice(0, 500) || null,
    })
    .select("id, connector, status, created_at")
    .single();
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });

  await audit(cid, user.email ?? user.id, "connector.requested", "connector_request", data.id, { connector });
  return NextResponse.json({ request: data });
}
