import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function scoped(sb: Awaited<ReturnType<typeof createClient>>, id: string) {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: cid } = await sb.rpc("own_company_id");
  if (!cid) return null;
  const { data: row } = await sb
    .from("suppliers")
    .select("id")
    .eq("id", id)
    .eq("company_id", cid as string)
    .maybeSingle();
  return row ? (cid as string) : null;
}

function cleanScore(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
}

const DOC_KEYS = ["business_license", "iso_cert", "bank_info", "tax_form", "compliance_decl", "insurance"];
const DOC_STATUS = new Set(["ok", "pending", "missing"]);
const RISK_LEVELS = new Set(["low", "medium", "high"]);

/* PATCH /api/app/suppliers/[id] — partial update (same fields as POST). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = await createClient();
  const { id } = await params;
  const cid = await scoped(sb, id);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  if (typeof body?.code === "string" && body.code.trim()) patch.code = body.code.trim();
  if (typeof body?.name_en === "string") patch.name_en = body.name_en.trim() || null;
  if (typeof body?.name_zh === "string") patch.name_zh = body.name_zh.trim() || null;
  if (typeof body?.country === "string")
    patch.country = body.country.trim().toUpperCase().slice(0, 2) || null;
  if (typeof body?.contact_name === "string") patch.contact_name = body.contact_name.trim() || null;
  if (typeof body?.contact_email === "string") patch.contact_email = body.contact_email.trim() || null;
  if (typeof body?.contact_phone === "string") patch.contact_phone = body.contact_phone.trim() || null;
  if (typeof body?.address === "string") patch.address = body.address.trim() || null;
  if (typeof body?.payment_terms === "string") patch.payment_terms = body.payment_terms.trim() || null;
  if (typeof body?.currency === "string")
    patch.currency = body.currency.trim().toUpperCase().slice(0, 3) || null;
  if (typeof body?.status === "string")
    patch.status = body.status.toLowerCase() === "inactive" ? "inactive" : "active";
  for (const f of ["score_quality", "score_delivery", "score_cost", "score_service"]) {
    if (body?.[f] !== undefined) patch[f] = cleanScore(body[f]);
  }
  if (body?.docs && typeof body.docs === "object") {
    const docs: Record<string, string> = {};
    for (const k of DOC_KEYS) {
      const s = String(body.docs[k] ?? "").toLowerCase();
      docs[k] = DOC_STATUS.has(s) ? s : "missing";
    }
    patch.docs = docs;
  }
  if (typeof body?.risk_level === "string" && RISK_LEVELS.has(body.risk_level.toLowerCase()))
    patch.risk_level = body.risk_level.toLowerCase();
  if (Array.isArray(body?.risk_flags))
    patch.risk_flags = [...new Set(body.risk_flags.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean))].slice(0, 12);
  if (typeof body?.notes === "string") patch.notes = body.notes.trim() || null;

  const { error } = await sb.from("suppliers").update(patch).eq("id", id).eq("company_id", cid);
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "dup_code" }, { status: 409 });
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/* DELETE /api/app/suppliers/[id] */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = await createClient();
  const { id } = await params;
  const cid = await scoped(sb, id);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { error } = await sb.from("suppliers").delete().eq("id", id).eq("company_id", cid);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
