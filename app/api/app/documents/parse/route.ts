import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractDocument } from "@/lib/docExtract";

/* pdf-parse v2 -> pdfjs-dist touches DOM globals at import time. Vercel's Node
   runtime doesn't provide them, so install minimal stubs before the dynamic
   import. Text extraction never does canvas rendering, so the stubs are never
   exercised. */
function ensureDomStubs() {
  const g = globalThis as any;
  if (typeof g.DOMMatrix === "undefined") {
    g.DOMMatrix = class DOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      constructor(..._args: any[]) {}
    };
  }
  if (typeof g.ImageData === "undefined") {
    g.ImageData = class ImageData {
      width: number; height: number;
      constructor(w = 0, h = 0) { this.width = w; this.height = h; }
    };
  }
  if (typeof g.Path2D === "undefined") {
    g.Path2D = class Path2D {
      constructor(..._args: any[]) {}
    };
  }
}

/* POST { docId } — download the stored file, classify + extract, save result.
   Auth: the signed-in customer's own session (RLS enforces tenant isolation);
   no service-role key needed. */
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let docId = "";
  try {
    const body = await req.json();
    if (typeof body?.docId === "string") docId = body.docId;
  } catch {
    /* fall through to bad_request */
  }
  if (!docId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // RLS: only the user's own company row is visible.
  const { data: doc, error: docErr } = await sb
    .from("documents")
    .select("id, file_path, file_name, parse_status")
    .eq("id", docId)
    .single();
  if (docErr || !doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const fail = async (status: string, stage: string, detail = "") => {
    await sb.from("documents").update({ parse_status: status, parsed_at: new Date().toISOString() }).eq("id", docId);
    return NextResponse.json({ ok: false, parse_status: status, stage, detail: detail.slice(0, 300) });
  };

  const { data: fileData, error: dlErr } = await sb.storage
    .from("shipment-docs")
    .download(doc.file_path);
  if (dlErr || !fileData) return fail("failed", "download", dlErr?.message || "empty");

  const buf = Buffer.from(await fileData.arrayBuffer());
  if (buf.length < 5 || buf.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return fail("not_pdf", "magic-bytes");
  }

  let PDFParse: any;
  try {
    ensureDomStubs();
    await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    ({ PDFParse } = await import("pdf-parse"));
  } catch (e) {
    const msg = (e as Error)?.message || String(e);
    console.error("doc parse import error:", msg);
    return fail("failed", "import", msg);
  }

  let text = "";
  try {
    const parser = new PDFParse({ data: buf });
    const data = await parser.getText();
    await parser.destroy();
    text = data.text || "";
  } catch (e) {
    const msg = (e as Error)?.message || String(e);
    console.error("doc parse error:", msg);
    return fail("failed", "extract", msg);
  }
  if (text.trim().length < 50) return fail("no_text", "extract", `chars=${text.trim().length}`); // scanned/image-only PDF

  const result = extractDocument(text);
  const extracted = {
    fields: result.fields,
    containers: result.containers,
    charges: result.charges,
    found: result.found,
  };
  const { error: upErr } = await sb
    .from("documents")
    .update({
      doc_type: result.doc_type,
      extracted,
      parse_status: "parsed",
      parsed_at: new Date().toISOString(),
    })
    .eq("id", docId);
  if (upErr) {
    console.error("doc parse save error:", upErr.message);
    return fail("failed", "save", upErr.message);
  }
  // Webhook event: document finished AI parsing (fire-and-forget).
  try {
    const { fireWebhooks } = await import("@/lib/integrations/webhooks");
    const { data: cidRow } = await sb.rpc("own_company_id");
    if (cidRow)
      fireWebhooks(sb, cidRow as string, "document.parsed", {
        document_id: docId,
        file_name: doc.file_name,
        doc_type: result.doc_type,
      });
  } catch { /* never break the parse response */ }
  return NextResponse.json({ ok: true, doc_type: result.doc_type, extracted, parse_status: "parsed" });
}
