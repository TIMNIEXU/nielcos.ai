import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authV1 } from "@/lib/integrations/v1auth";

const noAuth = () =>
  NextResponse.json(
    { error: "unauthorized", hint: "Send Authorization: Bearer niel_sk_..." },
    { status: 401 }
  );

/* GET /api/v1/documents — list the key owner's document metadata. */
export async function GET(req: NextRequest) {
  const auth = await authV1(req);
  if (!auth) return noAuth();
  if (!auth.scopes.includes("read")) return noAuth();

  const sb = await createClient();
  const { data, error } = await sb.rpc("v1_list_documents", {
    p_company_id: auth.companyId,
  });
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ documents: data ?? [] });
}
