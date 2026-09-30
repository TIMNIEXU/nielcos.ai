import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* GET /api/app/search?q=...&locale=...
   Contract (agreed with track C):
   { results: [{ type: 'trade'|'shipment'|'entry'|'document',
                 id: string, title: string, subtitle?: string, href: string }] }
   Searches the signed-in tenant's own rows (RLS enforced by the user session).
   The trades table may not exist yet (track E) — it is probed defensively and
   skipped on error, never failing the request. */

const LOCALES = new Set(["en", "zh-CN", "zh-TW", "vi", "ko", "ja"]);

type Result = {
  type: "trade" | "shipment" | "entry" | "document";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export async function GET(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  // strip PostgREST filter metacharacters so the .or() expression can't break
  const q = (url.searchParams.get("q") ?? "").replace(/[,()\\]/g, "").trim();
  const localeParam = url.searchParams.get("locale") ?? "";
  const locale = LOCALES.has(localeParam) ? localeParam : "en";
  if (q.length === 0) return NextResponse.json({ results: [] });

  const like = `%${q}%`;
  const results: Result[] = [];

  // shipments: gttid / container_number / mbl_no
  const { data: ships } = await sb
    .from("shipments")
    .select("id, gttid, container_number, mbl_no, origin, destination")
    .or(`gttid.ilike.${like},container_number.ilike.${like},mbl_no.ilike.${like}`)
    .order("updated_at", { ascending: false })
    .limit(5);
  for (const s of ships ?? []) {
    const route = [s.origin, s.destination].filter(Boolean).join(" → ");
    const bits = [s.container_number, route].filter(Boolean).join(" · ");
    results.push({
      type: "shipment",
      id: String(s.id),
      title: s.gttid ?? s.container_number ?? "",
      subtitle: bits || undefined,
      href: `/${locale}/app/${s.gttid ?? ""}`,
    });
  }

  // customs entries: entry_no
  const { data: entries } = await sb
    .from("customs_entries")
    .select("id, entry_no, status, shipment_id")
    .ilike("entry_no", like)
    .order("updated_at", { ascending: false })
    .limit(5);
  for (const e of entries ?? []) {
    results.push({
      type: "entry",
      id: String(e.id),
      title: e.entry_no ?? "",
      subtitle: e.status || undefined,
      href: `/${locale}/app/customs`,
    });
  }

  // documents: file_name
  const { data: docs } = await sb
    .from("documents")
    .select("id, file_name")
    .ilike("file_name", like)
    .order("created_at", { ascending: false })
    .limit(5);
  for (const d of docs ?? []) {
    results.push({
      type: "document",
      id: String(d.id),
      title: d.file_name ?? "",
      href: `/${locale}/app/documents`,
    });
  }

  // trades: trade_no (table may not exist yet — skip quietly on error)
  try {
    const { data: trades, error } = await sb
      .from("trades")
      .select("id, trade_no")
      .ilike("trade_no", like)
      .limit(5);
    if (!error) {
      for (const tr of trades ?? []) {
        results.push({
          type: "trade",
          id: String((tr as { id: unknown }).id),
          title: (tr as { trade_no?: string }).trade_no ?? "",
          href: `/${locale}/app/trades`,
        });
      }
    }
  } catch {
    /* trades table not provisioned yet (track E) */
  }

  return NextResponse.json({ results });
}
