import { createClient } from "@/lib/supabase/server";

/* Session auth shared by /api/app/integrations/*. Returns the supabase
   client (RLS-enforced), the user's company id, and the user — or null
   when unauthenticated. */

export async function requireCompany() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: cid } = await sb.rpc("own_company_id");
  if (!cid) return null;
  return { sb, cid: cid as string, user };
}
