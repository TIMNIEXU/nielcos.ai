import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/integrations/session";
import { audit } from "@/lib/integrations/audit";
import { deliverOnce } from "@/lib/integrations/webhooks";

/* POST /api/app/integrations/webhooks/[id]/test — fires a signed
   `webhook.test` event to the endpoint and returns the outcome. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireCompany();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { sb, cid, user } = ctx;
  const { id } = await params;

  const result = await deliverOnce(sb, cid, id, "webhook.test", {
    message: "This is a test delivery from Niel COS.",
    endpoint_id: id,
  });
  if (!result) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await audit(cid, user.email ?? user.id, "webhook.tested", "webhook_endpoint", id, {
    ok: result.ok,
    statusCode: result.statusCode,
  });
  return NextResponse.json({ delivery: result });
}
