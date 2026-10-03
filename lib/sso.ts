/* One NIEL Account — IdP helpers (nielcos.ai side).
   Central login lives here; brand sites redirect to /api/sso/authorize
   and exchange the single-use ticket server-to-server. */

import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SsoClient = {
  id: string;
  name: string;
  redirect_uris: string[];
};

export function sha256hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/** 256-bit random ticket, URL-safe. Only the hash is stored. */
export function newTicket(): string {
  return randomBytes(32).toString("base64url");
}

export async function getSsoClient(
  sb: SupabaseClient,
  clientId: string
): Promise<SsoClient | null> {
  const { data, error } = await sb
    .from("sso_clients_public")
    .select("id,name,redirect_uris")
    .eq("id", clientId)
    .maybeSingle();
  if (error || !data) return null;
  return data as SsoClient;
}

/** Exact-match allowlist check. */
export function redirectAllowed(client: SsoClient, redirectUri: string): boolean {
  return client.redirect_uris.includes(redirectUri);
}

export const TICKET_TTL_SECONDS = 120;
