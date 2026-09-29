import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { translateToZh } from "@/lib/compliance/translate";

/* Sync regulatory updates from the Federal Register (official US source).
   Pulls the newest CBP + USTR documents, keeps only tariff/trade-relevant
   ones, and inserts new items with a link to the original notice.
   Manual trigger from the UI; the cron schedule (if Tim wants it) calls
   this same endpoint. */

const FR = "https://www.federalregister.gov/api/v1/documents.json";
const AGENCIES = [
  "u-s-customs-and-border-protection",
  "trade-representative-office-of-united-states",
];

const KEYWORDS = [
  "tariff", "duty", "duties", "section 301", "section 232",
  "harmonized", "hts", "merchandise processing", "mpf", "harbor maintenance",
  "quota", "forced labor", "uflpa", "trade remedy", "antidumping",
  "countervailing", "customs broker", "entry summary", "drawback",
];

type FrDoc = {
  title: string;
  abstract?: string;
  publication_date: string;
  html_url: string;
  type: string;
  agencies?: { name: string }[];
};

function relevant(d: FrDoc): boolean {
  const text = `${d.title} ${d.abstract ?? ""}`.toLowerCase();
  return KEYWORDS.some((k) => text.includes(k));
}

function toRow(d: FrDoc) {
  const agency = d.agencies?.[0]?.name ?? "";
  return {
    title: d.title.slice(0, 200),
    body: (d.abstract ?? "").slice(0, 2000),
    source: `${agency} · Federal Register`.slice(0, 200),
    effective_date: d.publication_date || null,
    url: d.html_url,
    auto_imported: true,
  };
}

async function authed() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user ? sb : null;
}

async function runSync(sb: any) {
  const params = new URLSearchParams({
    order: "newest",
    per_page: "40",
  });
  for (const a of AGENCIES) params.append("conditions[agencies][]", a);
  for (const f of ["title", "abstract", "publication_date", "html_url", "type", "agencies"])
    params.append("fields[]", f);

  let docs: FrDoc[] = [];
  try {
    const r = await fetch(`${FR}?${params.toString()}`, { next: { revalidate: 0 } });
    if (!r.ok) throw new Error(`federalregister ${r.status}`);
    const j = await r.json();
    docs = j.results ?? [];
  } catch (e) {
    return NextResponse.json({ error: "fetch_failed", detail: String(e) }, { status: 502 });
  }

  const rows = docs.filter(relevant).map(toRow);
  let inserted = 0;
  if (rows.length) {
    const { data, error } = await sb
      .from("compliance_updates")
      .upsert(rows, { onConflict: "url", ignoreDuplicates: true })
      .select("id");
    if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
    inserted = data?.length ?? 0;
  }
  const translated = await backfillZh(sb);
  return NextResponse.json({ ok: true, scanned: docs.length, relevant: rows.length, inserted, translated });
}

/* Translate auto-synced items missing a Chinese version (new + backlog,
   capped per run). Cached in title_zh / body_zh so each item is
   translated once. No-op without DEEPL_API_KEY. */
async function backfillZh(sb: any): Promise<number> {
  const { data } = await sb
    .from("compliance_updates")
    .select("id, title, body")
    .eq("auto_imported", true)
    .is("title_zh", null)
    .order("created_at", { ascending: false })
    .limit(12);
  if (!data?.length) return 0;
  const flat: string[] = [];
  for (const r of data) flat.push(r.title ?? "", r.body ?? "");
  const zh = await translateToZh(flat);
  let n = 0;
  for (let i = 0; i < data.length; i++) {
    const titleZh = zh[i * 2];
    const bodyZh = zh[i * 2 + 1];
    if (titleZh === data[i].title && (bodyZh ?? "") === (data[i].body ?? "")) continue; // no key / failed
    const { error } = await sb
      .from("compliance_updates")
      .update({ title_zh: titleZh, body_zh: bodyZh || null })
      .eq("id", data[i].id);
    if (!error) n++;
  }
  return n;
}

/* Throttle for unauthenticated callers (e.g. Vercel Cron): at most once
   per hour. The sync only inserts public, URL-deduped notices, so an
   outside trigger is harmless — this just prevents abuse. */
async function throttled(sb: any): Promise<boolean> {
  const { data } = await sb
    .from("compliance_updates")
    .select("created_at")
    .eq("auto_imported", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (!data?.created_at) return false;
  return Date.now() - new Date(data.created_at).getTime() < 60 * 60 * 1000;
}

export async function POST() {
  const sb = await authed();
  if (!sb) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return runSync(sb);
}

/* GET: Vercel Cron calls this weekly. Vercel auto-sends
   Authorization: Bearer $CRON_SECRET when that env var is set.
   If CRON_SECRET is not set yet, unauthenticated calls are allowed but
   throttled — the sync only inserts public, URL-deduped notices. */
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const secret = process.env.CRON_SECRET;
  const authedCron = !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
  if (secret && !authedCron) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!authedCron && (await throttled(sb)))
    return NextResponse.json({ ok: true, throttled: true });
  return runSync(sb);
}
