import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRate, clientIpHash } from "@/lib/rateLimit";

/* POST /api/sso/token — server-to-server ticket exchange.
   Body: { ticket, client_id, client_secret, redirect_uri? }
   The exchange_sso_ticket() SECURITY DEFINER function verifies the
   client secret, ticket hash, expiry, single-use and client binding,
   marks the ticket used, and returns { user: { id, email, name } }.
   Rate-limited; never called from a browser. */
export async function POST(req: NextRequest) {
  const ipHash = clientIpHash(req);
  if (!(await checkRate(ipHash, "sso-token", 30, 60))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_body" }, { status: 400 });
  }
  const ticket = String(body.ticket || "");
  const clientId = String(body.client_id || "").slice(0, 64);
  const clientSecret = String(body.client_secret || "");
  if (!ticket || !clientId || !clientSecret) {
    return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
  }

  const sb = await createClient();
  const { data, error } = await sb.rpc("exchange_sso_ticket", {
    p_ticket: ticket,
    p_client_id: clientId,
    p_client_secret: clientSecret,
  });
  if (error) {
    const msg = (error.message || "").toLowerCase();
    const code = msg.includes("expired")
      ? "ticket_expired"
      : msg.includes("reused")
        ? "ticket_reused"
        : msg.includes("client")
          ? "bad_client"
          : "bad_ticket";
    return NextResponse.json({ ok: false, error: code }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...(data as Record<string, unknown>) });
}
