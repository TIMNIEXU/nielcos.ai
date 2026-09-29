import { NextRequest, NextResponse } from "next/server";
import { requireCompany } from "@/lib/integrations/session";
import { parseX12 } from "@/lib/integrations/x12";
import { audit } from "@/lib/integrations/audit";

const noAuth = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

/* GET /api/app/integrations/edi — inbox list (no raw text in list view). */
export async function GET() {
  const ctx = await requireCompany();
  if (!ctx) return noAuth();
  const { sb, cid } = ctx;
  const { data, error } = await sb
    .from("edi_documents")
    .select("id, kind, filename, status, created_at, parsed")
    .eq("company_id", cid)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  const docs = (data ?? []).map((d: any) => ({
    id: d.id,
    kind: d.kind,
    filename: d.filename,
    status: d.status,
    created_at: d.created_at,
    summary: summarize(d.parsed),
  }));
  return NextResponse.json({ documents: docs });
}

function summarize(parsed: any): Record<string, string> {
  if (!parsed || typeof parsed !== "object") return {};
  const h = parsed.header ?? {};
  const t = parsed.totals ?? {};
  const out: Record<string, string> = {};
  for (const k of ["poNumber", "shipmentId", "invoiceNumber", "billOfLading"]) {
    if (h[k]) out[k] = String(h[k]);
  }
  if (t.invoiceTotal) out.invoiceTotal = String(t.invoiceTotal);
  out.lines = String(Array.isArray(parsed.lines) ? parsed.lines.length : 0);
  return out;
}

/* POST /api/app/integrations/edi {filename, content} — receive + parse. */
export async function POST(req: NextRequest) {
  const ctx = await requireCompany();
  if (!ctx) return noAuth();
  const { sb, cid, user } = ctx;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const filename = String(body?.filename ?? "upload.edi").slice(0, 200);
  const content = String(body?.content ?? "");
  if (!content.trim()) return NextResponse.json({ error: "content_required" }, { status: 400 });
  if (content.length > 2_000_000) return NextResponse.json({ error: "too_large" }, { status: 413 });

  const parsed = parseX12(content);
  const status = parsed.kind === "unknown" ? "unrecognized" : "parsed";

  const { data, error } = await sb
    .from("edi_documents")
    .insert({
      company_id: cid,
      kind: parsed.kind,
      filename,
      raw_text: content.slice(0, 2_000_000),
      parsed,
      status,
    })
    .select("id, kind, filename, status, created_at")
    .single();
  if (error) return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });

  await audit(cid, user.email ?? user.id, "edi.received", "edi_document", data.id, {
    filename,
    kind: parsed.kind,
    segments: parsed.segmentCount,
  });
  return NextResponse.json({ document: { ...data, parsed, summary: summarize(parsed) } });
}
