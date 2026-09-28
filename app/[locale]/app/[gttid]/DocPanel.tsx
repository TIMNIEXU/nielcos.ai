"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";

type Extracted = {
  fields?: Record<string, string>;
  containers?: { container: string }[];
  charges?: { description: string; amount: number }[];
};

type Doc = {
  id: string;
  file_name: string;
  file_path: string;
  file_size?: number | null;
  created_at: string;
  doc_type?: string | null;
  parse_status?: string | null;
  extracted?: Extracted | null;
};

const MAX_MB = 20;

const TYPE_TONE: Record<string, string> = {
  arrival_notice: "bg-blue-50 text-blue-700 border-blue-200",
  bill_of_lading: "bg-violet-50 text-violet-700 border-violet-200",
  commercial_invoice: "bg-emerald-50 text-emerald-700 border-emerald-200",
  packing_list: "bg-amber-50 text-amber-700 border-amber-200",
  other: "bg-slate-100 text-slate-600 border-slate-200",
};

const TYPE_KEY: Record<string, string> = {
  arrival_notice: "docTypeArrivalNotice",
  bill_of_lading: "docTypeBillOfLading",
  commercial_invoice: "docTypeCommercialInvoice",
  packing_list: "docTypePackingList",
  other: "docTypeOther",
};

function fmtNum(v: string): string {
  const n = parseFloat(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n.toLocaleString("en-US") : v;
}

export default function DocPanel({
  companyId,
  shipmentId,
  docs,
}: {
  companyId: string;
  shipmentId: string;
  docs: Doc[];
}) {
  const t = useTranslations("app");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [parsingIds, setParsingIds] = useState<Set<string>>(new Set());

  async function runParse(docId: string) {
    setParsingIds((s) => new Set(s).add(docId));
    try {
      await fetch("/api/app/documents/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ docId }),
      });
    } catch {
      /* status stays on the row; user can retry */
    }
    setParsingIds((s) => {
      const n = new Set(s);
      n.delete(docId);
      return n;
    });
    router.refresh();
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(false);
    if (file.size > MAX_MB * 1024 * 1024) {
      setErr(true);
      return;
    }
    setBusy(true);
    try {
      const sb = createClient();
      const path = `${companyId}/${shipmentId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await sb.storage
        .from("shipment-docs")
        .upload(path, file);
      if (upErr) throw upErr;
      const { data: inserted, error: dbErr } = await sb
        .from("documents")
        .insert({
          company_id: companyId,
          shipment_id: shipmentId,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
        })
        .select("id")
        .single();
      if (dbErr) throw dbErr;
      router.refresh();
      // Fire-and-forget AI classification + extraction.
      if (inserted?.id) runParse(inserted.id);
    } catch {
      setErr(true);
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function download(doc: Doc) {
    const sb = createClient();
    const { data, error } = await sb.storage
      .from("shipment-docs")
      .createSignedUrl(doc.file_path, 300);
    if (!error && data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function remove(doc: Doc) {
    if (!confirm(doc.file_name)) return;
    const sb = createClient();
    await sb.storage.from("shipment-docs").remove([doc.file_path]);
    await sb.from("documents").delete().eq("id", doc.id);
    router.refresh();
  }

  function summary(doc: Doc): string | null {
    const f = doc.extracted?.fields ?? {};
    const nCtn = doc.extracted?.containers?.length ?? 0;
    const parts: string[] = [];
    switch (doc.doc_type) {
      case "arrival_notice":
        if (f.mbl_no) parts.push(`MBL ${f.mbl_no}`);
        if (nCtn) parts.push(t("summaryContainers", { n: nCtn }));
        if (f.eta) parts.push(`ETA ${f.eta}`);
        break;
      case "bill_of_lading":
        if (f.mbl_no) parts.push(`MBL ${f.mbl_no}`);
        if (f.vessel_voyage) parts.push(f.vessel_voyage);
        if (nCtn) parts.push(t("summaryContainers", { n: nCtn }));
        break;
      case "commercial_invoice":
        if (f.invoice_no) parts.push(f.invoice_no);
        if (f.total_amount) parts.push(`${f.currency || ""} ${fmtNum(f.total_amount)}`.trim());
        break;
      case "packing_list":
        if (f.total_packages) parts.push(t("summaryPackages", { n: fmtNum(f.total_packages) }));
        if (f.gross_weight_kg) parts.push(`${fmtNum(f.gross_weight_kg)} KGS`);
        if (f.measurement_cbm) parts.push(`${fmtNum(f.measurement_cbm)} CBM`);
        break;
      default:
        return null;
    }
    return parts.length ? parts.join(" · ") : null;
  }

  function statusLine(doc: Doc) {
    const isParsing = parsingIds.has(doc.id);
    if (isParsing || doc.parse_status === "pending") {
      return (
        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-brand">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
          {t("parsing")}
        </p>
      );
    }
    if (doc.parse_status === "no_text")
      return <p className="mt-1 text-xs text-ink-soft/70">{t("parseNoText")}</p>;
    if (doc.parse_status === "not_pdf")
      return <p className="mt-1 text-xs text-ink-soft/70">{t("parseNotPdf")}</p>;
    if (doc.parse_status === "failed")
      return (
        <p className="mt-1 text-xs text-red-600">
          {t("parseFailed")}{" "}
          <button type="button" onClick={() => runParse(doc.id)} className="font-semibold underline">
            {t("reparse")}
          </button>
        </p>
      );
    const s = doc.doc_type ? summary(doc) : null;
    if (s) return <p className="mt-1 text-xs text-ink-soft">{s}</p>;
    return null;
  }

  return (
    <div className="mt-4">
      <input ref={fileRef} type="file" className="hidden" onChange={upload}
        accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx" />
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-deep disabled:opacity-60"
      >
        {busy ? t("uploading") : t("upload")}
      </button>
      <p className="mt-2 text-xs text-ink-soft/70">{t("uploadHint")}</p>
      {err && <p className="mt-2 text-sm text-red-600">{t("error") ?? "Upload failed."}</p>}

      <ul className="mt-4 divide-y divide-line-soft">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                <span className="truncate">{d.file_name}</span>
                {d.doc_type && (
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${TYPE_TONE[d.doc_type] ?? TYPE_TONE.other}`}
                  >
                    {t(TYPE_KEY[d.doc_type] ?? "docTypeOther")}
                  </span>
                )}
              </p>
              {statusLine(d)}
              <p className="mt-0.5 text-xs text-ink-soft/70">
                {t("uploadedBy")} {new Date(d.created_at).toLocaleString()}
                {d.file_size ? ` · ${(d.file_size / 1024).toFixed(0)} KB` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => download(d)}
                className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-brand hover:border-brand">
                {t("download")}
              </button>
              <button type="button" onClick={() => remove(d)}
                className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-ink-soft hover:border-red-400 hover:text-red-600">
                {t("delete")}
              </button>
            </div>
          </li>
        ))}
        {docs.length === 0 && (
          <li className="py-4 text-sm text-ink-soft/60">—</li>
        )}
      </ul>
    </div>
  );
}
