import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hashKey } from "./keys";

/* Authenticates /api/v1/* requests with `Authorization: Bearer niel_sk_...`.
   The key hash is validated through the SECURITY DEFINER auth_api_key()
   function, which is the only thing allowed to read api_keys without a
   user JWT. Returns the owning company + scopes, or null. */

export type V1Auth = {
  keyId: string;
  companyId: string;
  scopes: string[];
};

export async function authV1(req: NextRequest): Promise<V1Auth | null> {
  const hdr = req.headers.get("authorization") ?? "";
  const m = hdr.match(/^Bearer\s+(niel_sk_[A-Za-z0-9_-]+)\s*$/);
  if (!m) return null;
  const sb = await createClient();
  const { data, error } = await sb.rpc("auth_api_key", {
    p_hash: hashKey(m[1]),
  });
  if (error || !data || (Array.isArray(data) && data.length === 0)) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.company_id) return null;
  // Fire-and-forget usage stamp; never blocks the request.
  sb.rpc("touch_api_key", { p_hash: hashKey(m[1]) }).then(
    () => {},
    () => {}
  );
  return {
    keyId: row.key_id as string,
    companyId: row.company_id as string,
    scopes: (row.scopes as string[]) ?? ["read"],
  };
}
