import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function authed() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  return sb;
}

const noAuth = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

/* POST /api/app/customs/entries/[id]/lines — add product line(s).
   Accepts { description, quantity, value_usd, ... } or { lines: [...] } for batch. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = await authed();
  if (!sb) return noAuth();
  const { id } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // tenant check: RLS on customs_entries hides other companies' entries
  const { data: entry, error: entryErr } = await sb
    .from("customs_entries")
    .select("id")
    .eq("id", id)
    .single();
  if (entryErr || !entry) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const batch: any[] = Array.isArray(body.lines) ? body.lines : [body];
  const rows = batch
    .map((b) => ({
      entry_id: id,
      description: (b.description ?? "").trim(),
      quantity: b.quantity === "" || b.quantity == null ? null : Number(b.quantity),
      value_usd: Number(b.value_usd) || 0,
      confirmed_hts: (b.confirmed_hts ?? "").trim() || null,
      duty_rate: b.duty_rate === "" || b.duty_rate == null ? null : Number(b.duty_rate),
      material: (b.material ?? "").trim(),
      origin_country: (b.origin_country ?? "").trim(),
      hts_source: b.hts_source ?? null,
      suggested_hts: Array.isArray(b.suggested_hts) ? b.suggested_hts : [],
    }))
    .filter((r) => r.description);
  if (!rows.length) return NextResponse.json({ error: "description_required" }, { status: 400 });

  const { data, error } = await sb.from("entry_lines").insert(rows).select("id");
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  await sb.from("customs_entries").update({ updated_at: new Date().toISOString() }).eq("id", id);
  const ids = (data ?? []).map((d) => d.id);
  return NextResponse.json(Array.isArray(body.lines) ? { ids } : { id: ids[0] });
}
