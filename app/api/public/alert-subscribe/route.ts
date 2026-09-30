import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRate, clientIpHash } from "@/lib/rateLimit";

/* POST /api/public/alert-subscribe — public, no login.
   Regulatory-impact alert signup: { email, keywords, locale }.
   Rate-limited 10/hr/IP. No emails are sent yet (V6); this builds the list. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const ipHash = clientIpHash(req);
  if (!(await checkRate(ipHash, "alert-subscribe", 10, 60))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().slice(0, 120);
  const keywords = String(body?.keywords ?? "").trim().slice(0, 200);
  if (!EMAIL_RE.test(email) || !keywords) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const sb = await createClient();
  const { error } = await sb.from("alert_subscriptions").insert({
    email,
    keywords,
    locale: String(body?.locale ?? "en").slice(0, 12),
    active: true,
  });
  if (error) {
    console.error("alert-subscribe insert failed:", error.message);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
