import { NextRequest, NextResponse } from "next/server";
import { checkRate, clientIpHash } from "@/lib/rateLimit";
import {
  lookupContainer,
  t49Configured,
  T49Error,
  type TrackRequestType,
} from "@/lib/terminal49";

/* GET /api/public/container-track?type=container&number=MSKU1234567
   Public container lookup (Terminal49). Returns normalized release status:
   customs release, carrier release, pickup readiness, LFD, fees, timeline.
   Results are cached briefly per number to protect the account quota. */

type Cached = { at: number; ttl: number; body: any };
const cache = new Map<string, Cached>();

const TYPES = new Set(["container", "bill_of_lading", "booking_number"]);

function cleanNumber(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
}

function validNumber(type: TrackRequestType, n: string): boolean {
  if (type === "container") return /^[A-Z]{4}\d{7}$/.test(n);
  return /^[A-Z0-9]{6,32}$/.test(n);
}

export async function GET(req: NextRequest) {
  const ipHash = clientIpHash(req);
  if (!(await checkRate(ipHash, "container-track", 30, 60))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  const q = req.nextUrl.searchParams;
  const typeRaw = (q.get("type") ?? "container").trim();
  const type = (TYPES.has(typeRaw) ? typeRaw : "container") as TrackRequestType;
  const number = cleanNumber(q.get("number") ?? "");
  if (!validNumber(type, number)) {
    return NextResponse.json({ ok: false, error: "invalid_number" }, { status: 400 });
  }
  if (!t49Configured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const key = `${type}:${number}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) {
    return NextResponse.json(hit.body);
  }

  try {
    const result = await lookupContainer(type, number);
    const body =
      result.status === "ready"
        ? {
            ok: true,
            status: "ready",
            shipment: result.shipment,
            containers: result.containers,
            fetched_at: result.fetched_at,
            source: "Terminal49",
          }
        : { ok: true, status: "processing", fetched_at: result.fetched_at, source: "Terminal49" };
    cache.set(key, {
      at: Date.now(),
      ttl: result.status === "ready" ? 5 * 60_000 : 15_000,
      body,
    });
    return NextResponse.json(body);
  } catch (e) {
    if (e instanceof T49Error) {
      const status =
        e.code === "invalid_number" ? 422 : e.code === "not_found" ? 404 : e.status;
      return NextResponse.json({ ok: false, error: e.code }, { status });
    }
    console.error("container-track error:", (e as Error)?.message);
    return NextResponse.json({ ok: false, error: "upstream_error" }, { status: 502 });
  }
}
