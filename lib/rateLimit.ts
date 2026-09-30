import { createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";

/* GRI-001 V2 — DB-backed rate limiting for public AI endpoints.
   ai_check_rate() is SECURITY DEFINER: atomic check-and-log, so it works
   across serverless instances. Fails open (logs) so a DB hiccup never
   kills the lead-gen tool. */

export function clientIpHash(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = (fwd?.split(",")[0] ?? "").trim() || "unknown";
  return createHash("sha256").update(`niel-ai|${ip}`).digest("hex").slice(0, 32);
}

export async function checkRate(
  ipHash: string,
  endpoint: string,
  limit: number,
  windowMinutes: number
): Promise<boolean> {
  try {
    const sb = await createClient();
    const { data, error } = await sb.rpc("ai_check_rate", {
      p_ip_hash: ipHash,
      p_endpoint: endpoint,
      p_limit: limit,
      p_window_minutes: windowMinutes,
    });
    if (error) {
      console.error("ai rate check error:", error.message);
      return true; // fail open
    }
    return data === true;
  } catch (e) {
    console.error("ai rate check exception:", (e as Error)?.message);
    return true; // fail open
  }
}

export async function saveImportPlan(
  input: string,
  locale: string,
  plan: unknown,
  ipHash: string
): Promise<void> {
  try {
    const sb = await createClient();
    await sb.rpc("ai_save_plan", {
      p_input: input.slice(0, 2000),
      p_locale: locale,
      p_plan: plan as any,
      p_ip_hash: ipHash,
    });
  } catch (e) {
    console.error("ai_save_plan failed:", (e as Error)?.message);
  }
}
