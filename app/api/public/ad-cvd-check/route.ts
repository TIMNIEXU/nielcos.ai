import { NextRequest, NextResponse } from "next/server";
import { checkRate, clientIpHash } from "@/lib/rateLimit";
import { fetchWatchEntries } from "@/lib/adcvdData";
import { checkAdCvdRisk } from "@/lib/adcvd";

/* GET /api/public/ad-cvd-check?product=aluminum+heat+sink&origin=China&hts=761699&manufacturer=X&exporter=Y
   Public AD/CVD risk screening. Deterministic, no LLM.
   Returns a risk assessment — NEVER a "not subject" determination. */

export async function GET(req: NextRequest) {
  const ipHash = clientIpHash(req);
  if (!(await checkRate(ipHash, "ad-cvd-check", 30, 60))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  const q = req.nextUrl.searchParams;
  const product = (q.get("product") ?? "").trim().slice(0, 300);
  if (!product) {
    return NextResponse.json({ ok: false, error: "product_required" }, { status: 400 });
  }
  const origin = (q.get("origin") ?? "").trim().slice(0, 60);
  const hts = (q.get("hts") ?? "").trim().slice(0, 20);
  const manufacturer = (q.get("manufacturer") ?? "").trim().slice(0, 120);
  const exporter = (q.get("exporter") ?? "").trim().slice(0, 120);

  let rows;
  try {
    rows = await fetchWatchEntries(200);
  } catch {
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  const result = checkAdCvdRisk(rows, {
    product,
    origin,
    hts,
    manufacturer,
    exporter,
  });

  return NextResponse.json({
    ok: true,
    ...result,
    notice:
      "Screening result only — HTS is a screening signal, not the determinant. Scope is order-specific: verify the current scope, exclusions, and exporter cash-deposit rate at IA ACCESS (access.trade.gov) or with a licensed customs broker before entry.",
  });
}
