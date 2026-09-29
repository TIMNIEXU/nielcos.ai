import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/integrations/session";
import { audit } from "@/lib/integrations/audit";

/* DELETE /api/app/integrations/keys/[id] — revoke (soft, keeps audit trail). */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireCompany();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { sb, cid, user } = ctx;
  const { id } = await params;

  const { data, error } = await sb
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", cid)
    .is("revoked_at", null)
    .select("id, name, key_prefix")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await audit(cid, user.email ?? user.id, "api_key.revoked", "api_key", data.id, {
    name: data.name,
    prefix: data.key_prefix,
  });
  return NextResponse.json({ ok: true });
}
