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

/* Extract plain text from PDF / Excel / Word so the line-item
   heuristics in lib/invoiceLines can work on any of them. */
async function extractText(buf: Buffer, ext: string): Promise<string> {
  if (ext === "pdf") {
    let PDFParse: any;
    ensureDomStubs();
    await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    ({ PDFParse } = await import("pdf-parse"));
    const parser = new PDFParse({ data: buf });
    try {
      const data = await parser.getText();
      return data.text || "";
    } finally {
      await parser.destroy();
    }
  }
  if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buf, { type: "buffer" });
    const out: string[] = [];
    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
      for (const r of rows) {
        const line = r.map((c) => String(c).trim()).filter(Boolean).join("   ");
        if (line) out.push(line);
      }
    }
    return out.join("\n");
  }
  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return value || "";
  }
  throw new Error("unsupported");
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
  const name = (file.name || "").toLowerCase();
  const ext = name.endsWith(".xlsx") ? "xlsx"
    : name.endsWith(".xls") ? "xls"
    : name.endsWith(".docx") ? "docx"
    : name.endsWith(".pdf") ? "pdf"
    : "";
  if (!ext) {
    return NextResponse.json({ error: "unsupported_type", detail: "use PDF, XLSX, XLS or DOCX" }, { status: 400 });
  }
  if (ext === "pdf" && (buf.length < 5 || buf.subarray(0, 5).toString("latin1") !== "%PDF-")) {
    return NextResponse.json({ error: "not_pdf" }, { status: 400 });
  }

  let text = "";
  try {
    text = await extractText(buf, ext);
  } catch (e) {
    const msg = (e as Error)?.message || "";
    if (msg === "unsupported") return NextResponse.json({ error: "unsupported_type" }, { status: 400 });
    console.error("doc import extract error:", msg);
    return NextResponse.json({ error: "extract_failed" }, { status: 500 });
  }
  if (text.trim().length < 50) {
    return NextResponse.json(
      { error: "no_text", detail: ext === "pdf" ? "scanned/image-only PDF" : "empty document" },
      { status: 422 }
    );
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
