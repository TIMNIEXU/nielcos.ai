import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

function normHts(raw: any): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const bare = s.replace(/[^0-9]/g, "").slice(0, 8);
  if (bare.length < 8) return s || null;
  return `${bare.slice(0, 4)}.${bare.slice(4, 6)}.${bare.slice(6, 8)}`;
}

const HEADERS: Record<string, string> = {
  sku: "sku", "sku*": "sku", "料号": "sku", "产品编号": "sku",
  name_en: "name_en", "英文名": "name_en", "product name": "name_en",
  name_zh: "name_zh", "中文名": "name_zh", "产品名称": "name_zh",
  hts: "hts_code", "hts_code": "hts_code", "hts code": "hts_code", "税号": "hts_code",
  origin: "origin_country", "origin_country": "origin_country", "原产国": "origin_country", "country of origin": "origin_country",
  material: "material", "材质": "material",
  notes: "notes", "备注": "notes",
};

/* POST /api/app/products/import — multipart form with an .xlsx file.
   Columns: SKU*, name_en, name_zh, hts, origin, material, notes.
   Upserts on (company_id, sku). Returns { imported, updated, skipped }. */
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
    const sku = norm.sku?.trim();
    if (!sku) { skipped++; continue; }
    const payload = {
      company_id: cid as string,
      sku,
      name_en: norm.name_en || null,
      name_zh: norm.name_zh || null,
      hts_code: normHts(norm.hts_code),
      origin_country: norm.origin_country?.toUpperCase()?.slice(0, 2) || null,
      material: norm.material || null,
      notes: norm.notes || null,
      updated_at: new Date().toISOString(),
    };
    const { data: existing } = await sb
      .from("products")
      .select("id")
      .eq("company_id", cid as string)
      .eq("sku", sku)
      .maybeSingle();
    if (existing) {
      const { error } = await sb.from("products").update(payload).eq("id", existing.id);
      if (error) { skipped++; continue; }
      updated++;
    } else {
      const { error } = await sb.from("products").insert(payload);
      if (error) { skipped++; continue; }
      imported++;
    }
  }
  return NextResponse.json({ imported, updated, skipped });
}
