import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRate, clientIpHash } from "@/lib/rateLimit";

/* POST /api/public/supply-chain-case — NIEL GROUP DIGITAL ARCHITECTURE v1.1.
   Public, no login. One "Supply Chain Case" from nielsc.com fans out to N
   service_orders (one per service type), all sharing the caller's case_id
   (SC-2026-XXXXX). Each SO also gets a service_quotes row for human triage,
   following the same pattern as /api/public/service-order.

   Service mapping (canonical types; nielsc.com maps its labels to these):
     customs | freight | drayage | warehouse | insurance | bond
   "End-to-End" arrives as end_to_end=true (a coordination flag, not a type):
   it is stored on every order's intake; if it is the ONLY selection, a
   single freight order is created as the coordination bucket.

   CORS: only the nielsc.com origins may call this cross-origin.
   No invented prices, ever. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CASE_RE = /^SC-\d{4}-\d{5}$/;
const s = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

const SERVICE_TYPES = new Set([
  "customs",
  "freight",
  "drayage",
  "warehouse",
  "insurance",
  "bond",
]);

const ALLOWED_ORIGINS = new Set([
  "https://www.nielsc.com",
  "https://nielsc.com",
]);

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

function newCaseId() {
  return `SC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req);
  const ipHash = clientIpHash(req);
  if (!(await checkRate(ipHash, "supply-chain-case", 10, 60))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429, headers });
  }
  const body = await req.json().catch(() => null);

  const contact = s(body?.contact, 80);
  const email = s(body?.email, 120);
  const phoneEarly = s(body?.phone, 40);
  // Email OR phone is required (China leads are WeChat/phone-first).
  if (!contact || (email ? !EMAIL_RE.test(email) : !phoneEarly)) {
    return NextResponse.json({ ok: false, error: "missing_required" }, { status: 400, headers });
  }

  const rawCaseId = s(body?.case_id, 20);
  const caseId = CASE_RE.test(rawCaseId) ? rawCaseId : newCaseId();

  const company = s(body?.company, 120);
  const phone = s(body?.phone, 40);
  const origin = s(body?.origin, 160);
  const destination = s(body?.destination, 160);
  const cargo = s(body?.cargo, 500);
  const load = s(body?.load, 120);
  const ready = s(body?.ready, 60);
  const notes = s(body?.notes, 2000);
  const docs = Array.isArray(body?.docs)
    ? (body.docs as unknown[]).map((d) => s(d, 120)).filter(Boolean).slice(0, 20)
    : [];
  const endToEnd = body?.end_to_end === true;
  const locale = s(body?.locale, 10) || "en";

  // Dedupe service types; keep the caller's original labels for ops context.
  const seen = new Set<string>();
  const labels: Record<string, string[]> = {};
  for (const item of Array.isArray(body?.services) ? body.services : []) {
    const t = s(item?.type, 20).toLowerCase();
    const label = s(item?.label, 40) || t;
    if (!SERVICE_TYPES.has(t) || seen.has(t)) continue;
    seen.add(t);
    labels[t] = [...(labels[t] ?? []), label];
  }
  let types = [...seen];
  if (types.length === 0) {
    if (!endToEnd) {
      return NextResponse.json({ ok: false, error: "no_service" }, { status: 400, headers });
    }
    // End-to-End alone: one freight order as the coordination bucket.
    types = ["freight"];
    labels["freight"] = ["End-to-End"];
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  let company_id: string | null = null;
  if (user) {
    const { data: profile } = await sb.from("profiles").select("company_id").eq("id", user.id).single();
    company_id = (profile?.company_id as string | null) ?? null;
  }

  const cargoLine = [cargo || null, load ? `Load: ${load}` : null, origin || destination ? `${origin} → ${destination}`.replace(/^ → | → $/g, "") : null]
    .filter(Boolean).join(" · ").slice(0, 1000);
  const message = [
    `Case: ${caseId} (nielsc.com)`,
    endToEnd ? "END-TO-END coordination requested" : null,
    ready ? `Ready/ETA: ${ready}` : null,
    docs.length ? `Docs: ${docs.join(", ")}` : null,
    notes ? `Notes: ${notes}` : null,
  ].filter(Boolean).join("\n").slice(0, 2000);

  const orders: { service: string; so_no: string }[] = [];
  for (const t of types) {
    // NOTE: no .select() after insert — anon can insert (public lead
    // capture) but cannot SELECT the row back under RLS. SO numbers are
    // minted here via next_so_no().
    const quoteId = crypto.randomUUID();
    const { error: qErr } = await sb.from("service_quotes").insert({
      id: quoteId,
      company_id,
      service: t,
      name: contact,
      company: company || null,
      email: email || null,
      phone: phone || null,
      origin: origin || null,
      destination: destination || null,
      cargo: cargoLine || null,
      message,
      status: "new",
    });
    if (qErr) {
      console.error("supply-chain-case quote insert failed:", qErr.message);
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500, headers });
    }
    const { data: soNo } = await sb.rpc("next_so_no");
    const finalSoNo = (soNo as string | null) ?? `SO-${Date.now()}`;
    const { error: soErr } = await sb.from("service_orders").insert({
      id: crypto.randomUUID(),
      so_no: finalSoNo,
      case_id: caseId,
      company_id,
      created_by: user?.id ?? null,
      service_type: t,
      status: "quote_requested",
      gttid: null,
      quote_id: quoteId,
      intake: {
        case_id: caseId,
        source: "nielsc.com",
        locale,
        service_labels: labels[t] ?? [t],
        end_to_end: endToEnd,
        company: company || null,
        contact,
        email,
        phone: phone || null,
        origin: origin || null,
        destination: destination || null,
        cargo: cargo || null,
        load: load || null,
        ready: ready || null,
        notes: notes || null,
        docs,
      },
    });
    if (soErr) {
      console.error("supply-chain-case order insert failed:", soErr.message);
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500, headers });
    }
    orders.push({ service: t, so_no: finalSoNo });
  }

  return NextResponse.json({ ok: true, case_id: caseId, orders }, { headers });
}
