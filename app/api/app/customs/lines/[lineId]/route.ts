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

const UPDATABLE = [
  "description",
  "quantity",
  "value_usd",
  "suggested_hts",
  "confirmed_hts",
  "duty_rate",
  "additional_pct",
] as const;

/* PATCH /api/app/customs/lines/[lineId] — confirm HTS, edit rate, etc. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ lineId: string }> }) {
  const sb = await authed();
  if (!sb) return noAuth();
  const { lineId } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const patch: Record<string, any> = {};
  for (const k of UPDATABLE) {
    if (!(k in body)) continue;
    const v = body[k];
    if (k === "suggested_hts") patch[k] = Array.isArray(v) ? v : [];
    else if (["quantity", "value_usd", "duty_rate", "additional_pct"].includes(k))
      patch[k] = v === "" || v == null ? null : Number(v);
    else patch[k] = typeof v === "string" && v.trim() === "" ? null : v;
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { error } = await sb.from("entry_lines").update(patch).eq("id", lineId);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/* DELETE /api/app/customs/lines/[lineId] */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ lineId: string }> }) {
  const sb = await authed();
  if (!sb) return noAuth();
  const { lineId } = await params;
  const { error } = await sb.from("entry_lines").delete().eq("id", lineId);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
