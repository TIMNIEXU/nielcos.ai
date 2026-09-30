import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRate, clientIpHash } from "@/lib/rateLimit";

/* POST /api/public/service-quote — GRI-001 V4a unified RFQ, public, no login.
   One endpoint for customs / freight / drayage / warehouse / insurance / bond.
   If Tim later provides rate cards, instant pricing plugs in here (V4b) —
   until then every request becomes a triage lead. No invented prices, ever. */

const SERVICES = new Set([
  "customs", "freight", "drayage", "warehouse", "insurance", "bond",
]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const ipHash = clientIpHash(req);
  if (!(await checkRate(ipHash, "service-quote", 10, 60))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const service = String(body?.service ?? "").trim().toLowerCase();
  const email = String(body?.email ?? "").trim().slice(0, 120);
  if (!SERVICES.has(service) || !EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const v = Number(body?.value_usd);
  const sb = await createClient();
  const { error } = await sb.from("service_quotes").insert({
    service,
    name: String(body?.name ?? "").slice(0, 80) || null,
    company: String(body?.company ?? "").slice(0, 120) || null,
    email,
    phone: String(body?.phone ?? "").slice(0, 40) || null,
    origin: String(body?.origin ?? "").slice(0, 80) || null,
    destination: String(body?.destination ?? "").slice(0, 80) || null,
    cargo: String(body?.cargo ?? "").slice(0, 1000) || null,
    value_usd: Number.isFinite(v) && v >= 0 ? v : null,
    message: String(body?.message ?? "").slice(0, 2000) || null,
    status: "new",
  });
  if (error) {
    console.error("service-quote insert failed:", error.message);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
