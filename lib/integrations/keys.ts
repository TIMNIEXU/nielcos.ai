import { createHash, randomBytes } from "crypto";

/* API key issuance. The raw key is shown once and never stored;
   only its SHA-256 hash lives in api_keys.key_hash. */

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = "niel_sk_" + randomBytes(32).toString("base64url");
  return { key, hash: hashKey(key), prefix: key.slice(0, 14) };
}

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateWebhookSecret(): string {
  return "whsec_" + randomBytes(24).toString("base64url");
}
