import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/integrations/session";
import { audit } from "@/lib/integrations/audit";
import { WEBHOOK_EVENTS } from "@/lib/integrations/webhooks";

const noAuth = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
const VALID_EVENTS: Set<string> = new Set(WEBHOOK_EVENTS.map((e) => e.id));

/* PATCH /api/app/integrations/webhooks/[id] {url?, events?, is_active?} */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireCompany();
  if (!ctx) return noAuth();
  const { sb, cid, user } = ctx;
  const { id } = await params;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if (typeof body?.url === "string" && body.url.trim()) patch.url = body.url.trim().slice(0, 500);
  if (Array.isArray(body?.events)) {
    const events = body.events.filter((e: unknown) => VALID_EVENTS.has(e as string));
    if (events.length === 0) return NextResponse.json({ error: "events_required" }, { status: 400 });
    patch.events = events;
  }
  if (typeof body?.is_active === "boolean") patch.is_active = body.is_active;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { data, error } = await sb
    .from("webhook_endpoints")
    .update(patch)
    .eq("id", id)
    .eq("company_id", cid)
    .select("id, url, events, secret, is_active, created_at")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await audit(cid, user.email ?? user.id, "webhook.updated", "webhook_endpoint", data.id, { patch: Object.keys(patch) });
  return NextResponse.json({ endpoint: data });
}

/* DELETE /api/app/integrations/webhooks/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireCompany();
  if (!ctx) return noAuth();
  const { sb, cid, user } = ctx;
  const { id } = await params;

  const { data, error } = await sb
    .from("webhook_endpoints")
    .delete()
    .eq("id", id)
    .eq("company_id", cid)
    .select("id, url")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await audit(cid, user.email ?? user.id, "webhook.deleted", "webhook_endpoint", data.id, { url: data.url });
  return NextResponse.json({ ok: true });
}
