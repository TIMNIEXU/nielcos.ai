import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/integrations/session";
import { generateApiKey } from "@/lib/integrations/keys";
import { audit } from "@/lib/integrations/audit";

const noAuth = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

/* GET /api/app/integrations/keys — list (hash never leaves the DB). */
export async function GET() {
  const ctx = await requireCompany();
  if (!ctx) return noAuth();
  const { sb, cid } = ctx;
  const { data, error } = await sb
    .from("api_keys")
    .select("id, name, key_prefix, scopes, last_used_at, revoked_at, created_at")
    .eq("company_id", cid)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ keys: data ?? [] });
}

/* POST /api/app/integrations/keys {name, scopes?} — issue a key.
   The raw key is returned exactly once. */
export async function POST(req: NextRequest) {
  const ctx = await requireCompany();
  if (!ctx) return noAuth();
  const { sb, cid, user } = ctx;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const name = String(body?.name ?? "").trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });
  const scopes = Array.isArray(body?.scopes) && body.scopes.includes("write") ? ["read", "write"] : ["read"];

  const { key, hash, prefix } = generateApiKey();
  const { data, error } = await sb
    .from("api_keys")
    .insert({
      company_id: cid,
      name,
      key_hash: hash,
      key_prefix: prefix,
      scopes,
      created_by: user.id,
    })
    .select("id, name, key_prefix, scopes, created_at")
    .single();
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });

  await audit(cid, user.email ?? user.id, "api_key.created", "api_key", data.id, { name, prefix, scopes });
  return NextResponse.json({ key: data, raw: key });
}
