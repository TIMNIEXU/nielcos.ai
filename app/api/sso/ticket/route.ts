import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSsoClient, redirectAllowed, newTicket, sha256hex, TICKET_TTL_SECONDS } from "@/lib/sso";
import { checkRate, clientIpHash } from "@/lib/rateLimit";

/* POST /api/sso/ticket — mint a single-use login ticket.
   Authenticated session required. Body (form or JSON):
     { client_id, redirect_uri, state? }
   -> 302 to redirect_uri?ticket=..&state=.. (or JSON {ticket} for XHR).
   Only the ticket hash is stored; 120s TTL. */
export async function POST(req: NextRequest) {
  const ipHash = clientIpHash(req);
  if (!(await checkRate(ipHash, "sso-ticket", 20, 60))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: Record<string, unknown> = {};
  const ct = req.headers.get("content-type") || "";
  try {
    body = ct.includes("application/json") ? await req.json() : Object.fromEntries(await req.formData());
  } catch {
    return NextResponse.json({ ok: false, error: "bad_body" }, { status: 400 });
  }
  const clientId = String(body.client_id || "").slice(0, 64);
  const redirectUri = String(body.redirect_uri || "").slice(0, 500);
  const state = String(body.state || "").slice(0, 128);
  if (!clientId || !redirectUri) {
    return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
  }

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const client = await getSsoClient(sb, clientId);
  if (!client || !redirectAllowed(client, redirectUri)) {
    return NextResponse.json({ ok: false, error: "unknown_client_or_redirect" }, { status: 400 });
  }

  const ticket = newTicket();
  const { error } = await sb.from("sso_tickets").insert({
    ticket_hash: sha256hex(ticket),
    user_id: user.id,
    client_id: client.id,
    redirect_uri: redirectUri,
    expires_at: new Date(Date.now() + TICKET_TTL_SECONDS * 1000).toISOString(),
  });
  if (error) {
    return NextResponse.json({ ok: false, error: "ticket_failed" }, { status: 500 });
  }

  const dest = new URL(redirectUri);
  dest.searchParams.set("ticket", ticket);
  if (state) dest.searchParams.set("state", state);

  // Plain HTML form posts expect the redirect; XHR callers take the JSON.
  if (ct.includes("application/json")) {
    return NextResponse.json({ ok: true, ticket, redirect_uri: dest.toString() });
  }
  return NextResponse.redirect(dest);
}
