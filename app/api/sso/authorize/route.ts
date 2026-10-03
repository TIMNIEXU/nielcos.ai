import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSsoClient, redirectAllowed } from "@/lib/sso";

/* GET /api/sso/authorize?client_id=..&redirect_uri=..&state=..&locale=en
   One NIEL Account — IdP entry point. Validates the client + redirect
   allowlist, then:
     - no session  -> 302 to /{locale}/login?next=<this URL>
     - session     -> 302 to /{locale}/sso/consent (one-click continue) */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const clientId = (url.searchParams.get("client_id") || "").slice(0, 64);
  const redirectUri = (url.searchParams.get("redirect_uri") || "").slice(0, 500);
  const state = (url.searchParams.get("state") || "").slice(0, 128);
  const locale = (url.searchParams.get("locale") || "en").slice(0, 8);

  const here = new URL("/api/sso/authorize", url.origin);
  if (!clientId || !redirectUri) {
    return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
  }

  const sb = await createClient();
  const client = await getSsoClient(sb, clientId);
  if (!client || !redirectAllowed(client, redirectUri)) {
    return NextResponse.json({ ok: false, error: "unknown_client_or_redirect" }, { status: 400 });
  }

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    const login = new URL(`/${locale}/login`, url.origin);
    login.searchParams.set("next", url.pathname + url.search);
    return NextResponse.redirect(login);
  }

  const consent = new URL(`/${locale}/sso/consent`, url.origin);
  consent.searchParams.set("client_id", clientId);
  consent.searchParams.set("redirect_uri", redirectUri);
  if (state) consent.searchParams.set("state", state);
  return NextResponse.redirect(consent);
}
