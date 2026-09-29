import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authV1 } from "@/lib/integrations/v1auth";

const noAuth = () =>
  NextResponse.json(
    { error: "unauthorized", hint: "Send Authorization: Bearer niel_sk_..." },
    { status: 401 }
  );

/* GET /api/v1/shipments/[id] — one shipment by GTTID, MBL or container. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authV1(req);
  if (!auth) return noAuth();
  if (!auth.scopes.includes("read")) return noAuth();

  const { id } = await params;
  const sb = await createClient();
  const { data, error } = await sb.rpc("v1_get_shipment", {
    p_company_id: auth.companyId,
    p_gttid: id,
  });
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ shipment: row });
}
