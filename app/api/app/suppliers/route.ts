import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type Supplier = {
  id: string;
  code: string;
  name_en: string | null;
  name_zh: string | null;
  country: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  payment_terms: string | null;
  currency: string | null;
  status: string;
  score_quality: number | null;
  score_delivery: number | null;
  score_cost: number | null;
  score_service: number | null;
  score_overall: number | null;
  docs: Record<string, string>;
  risk_level: string;
  risk_flags: string[];
  notes: string | null;
  updated_at: string;
};

const FIELDS =
  "id, code, name_en, name_zh, country, contact_name, contact_email, contact_phone, address, payment_terms, currency, status, score_quality, score_delivery, score_cost, score_service, docs, risk_level, risk_flags, notes, updated_at";

function withOverall(row: any): Supplier {
  const scores = [row.score_quality, row.score_delivery, row.score_cost, row.score_service].filter(
    (s) => typeof s === "number"
  ) as number[];
  return {
    ...row,
    docs: row.docs ?? {},
    risk_flags: row.risk_flags ?? [],
    score_overall: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
  };
}

async function companyId(sb: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.rpc("own_company_id");
  return (data as string | null) ?? null;
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

function cleanDocs(v: any): Record<string, string> {
  const out: Record<string, string> = {};
  if (v && typeof v === "object") {
    for (const k of DOC_KEYS) {
      const s = String(v[k] ?? "").toLowerCase();
      out[k] = DOC_STATUS.has(s) ? s : "missing";
    }
  } else {
    for (const k of DOC_KEYS) out[k] = "missing";
  }
  return out;
}

function cleanFlags(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map((s: any) => String(s).trim().toLowerCase()).filter(Boolean))].slice(0, 12);
}

/* GET /api/app/suppliers?q= — the company's suppliers with computed overall score. */
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  let query = sb
    .from("suppliers")
    .select(FIELDS)
    .eq("company_id", cid)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (q)
    query = query.or(
      `code.ilike.%${q}%,name_en.ilike.%${q}%,name_zh.ilike.%${q}%,contact_name.ilike.%${q}%`
    );
  const { data: rows, error } = await query;
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });

  return NextResponse.json({ suppliers: (rows ?? []).map(withOverall) });
}

/* POST /api/app/suppliers — create a supplier. { code*, ... } */
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const code = String(body?.code ?? "").trim();
  if (!code) return NextResponse.json({ error: "code_required" }, { status: 400 });

  const status = String(body?.status ?? "active").toLowerCase() === "inactive" ? "inactive" : "active";
  const riskLevel = RISK_LEVELS.has(String(body?.risk_level ?? "").toLowerCase())
    ? String(body.risk_level).toLowerCase()
    : "low";

  const { data, error } = await sb
    .from("suppliers")
    .insert({
      company_id: cid,
      code,
      name_en: body?.name_en?.trim() || null,
      name_zh: body?.name_zh?.trim() || null,
      country: body?.country?.trim()?.toUpperCase()?.slice(0, 2) || null,
      contact_name: body?.contact_name?.trim() || null,
      contact_email: body?.contact_email?.trim() || null,
      contact_phone: body?.contact_phone?.trim() || null,
      address: body?.address?.trim() || null,
      payment_terms: body?.payment_terms?.trim() || null,
      currency: body?.currency?.trim()?.toUpperCase()?.slice(0, 3) || null,
      status,
      score_quality: cleanScore(body?.score_quality),
      score_delivery: cleanScore(body?.score_delivery),
      score_cost: cleanScore(body?.score_cost),
      score_service: cleanScore(body?.score_service),
      docs: cleanDocs(body?.docs),
      risk_level: riskLevel,
      risk_flags: cleanFlags(body?.risk_flags),
      notes: body?.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "dup_code" }, { status: 409 });
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
