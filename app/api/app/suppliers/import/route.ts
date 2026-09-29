import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

const HEADERS: Record<string, string> = {
  code: "code", "code*": "code", "编号": "code", "供应商编号": "code", "supplier code": "code",
  name_en: "name_en", "英文名": "name_en", "supplier name": "name_en",
  name_zh: "name_zh", "中文名": "name_zh", "供应商名称": "name_zh",
  country: "country", "国家": "country", "国家/地区": "country",
  contact_name: "contact_name", "联系人": "contact_name", "contact": "contact_name",
  contact_email: "contact_email", "邮箱": "contact_email", "email": "contact_email",
  contact_phone: "contact_phone", "电话": "contact_phone", "phone": "contact_phone",
  address: "address", "地址": "address",
  payment_terms: "payment_terms", "付款条件": "payment_terms", "账期": "payment_terms",
  currency: "currency", "币种": "currency",
  status: "status", "状态": "status",
  score_quality: "score_quality", "质量分": "score_quality",
  score_delivery: "score_delivery", "交期分": "score_delivery",
  score_cost: "score_cost", "成本分": "score_cost",
  score_service: "score_service", "服务分": "score_service",
  notes: "notes", "备注": "notes",
};

function cleanScore(v: any): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Math.round(Number(s));
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
}

/* POST /api/app/suppliers/import — multipart form with an .xlsx file.
   Columns: code*, name_en, name_zh, country, contact_*, address, payment_terms,
   currency, status, score_*, notes. Upserts on (company_id, code).
   Returns { imported, updated, skipped }. */
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: cid } = await sb.rpc("own_company_id");
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch { /* fall through */ }
  if (!file) return NextResponse.json({ error: "no_file" }, { status: 400 });

  let rows: Record<string, any>[];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
  } catch {
    return NextResponse.json({ error: "parse_failed" }, { status: 400 });
  }

  let imported = 0, updated = 0, skipped = 0;
  for (const r of rows) {
    const norm: Record<string, any> = {};
    for (const [k, v] of Object.entries(r)) {
      const key = HEADERS[String(k).trim().toLowerCase()];
      if (key) norm[key] = String(v ?? "").trim();
    }
    const code = norm.code?.trim();
    if (!code) { skipped++; continue; }
    const payload = {
      company_id: cid as string,
      code,
      name_en: norm.name_en || null,
      name_zh: norm.name_zh || null,
      country: norm.country?.toUpperCase()?.slice(0, 2) || null,
      contact_name: norm.contact_name || null,
      contact_email: norm.contact_email || null,
      contact_phone: norm.contact_phone || null,
      address: norm.address || null,
      payment_terms: norm.payment_terms || null,
      currency: norm.currency?.toUpperCase()?.slice(0, 3) || null,
      status: norm.status === "inactive" || norm.status === "停用" ? "inactive" : "active",
      score_quality: cleanScore(norm.score_quality),
      score_delivery: cleanScore(norm.score_delivery),
      score_cost: cleanScore(norm.score_cost),
      score_service: cleanScore(norm.score_service),
      notes: norm.notes || null,
      updated_at: new Date().toISOString(),
    };
    const { data: existing } = await sb
      .from("suppliers")
      .select("id")
      .eq("company_id", cid as string)
      .eq("code", code)
      .maybeSingle();
    if (existing) {
      const { error } = await sb.from("suppliers").update(payload).eq("id", existing.id);
      if (error) { skipped++; continue; }
      updated++;
    } else {
      const { error } = await sb.from("suppliers").insert(payload);
      if (error) { skipped++; continue; }
      imported++;
    }
  }
  return NextResponse.json({ imported, updated, skipped });
}
