import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* Public: metadata + AI-extracted fields for a shared document version.
   No login. RLS ("share link read") only exposes rows with an active,
   unexpired share_token. The file bytes stay private (login required). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const sb = await createClient();
  const { data, error } = await sb
    .from("documents")
    .select(
      "id, file_name, file_size, doc_type, extracted, parse_status, version_no, created_at, share_expires_at"
    )
    .eq("share_token", token)
    .maybeSingle();

  if (error || !data)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: gttid } = await sb.rpc("shared_doc_gttid", { p_token: token });

  return NextResponse.json({ doc: { ...data, gttid: gttid ?? null } });
}
