import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRate, clientIpHash } from "@/lib/rateLimit";

/* GET /api/public/ad-cvd-watch?keyword=aluminum&origin=China — public, no login.
   Curated high-risk corridor watchlist. This is NOT a complete AD/CVD
   database — the response always says so. Verify scope via access.trade.gov. */

export async function GET(req: NextRequest) {
  const ipHash = clientIpHash(req);
  if (!(await checkRate(ipHash, "ad-cvd-watch", 30, 60))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  const q = req.nextUrl.searchParams;
  const keyword = (q.get("keyword") ?? "").trim().slice(0, 80);
  const origin = (q.get("origin") ?? "").trim().slice(0, 40);
  const limit = Math.min(Math.max(parseInt(q.get("limit") ?? "20", 10) || 20, 1), 100);

  const sb = await createClient();
  let query = sb
    .from("ad_cvd_watch")
    .select("product_keyword, hts_prefix, origin, case_type, status, note")
    .order("product_keyword");
  if (keyword) query = query.ilike("product_keyword", `%${keyword.replace(/[%_]/g, "")}%`);
  if (origin) query = query.eq("origin", origin);
  const { data, error } = await query.limit(limit);
  if (error) return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  return NextResponse.json({
    ok: true,
    matches: data ?? [],
    notice:
      "Curated watchlist of known high-risk corridors — not a complete AD/CVD database. Always verify current scope at access.trade.gov or with a licensed customs broker.",
  });
}
