import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function authed() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  return sb;
}

const noAuth = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

const UPDATABLE = [
  "description",
  "quantity",
  "value_usd",
  "suggested_hts",
  "confirmed_hts",
  "duty_rate",
  "additional_pct",
  "material",
  "origin_country",
  "hts_source",
  "sku",
] as const;

/* Write the passport event for one concrete line state. */
async function writePassportEvent(
  sb: Awaited<ReturnType<typeof createClient>>,
  entryId: string,
  companyId: string,
  line: { sku: string | null; confirmed_hts: string | null; duty_rate: number | null; additional_pct: number | null; value_usd: number | null }
) {
  const sku = (line.sku ?? "").trim();
  const hts = (line.confirmed_hts ?? "").trim();
  if (!sku || !hts) return;
  // only catalog SKUs feed the passport — no orphan events
  const { data: prod } = await sb
    .from("products")
    .select("id")
    .eq("company_id", companyId)
    .eq("sku", sku)
    .maybeSingle();
  if (!prod) return;
  const total = (Number(line.duty_rate) || 0) + (Number(line.additional_pct) || 0);
  await sb.from("product_events").insert({
    company_id: companyId,
    sku,
    entry_id: entryId,
    event_type: "entry_filed",
    hts_code: hts,
    duty_rate: total,
    customs_value: line.value_usd ?? 0,
    occurred_at: new Date().toISOString(),
  });
}

/* PATCH /api/app/customs/lines/[lineId] — confirm HTS, edit rate, etc. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ lineId: string }> }) {
  const sb = await authed();
  if (!sb) return noAuth();
  const { lineId } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const patch: Record<string, any> = {};
  for (const k of UPDATABLE) {
    if (!(k in body)) continue;
    const v = body[k];
    if (k === "suggested_hts") patch[k] = Array.isArray(v) ? v : [];
    else if (["quantity", "value_usd", "duty_rate", "additional_pct"].includes(k))
      patch[k] = v === "" || v == null ? null : Number(v);
    else patch[k] = typeof v === "string" && v.trim() === "" ? null : v;
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // capture pre-update sku so a sku change also clears the old event
  const { data: before } = await sb
    .from("entry_lines")
    .select("entry_id, sku")
    .eq("id", lineId)
    .maybeSingle();

  const { error } = await sb.from("entry_lines").update(patch).eq("id", lineId);
  if (error) {
    // passport_v1.sql not run yet -> sku column missing: retry without it so
    // existing line editing keeps working; the sku link applies after migration
    if ("sku" in patch && /sku/i.test(error.message)) {
      const { sku: _dropped, ...rest } = patch;
      if (Object.keys(rest).length) {
        const retry = await sb.from("entry_lines").update(rest).eq("id", lineId);
        if (retry.error)
          return NextResponse.json({ error: "db_error", detail: retry.error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, passport_pending: true });
    }
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }

  // 6a passport sync (best-effort)
  try {
    const { data: after } = await sb
      .from("entry_lines")
      .select("entry_id, sku, confirmed_hts, duty_rate, additional_pct, value_usd")
      .eq("id", lineId)
      .maybeSingle();
    if (after?.entry_id) {
      const { data: entry } = await sb
        .from("customs_entries")
        .select("company_id")
        .eq("id", after.entry_id)
        .maybeSingle();
      const cid = entry?.company_id as string | undefined;
      if (cid) {
        const touched = [before?.sku, after.sku];
        const uniq = [...new Set(touched.map((s) => (s ?? "").trim()).filter(Boolean))];
        for (const sku of uniq) {
          await sb
            .from("product_events")
            .delete()
            .eq("company_id", cid)
            .eq("entry_id", after.entry_id)
            .eq("sku", sku)
            .eq("event_type", "entry_filed");
        }
        await writePassportEvent(sb, after.entry_id, cid, after);
      }
    }
  } catch {
    /* passport sync must never break the line update */
  }
  return NextResponse.json({ ok: true });
}

/* DELETE /api/app/customs/lines/[lineId] */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ lineId: string }> }) {
  const sb = await authed();
  if (!sb) return noAuth();
  const { lineId } = await params;
  const { data: before } = await sb
    .from("entry_lines")
    .select("entry_id, sku")
    .eq("id", lineId)
    .maybeSingle();
  const { error } = await sb.from("entry_lines").delete().eq("id", lineId);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  // drop the passport event that belonged to this line
  try {
    const sku = (before?.sku ?? "").trim();
    if (before?.entry_id && sku) {
      const { data: entry } = await sb
        .from("customs_entries")
        .select("company_id")
        .eq("id", before.entry_id)
        .maybeSingle();
      const cid = entry?.company_id as string | undefined;
      if (cid) {
        await sb
          .from("product_events")
          .delete()
          .eq("company_id", cid)
          .eq("entry_id", before.entry_id)
          .eq("sku", sku)
          .eq("event_type", "entry_filed");
      }
    }
  } catch {
    /* ignore */
  }
  return NextResponse.json({ ok: true });
}
