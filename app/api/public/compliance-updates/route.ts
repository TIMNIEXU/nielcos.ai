import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* Public regulatory feed — only Federal Register auto-synced items
   (public government notices). Manually published internal updates stay
   login-only. */

export async function GET() {
  const sb = await createClient();
  const { data, error } = await sb
    .from("compliance_updates")
    .select("id, title, body, source, effective_date, url, created_at")
    .eq("auto_imported", true)
    .order("effective_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(6);
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ updates: data ?? [] });
}
