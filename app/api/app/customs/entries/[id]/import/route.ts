import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractLineItems, type ImportLine } from "@/lib/invoiceLines";
import { suggestHts } from "@/lib/hts";

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

export type PreviewLine = ImportLine & {
  hts_rate: number | null;
  candidates: { hts_no: string; description: string; rate: number | null; score: number }[];
};

/* POST /api/app/customs/entries/[id]/import — multipart { file: PDF } ->
   { doc_type, origin_default, lines: PreviewLine[] }.
   Preview only: nothing is saved until the user confirms in the UI. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  // tenant check (RLS): 404 when the entry is not theirs
  const { data: entry, error: entryErr } = await sb
    .from("customs_entries")
    .select("id")
    .eq("id", id)
    .single();
  if (entryErr || !entry) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch { /* fall through */ }
  if (!file) return NextResponse.json({ error: "file_required" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length < 5 || buf.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return NextResponse.json({ error: "not_pdf" }, { status: 400 });
  }

  let PDFParse: any;
  try {
    ensureDomStubs();
    await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    ({ PDFParse } = await import("pdf-parse"));
  } catch (e) {
    return NextResponse.json({ error: "import_failed", detail: "pdf engine" }, { status: 500 });
  }

  let text = "";
  try {
    const parser = new PDFParse({ data: buf });
    const data = await parser.getText();
    await parser.destroy();
    text = data.text || "";
  } catch (e) {
    return NextResponse.json({ error: "extract_failed" }, { status: 500 });
  }
  if (text.trim().length < 50) {
    return NextResponse.json({ error: "no_text", detail: "scanned/image-only PDF" }, { status: 422 });
  }

  const { doc_type, origin_default, lines } = extractLineItems(text);

  const { data: schedule } = await sb
    .from("hts_schedule")
    .select("hts_no, description, general_rate, keywords");
  const rows = schedule ?? [];
  const byHts = new Map(rows.map((r) => [r.hts_no, r]));

  const preview: PreviewLine[] = lines.map((l) => {
    let hts_rate: number | null = null;
    if (l.hts && byHts.has(l.hts)) hts_rate = byHts.get(l.hts)!.general_rate;
    const candidates = suggestHts(l.description, rows).slice(0, 3);
    return { ...l, hts_rate, candidates };
  });

  return NextResponse.json({ ok: true, doc_type, origin_default, lines: preview });
}
