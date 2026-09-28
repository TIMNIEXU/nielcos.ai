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

/* POST /api/app/customs/entries/[id]/lines — add a product line */
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
  const description = (body.description ?? "").trim();
  if (!description) return NextResponse.json({ error: "description_required" }, { status: 400 });
  const { data, error } = await sb
    .from("entry_lines")
    .insert({
      entry_id: id,
      description,
      quantity: body.quantity === "" || body.quantity == null ? null : Number(body.quantity),
      value_usd: Number(body.value_usd) || 0,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  await sb.from("customs_entries").update({ updated_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ id: data.id });
}
