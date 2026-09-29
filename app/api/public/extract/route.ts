import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  extractSheetRows,
  extractLineItems,
  detectMaterial,
  type ImportLine,
} from "@/lib/invoiceLines";
import { suggestHts } from "@/lib/hts";

/* POST /api/public/extract — public, no login.
   Multipart form { file }: PDF / XLSX / XLS / DOCX commercial document.
   Extracts the first product line (name, material, intended use, origin,
   total invoice value) and suggests HTS candidates — feeds the homepage
   duty estimator. In-memory only: nothing is stored, no DB writes.
   8 MB cap; magic-bytes validated. */

const MAX_BYTES = 8 * 1024 * 1024;

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

function splitUse(description: string): { name: string; use: string } {
  const m = description.match(/（用途[:：]\s*([^）]+)）/);
  if (!m) return { name: description.trim(), use: "" };
  return {
    name: description.replace(m[0], "").replace(/\s{2,}/g, " ").trim(),
    use: m[1].trim(),
  };
}

export async function POST(req: NextRequest) {
  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch { /* fall through */ }
  if (!file) return NextResponse.json({ ok: false, error: "no_file" }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ ok: false, error: "too_big" }, { status: 400 });

  const name = (file.name || "").toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length < 4) return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });

  const magic4 = buf.subarray(0, 4).toString("latin1");
  const isPdf = magic4.startsWith("%PDF");
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
  const isOle = buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0;
  const ext = name.endsWith(".pdf") ? "pdf" : name.endsWith(".docx") ? "docx" : name.endsWith(".xlsx") || name.endsWith(".xls") ? "xlsx" : "";

  if (!ext || (ext === "pdf" && !isPdf) || (ext === "docx" && !isZip) || (ext === "xlsx" && !(isZip || isOle)))
    return NextResponse.json({ ok: false, error: "unsupported_type" }, { status: 400 });

  let lines: ImportLine[] = [];
  try {
    if (ext === "xlsx") {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(buf, { type: "buffer" });
      const sheets: string[][][] = wb.SheetNames.map((sn: string) => {
        const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: false, defval: "" });
        return rows.map((r) => r.map((c) => String(c ?? "")));
      });
      const r = extractSheetRows(sheets);
      lines = r?.lines ?? [];
    } else if (ext === "docx") {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer: buf });
      lines = extractLineItems(value).lines;
    } else {
      ensureDomStubs();
      await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buf });
      const data = await parser.getText();
      await parser.destroy();
      const text = data.text || "";
      if (text.trim().length < 50)
        return NextResponse.json({ ok: false, error: "no_text" }, { status: 422 });
      lines = extractLineItems(text).lines;
    }
  } catch (e) {
    console.error("public extract error:", (e as Error)?.message);
    return NextResponse.json({ ok: false, error: "parse_failed" }, { status: 422 });
  }

  const usable = lines.filter((l) => l.description && l.description.trim());
  if (!usable.length)
    return NextResponse.json({ ok: false, error: "no_lines" }, { status: 422 });

  const first = usable[0];
  const { name: productName, use: intendedUse } = splitUse(first.description);
  const material = first.material || detectMaterial(first.description);
  const totalValue = usable.reduce((s, l) => s + (l.value_usd || 0), 0);

  // HTS: printed on doc wins; otherwise keyword candidates from name+material.
  let hts: string | null = first.hts;
  let htsCandidates: { hts_no: string; description: string; rate: number | null }[] = [];
  if (!hts) {
    const sb = await createClient();
    const { data: rows } = await sb
      .from("hts_schedule")
      .select("hts_no, description, general_rate, keywords, rate_text");
    htsCandidates = suggestHts(`${productName} ${material}`, (rows ?? []) as any[])
      .slice(0, 3)
      .map((c: any) => ({ hts_no: c.hts_no, description: c.description, rate: c.rate ?? null }));
  }

  return NextResponse.json({
    ok: true,
    lineCount: usable.length,
    productName,
    material,
    intendedUse,
    origin: first.origin || "",
    invValue: totalValue > 0 ? Math.round(totalValue * 100) / 100 : 0,
    hts,
    htsCandidates,
  });
}
