import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* POST /api/public/insurance-quote — public cargo-insurance quote request.
   No login. Inserts into insurance_quotes; the RLS "public insert" policy
   forces company_id NULL + status 'new' and caps field lengths, so the form
   cannot claim or pre-triage a lead. Server-side validation mirrors it. */

const MODES = new Set(["ocean", "air"]);
const COVERAGES = new Set(["marine", "warehouse", "contingent", "stock"]);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const s = (v: unknown, max: number) => {
    const t = String(v ?? "").trim();
    return t.length <= max ? t : "";
  };
  const name = s(body.name, 120);
  const email = s(body.email, 200);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_contact" }, { status: 400 });
  }
  const mode = MODES.has(body.mode) ? body.mode : "ocean";
  const coverage = COVERAGES.has(body.coverage) ? body.coverage : "marine";
  const cargoValue = Number(body.cargo_value);
  const row = {
    name,
    company: s(body.company, 160) || null,
    email,
    phone: s(body.phone, 40) || null,
    cargo_value:
      Number.isFinite(cargoValue) && cargoValue > 0 ? cargoValue : null,
    currency: s(body.currency, 8) || "USD",
    origin: s(body.origin, 120) || null,
    destination: s(body.destination, 120) || null,
    mode,
    coverage,
    message: s(body.message, 2000) || null,
  };

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  const sb = await createClient();
  const { error } = await sb.from("insurance_quotes").insert(row);
  if (error) {
    return NextResponse.json(
      { error: "db_error", detail: error.message },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
