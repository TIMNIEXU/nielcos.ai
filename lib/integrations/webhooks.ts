import { createHmac } from "crypto";
import { createClient } from "@/lib/supabase/server";

/* Webhook event catalog — every event here is actually fired by the app
   (see the call sites). Endpoints subscribe per event. */

export const WEBHOOK_EVENTS = [
  { id: "document.parsed", desc: "A document finished AI parsing" },
  { id: "drayage_move.created", desc: "A drayage move was created" },
  { id: "drayage_move.status_changed", desc: "A drayage move changed status" },
  { id: "webhook.test", desc: "Manual test delivery" },
] as const;

export type WebhookEventId = (typeof WEBHOOK_EVENTS)[number]["id"];

type Sb = Awaited<ReturnType<typeof createClient>>;

function sign(secret: string, rawBody: string): string {
  return "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
}

/* Core POST + log, shared by fire-and-forget and the test button. */
async function postAndLog(
  sb: Sb,
  companyId: string,
  endpoint: { id: string; url: string; secret: string },
  event: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; statusCode: number | null; error: string | null; durationMs: number }> {
  const body = JSON.stringify({
    event,
    delivered_at: new Date().toISOString(),
    data: payload,
  });
  const started = Date.now();
  let statusCode: number | null = null;
  let ok = false;
  let error: string | null = null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Niel-Event": event,
        "X-Niel-Signature": sign(endpoint.secret, body),
        "User-Agent": "NielCOS-Webhooks/1.0",
      },
      body,
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    statusCode = res.status;
    ok = res.status >= 200 && res.status < 300;
    if (!ok) error = `http_${res.status}`;
  } catch (e: any) {
    error = e?.name === "AbortError" ? "timeout" : String(e?.message ?? e).slice(0, 200);
  }
  try {
    await sb.from("webhook_deliveries").insert({
      company_id: companyId,
      endpoint_id: endpoint.id,
      event,
      payload: { event, data: payload },
      status_code: statusCode,
      ok,
      error,
      duration_ms: Date.now() - started,
    });
  } catch {
    /* delivery logging must never break the caller */
  }
  return { ok, statusCode, error, durationMs: Date.now() - started };
}

/* Synchronous single delivery — used by the "send test" button.
   Returns the outcome so the UI can show it immediately. */
export async function deliverOnce(
  sb: Sb,
  companyId: string,
  endpointId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; statusCode: number | null; error: string | null; durationMs: number } | null> {
  const { data: ep } = await sb
    .from("webhook_endpoints")
    .select("id, url, secret")
    .eq("id", endpointId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!ep) return null;
  return postAndLog(sb, companyId, ep, event, payload);
}

/* Fire an event to every active endpoint of the company subscribed to it.
   Fire-and-forget: callers should NOT await this in the request path. */
export function fireWebhooks(
  sb: Sb,
  companyId: string,
  event: string,
  payload: Record<string, unknown>
): void {
  (async () => {
    try {
      const { data: endpoints } = await sb
        .from("webhook_endpoints")
        .select("id, url, secret, events")
        .eq("company_id", companyId)
        .eq("is_active", true);
      const targets = (endpoints ?? []).filter((e: any) =>
        (e.events as string[]).includes(event)
      );
      // Sequential delivery keeps ordering sane per company.
      for (const ep of targets) await postAndLog(sb, companyId, ep, event, payload);
    } catch {
      /* never break the caller */
    }
  })();
}
