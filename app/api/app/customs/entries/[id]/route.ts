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

/* GET /api/app/customs/entries/[id] — entry + lines */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = await authed();
  if (!sb) return noAuth();
  const { id } = await params;
  const { data: entry, error } = await sb.from("customs_entries").select("*").eq("id", id).single();
  if (error || !entry) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data: lines } = await sb
    .from("entry_lines")
    .select("*")
    .eq("entry_id", id)
    .order("created_at", { ascending: true });
  return NextResponse.json({ entry, lines: lines ?? [] });
}

const UPDATABLE = ["entry_no", "importer_name", "shipment_id", "status", "milestones", "notes"] as const;

/* PATCH /api/app/customs/entries/[id] — update fields / push milestone */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = await authed();
  if (!sb) return noAuth();
  const { id } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const patch: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const k of UPDATABLE) {
    if (k in body) {
      patch[k] =
        k === "milestones" ? body[k] : typeof body[k] === "string" && body[k].trim() === "" ? null : body[k];
    }
  }
  const { error } = await sb.from("customs_entries").update(patch).eq("id", id);
  if (error) {
    const dup = error.code === "23505";
    return NextResponse.json(
      { error: dup ? "duplicate_entry_no" : "db_error", detail: error.message },
      { status: dup ? 409 : 500 }
    );
  }
  return NextResponse.json({ ok: true });
}

/* DELETE /api/app/customs/entries/[id] */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = await authed();
  if (!sb) return noAuth();
  const { id } = await params;
  const { error } = await sb.from("customs_entries").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
