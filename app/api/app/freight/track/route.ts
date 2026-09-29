import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* Freight tracking search — signed-in customer's own shipments only
   (RLS: company_id = own_company_id()). Matches MBL / container /
   GTTID, including any container inside the multi-container JSONB. */

async function authed() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  return sb;
}

const noAuth = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

/* GET /api/app/freight/track?q= */
export async function GET(req: NextRequest) {
  const sb = await authed();
  if (!sb) return noAuth();
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toUpperCase();
  if (q.length < 3) return NextResponse.json({ shipments: [] });

  const { data, error } = await sb
    .from("shipments")
    .select(
      "id, gttid, mbl_no, container_number, containers, status, origin, destination, current_location, eta, milestones, updated_at"
    )
    .or(`mbl_no.ilike.%${q}%,container_number.ilike.%${q}%,gttid.ilike.%${q}%`)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });

  // Also match containers inside the multi-container JSONB array.
  let extra: any[] = [];
  if ((data ?? []).length < 20) {
    const { data: all } = await sb
      .from("shipments")
      .select(
        "id, gttid, mbl_no, container_number, containers, status, origin, destination, current_location, eta, milestones, updated_at"
      )
      .order("updated_at", { ascending: false })
      .limit(50);
    const ids = new Set((data ?? []).map((d: any) => d.id));
    extra = (all ?? []).filter((s: any) => {
      if (ids.has(s.id)) return false;
      const cntrs: any[] = Array.isArray(s.containers) ? s.containers : [];
      return cntrs.some((c) => String(c?.container ?? c ?? "").toUpperCase().includes(q));
    });
  }

  return NextResponse.json({ shipments: [...(data ?? []), ...extra].slice(0, 20) });
}
