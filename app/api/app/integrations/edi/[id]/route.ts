import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/integrations/session";

/* GET /api/app/integrations/edi/[id] — full document incl. raw text. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireCompany();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { sb, cid } = ctx;
  const { id } = await params;

  const { data, error } = await sb
    .from("edi_documents")
    .select("id, kind, filename, raw_text, parsed, status, created_at")
    .eq("id", id)
    .eq("company_id", cid)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ document: data });
}
