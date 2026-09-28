import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* Customs Phase 1 API — all routes use the signed-in user's session;
   Supabase RLS enforces tenant isolation (company_id = own_company_id()). */

async function authed() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await sb.from("profiles").select("company_id").eq("id", user.id).single();
  return { sb, companyId: profile?.company_id as string | undefined };
}

const noAuth = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

/* GET /api/app/customs/entries — list own company's entries */
export async function GET() {
  const a = await authed();
  if (!a) return noAuth();
  const { data, error } = await a.sb
    .from("customs_entries")
    .select("id, entry_no, importer_name, status, milestones, notes, created_at, updated_at, shipment_id")
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}

/* POST /api/app/customs/entries — create a new entry workbook */
export async function POST(req: NextRequest) {
  const a = await authed();
  if (!a) return noAuth();
  if (!a.companyId) return NextResponse.json({ error: "no_company" }, { status: 400 });
  let body: any = {};
  try {
    body = await req.json();
  } catch { /* empty body ok */ }
  const { data, error } = await a.sb
    .from("customs_entries")
    .insert({
      company_id: a.companyId,
      entry_no: (body.entry_no ?? "").trim() || null,
      importer_name: (body.importer_name ?? "").trim() || null,
      shipment_id: body.shipment_id || null,
      notes: (body.notes ?? "").trim() || null,
    })
    .select("id")
    .single();
  if (error) {
    const dup = error.code === "23505";
    return NextResponse.json(
      { error: dup ? "duplicate_entry_no" : "db_error", detail: error.message },
      { status: dup ? 409 : 500 }
    );
  }
  return NextResponse.json({ id: data.id });
}
