import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/integrations/session";
import { generateWebhookSecret } from "@/lib/integrations/keys";
import { audit } from "@/lib/integrations/audit";
import { WEBHOOK_EVENTS } from "@/lib/integrations/webhooks";

const noAuth = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
const VALID_EVENTS: Set<string> = new Set(WEBHOOK_EVENTS.map((e) => e.id));

function validUrl(u: string): boolean {
  try {
    const p = new URL(u);
    return p.protocol === "https:" || p.protocol === "http:";
  } catch {
    return false;
  }
}

/* GET /api/app/integrations/webhooks — list endpoints (secret included so
   the owner can copy it into their receiver config). */
export async function GET() {
  const ctx = await requireCompany();
  if (!ctx) return noAuth();
  const { sb, cid } = ctx;
  const { data, error } = await sb
    .from("webhook_endpoints")
    .select("id, url, events, secret, is_active, created_at")
    .eq("company_id", cid)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ endpoints: data ?? [], events: WEBHOOK_EVENTS });
}

/* POST /api/app/integrations/webhooks {url, events[]} — register. */
export async function POST(req: NextRequest) {
  const ctx = await requireCompany();
  if (!ctx) return noAuth();
  const { sb, cid, user } = ctx;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const url = String(body?.url ?? "").trim().slice(0, 500);
  const events = (Array.isArray(body?.events) ? body.events : []).filter((e: unknown) =>
    VALID_EVENTS.has(e as string)
  );
  if (!validUrl(url)) return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  if (events.length === 0) return NextResponse.json({ error: "events_required" }, { status: 400 });

  const secret = generateWebhookSecret();
  const { data, error } = await sb
    .from("webhook_endpoints")
    .insert({ company_id: cid, url, events, secret })
    .select("id, url, events, secret, is_active, created_at")
    .single();
  if (error) {
    const detail = /duplicate|unique/i.test(error.message) ? "duplicate_url" : error.message;
    return NextResponse.json({ error: "db_error", detail }, { status: 500 });
  }

  await audit(cid, user.email ?? user.id, "webhook.created", "webhook_endpoint", data.id, { url, events });
  return NextResponse.json({ endpoint: data });
}
