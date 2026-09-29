import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function normHts(raw: string | null): string | null {
  if (!raw) return null;
  const bare = raw.replace(/[^0-9]/g, "").slice(0, 8);
  if (bare.length < 8) return raw.trim() || null;
  return `${bare.slice(0, 4)}.${bare.slice(4, 6)}.${bare.slice(6, 8)}`;
}

async function scoped(sb: Awaited<ReturnType<typeof createClient>>, id: string) {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: cid } = await sb.rpc("own_company_id");
  if (!cid) return null;
  const { data: row } = await sb
    .from("products")
    .select("id")
    .eq("id", id)
    .eq("company_id", cid as string)
    .maybeSingle();
  return row ? (cid as string) : null;
}

/* PATCH /api/app/products/[id] — partial update (same fields as POST). */
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
  if (typeof body?.sku === "string" && body.sku.trim()) patch.sku = body.sku.trim();
  if (typeof body?.name_en === "string") patch.name_en = body.name_en.trim() || null;
  if (typeof body?.name_zh === "string") patch.name_zh = body.name_zh.trim() || null;
  if (typeof body?.hts_code === "string") patch.hts_code = normHts(body.hts_code);
  if (typeof body?.origin_country === "string")
    patch.origin_country = body.origin_country.trim().toUpperCase().slice(0, 2) || null;
  if (typeof body?.material === "string") patch.material = body.material.trim() || null;
  if (typeof body?.notes === "string") patch.notes = body.notes.trim() || null;
  if (Array.isArray(body?.pga_manual))
    patch.pga_manual = [...new Set(body.pga_manual.map((s: any) => String(s).trim().toUpperCase()).filter(Boolean))].slice(0, 12);

  const { error } = await sb.from("products").update(patch).eq("id", id).eq("company_id", cid);
  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: "dup_sku" }, { status: 409 });
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/* DELETE /api/app/products/[id] */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = await createClient();
  const { id } = await params;
  const cid = await scoped(sb, id);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { error } = await sb.from("products").delete().eq("id", id).eq("company_id", cid);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
