import { NextRequest, NextResponse } from "next/server";
import { checkRate, clientIpHash } from "@/lib/rateLimit";
import { fetchWatchEntries } from "@/lib/adcvdData";

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

  let rows;
  try {
    rows = await fetchWatchEntries(200);
  } catch {
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }
  let matches = [...rows].sort((a, b) => a.product_keyword.localeCompare(b.product_keyword));
  if (keyword) {
    const k = keyword.toLowerCase();
    matches = matches.filter((r) => r.product_keyword.toLowerCase().includes(k));
  }
  if (origin) matches = matches.filter((r) => r.origin === origin);
  const data = matches.slice(0, limit);
  return NextResponse.json({
    ok: true,
    matches: data ?? [],
    notice:
      "Curated watchlist of known high-risk corridors — not a complete AD/CVD database. Always verify current scope at access.trade.gov or with a licensed customs broker.",
  });
}
