import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

const HEADERS: Record<string, string> = {
  container_number: "container_number", "container*": "container_number",
  "柜号": "container_number", "箱号": "container_number", "container": "container_number",
  mbl: "mbl", "mb/l": "mbl", "主提单": "mbl",
  gttid: "gttid",
  move_type: "move_type", "类型": "move_type", "type": "move_type",
  origin: "origin", "起点": "origin", "提柜点": "origin",
  destination: "destination", "终点": "destination", "送货点": "destination",
  carrier: "carrier", "承运人": "carrier", "车队": "carrier",
  driver_name: "driver_name", "司机": "driver_name", "driver": "driver_name",
  truck_plate: "truck_plate", "车牌": "truck_plate",
  scheduled_date: "scheduled_date", "计划日期": "scheduled_date", "日期": "scheduled_date",
  last_free_day: "last_free_day", "免费用箱截止": "last_free_day", "last free day": "last_free_day",
  demurrage_rate: "demurrage_rate", "滞箱费率": "demurrage_rate",
  notes: "notes", "备注": "notes",
};

function num(v: any): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/* POST /api/app/logistics/moves/import — multipart .xlsx.
   Upserts on (company_id, container_number, scheduled_date). */
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: cid } = await sb.rpc("own_company_id");
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch { /* fall through */ }
  if (!file) return NextResponse.json({ error: "no_file" }, { status: 400 });

  let rows: Record<string, any>[];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
  } catch {
    return NextResponse.json({ error: "parse_failed" }, { status: 400 });
  }

  let imported = 0, updated = 0, skipped = 0;
  for (const r of rows) {
    const norm: Record<string, any> = {};
    for (const [k, v] of Object.entries(r)) {
      const key = HEADERS[String(k).trim().toLowerCase()];
      if (key) norm[key] = String(v ?? "").trim();
    }
    const container = norm.container_number?.toUpperCase()?.trim();
    if (!container) { skipped++; continue; }
    const payload = {
      company_id: cid as string,
      container_number: container,
      mbl: norm.mbl || null,
      gttid: norm.gttid || null,
      move_type: ["pickup", "delivery", "reposition"].includes(norm.move_type?.toLowerCase())
        ? norm.move_type.toLowerCase() : "delivery",
      origin: norm.origin || null,
      destination: norm.destination || null,
      carrier: norm.carrier || null,
      driver_name: norm.driver_name || null,
      truck_plate: norm.truck_plate || null,
      scheduled_date: norm.scheduled_date || null,
      last_free_day: norm.last_free_day || null,
      demurrage_rate: num(norm.demurrage_rate),
      notes: norm.notes || null,
      updated_at: new Date().toISOString(),
    };
    let q = sb.from("drayage_moves").select("id").eq("company_id", cid as string).eq("container_number", container);
    q = payload.scheduled_date ? q.eq("scheduled_date", payload.scheduled_date) : q.is("scheduled_date", null);
    const { data: existing } = await q.maybeSingle();
    if (existing) {
      const { error } = await sb.from("drayage_moves").update(payload).eq("id", existing.id);
      if (error) { skipped++; continue; }
      updated++;
    } else {
      const { error } = await sb.from("drayage_moves").insert({ ...payload, status: "scheduled" });
      if (error) { skipped++; continue; }
      imported++;
    }
  }
  return NextResponse.json({ imported, updated, skipped });
}
