import { createClient } from "@/lib/supabase/server";

/* Minimal audit trail writer. All integration actions (key issued/revoked,
   webhook created/tested/deleted, EDI received, connector requested) land
   in audit_log under the acting user's company. Never throws. */

export async function audit(
  companyId: string,
  actor: string | null,
  action: string,
  entity?: string,
  entityId?: string,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    const sb = await createClient();
    await sb.from("audit_log").insert({
      company_id: companyId,
      actor: actor ?? "system",
      action,
      entity: entity ?? null,
      entity_id: entityId ?? null,
      meta: meta ?? null,
    });
  } catch {
    /* audit must never break the request */
  }
}
