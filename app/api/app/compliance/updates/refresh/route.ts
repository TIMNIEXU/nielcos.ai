import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

const noAuth = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

export async function POST() {
  const sb = await authed();
  if (!sb) return noAuth();

  const params = new URLSearchParams({
    order: "newest",
    per_page: "40",
    "fields[]": ["title", "abstract", "publication_date", "html_url", "type", "agencies"].join(","),
  });
  for (const a of AGENCIES) params.append("conditions[agencies][]", a);
  // fields[] needs repeating, not comma-joined
  params.delete("fields[]");
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
  return NextResponse.json({ ok: true, scanned: docs.length, relevant: rows.length, inserted });
}
