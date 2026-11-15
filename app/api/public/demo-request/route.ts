import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyNewDemoRequest } from "@/lib/demoNotify";

/* POST /api/public/demo-request — public demo request from /contact.
   No login. Inserts into demo_requests (needs demo_requests_v1.sql);
   the RLS "public insert" policy forces company_id NULL + status 'new'
   and caps field lengths, so the form cannot claim or pre-triage a lead.
   Anti-spam mirrors the Joma quote form: honeypot field, per-IP rate
   limit, 3s time trap. */

/* --- anti-spam: per-IP rate limit (best-effort, per instance) --- */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const str = (v: unknown, max: number) => {
    const t = typeof v === "string" ? v.trim() : "";
    return t.length <= max ? t : "";
  };

  /* Honeypot: the form hides a "website" field humans never fill.
     Pretend success and store nothing, so bots learn nothing. */
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  /* Time trap: the form sends when it was rendered. Direct API posts
     have no timestamp, and scripted fills submit near-instantly. */
  const startedAt = typeof body.startedAt === "number" ? body.startedAt : NaN;
  const elapsed = Date.now() - startedAt;
  if (Number.isNaN(startedAt) || (elapsed >= 0 && elapsed < 3000)) {
    return NextResponse.json({ error: "too_fast" }, { status: 400 });
  }

  const name = str(body.name, 120);
  const company = str(body.company, 160);
  const email = str(body.email, 200);
  const message = str(body.message, 2000);
  const locale = str(body.locale, 10);

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_contact" }, { status: 400 });
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const sb = await createClient();
  const { error } = await sb.from("demo_requests").insert({
    name,
    company: company || null,
    email,
    message: message || null,
    locale: locale || null,
  });
  if (error) {
    return NextResponse.json(
      { error: "db_error", detail: error.message },
      { status: 500 }
    );
  }

  /* Heads-up email to the operator. Awaited so serverless does not
     kill it mid-flight; failures are logged, never fail the request. */
  await notifyNewDemoRequest({
    name,
    company: company || null,
    email,
    message: message || null,
    locale: locale || null,
  });

  return NextResponse.json({ ok: true });
}
