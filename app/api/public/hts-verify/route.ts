import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRate, clientIpHash } from "@/lib/rateLimit";

/* POST /api/public/hts-verify — public, no login.
   Broker verification request (paid service lead): { hts_no, product_description,
   origin, contact_name, contact_email, contact_phone }. Rate-limited 10/hr/IP. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const ipHash = clientIpHash(req);
  if (!(await checkRate(ipHash, "hts-verify", 10, 60))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const hts_no = String(body?.hts_no ?? "").replace(/[^0-9.]/g, "").slice(0, 14);
  const contact_email = String(body?.contact_email ?? "").trim().slice(0, 120);
  if (!hts_no || !EMAIL_RE.test(contact_email)) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const sb = await createClient();
  const { error } = await sb.from("hts_verifications").insert({
    hts_no,
    product_description: String(body?.product_description ?? "").slice(0, 1000) || null,
    origin: String(body?.origin ?? "").slice(0, 40) || null,
    contact_name: String(body?.contact_name ?? "").slice(0, 80) || null,
    contact_email,
    contact_phone: String(body?.contact_phone ?? "").slice(0, 40) || null,
    status: "requested",
  });
  if (error) {
    console.error("hts-verify insert failed:", error.message);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
