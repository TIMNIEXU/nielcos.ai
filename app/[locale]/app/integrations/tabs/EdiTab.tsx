"use client";

import { useEffect, useState } from "react";
import { fmtDate } from "../IntegrationsBoard";

type EdiDoc = {
  id: string;
  kind: string;
  filename: string;
  status: string;
  created_at: string;
  summary: Record<string, string>;
};

type EdiDetail = EdiDoc & {
  raw_text: string;
  parsed: {
    kind: string;
    sender?: string;
    receiver?: string;
    header: Record<string, string>;
    lines: { line?: string; sku?: string; qty?: string; uom?: string; price?: string; desc?: string }[];
    totals: Record<string, string>;
    warnings: string[];
    segmentCount: number;
  };
};

type Props = { m: Record<string, string>; locale: string; onChange: () => void };

const KIND_LABEL: Record<string, string> = {
  "850": "ediKind850",
  "856": "ediKind856",
  "810": "ediKind810",
  unknown: "ediKindUnknown",
};

export default function EdiTab({ m, locale, onChange }: Props) {
  const [docs, setDocs] = useState<EdiDoc[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [paste, setPaste] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<EdiDetail | null>(null);
  const [detailTab, setDetailTab] = useState<"parsed" | "raw">("parsed");

  const load = async () => {
    const r = await fetch("/api/app/integrations/edi");
    if (r.ok) setDocs((await r.json()).documents ?? []);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setFileName(f.name);
    setPaste(await f.text());
  };

  const submit = async () => {
    if (!paste.trim() || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/app/integrations/edi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: fileName || "upload.edi", content: paste }),
      });
      if (r.ok) {
        const j = await r.json();
        setPaste("");
        setFileName("");
        setShowForm(false);
        load();
        onChange();
        openDetail(j.document.id);
      }
    } finally {
      setBusy(false);
    }
  };

  const openDetail = async (id: string) => {
    const r = await fetch(`/api/app/integrations/edi/${id}`);
    if (r.ok) {
      setDetail((await r.json()).document);
      setDetailTab("parsed");
    }
  };

  const kindLabel = (k: string) => m[KIND_LABEL[k] ?? "ediKindUnknown"] ?? k;

  const summaryText = (d: EdiDoc) => {
    const s = d.summary ?? {};
    const bits: string[] = [];
    if (s.poNumber) bits.push(`PO ${s.poNumber}`);
    if (s.shipmentId) bits.push(`SHP ${s.shipmentId}`);
    if (s.invoiceNumber) bits.push(`INV ${s.invoiceNumber}`);
    if (s.billOfLading) bits.push(`B/L ${s.billOfLading}`);
    if (s.invoiceTotal) bits.push(`$${s.invoiceTotal}`);
    bits.push(`${s.lines ?? 0} ${m.summaryLines}`);
    return bits.join(" · ");
  };

  return (
    <div className="space-y-4">
      <div className="dash-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">{m.ediTitle}</h2>
            <p className="mt-1 max-w-2xl text-[13.5px] text-muted">{m.ediHint}</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            + {m.ediUploadTitle}
          </button>
        </div>

        {showForm && (
          <div className="mt-4 rounded-xl border border-line bg-card-soft p-4">
            <label className="text-[13px] font-bold text-ink">{m.ediFileLabel}</label>
            <input
              type="file"
              accept=".edi,.txt,.dat,text/plain"
              onChange={(e) => onFile(e.target.files?.[0])}
              className="mt-1.5 block w-full text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
            />
            <label className="mt-3 block text-[13px] font-bold text-ink">{m.ediPasteLabel}</label>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={m.ediPastePh}
              rows={6}
              className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 font-mono text-[12.5px] text-ink outline-none focus:border-brand"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={submit}
                disabled={!paste.trim() || busy}
                className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                {m.ediSubmit}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-full border border-line px-4 py-2 text-sm font-bold text-ink-soft"
              >
                {m.cancel}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-[12px] uppercase tracking-wide text-faint">
                <th className="py-2 pr-3 font-semibold">{m.ediThFile}</th>
                <th className="py-2 pr-3 font-semibold">{m.ediThKind}</th>
                <th className="py-2 pr-3 font-semibold">{m.ediThSummary}</th>
                <th className="py-2 pr-3 font-semibold">{m.ediThTime}</th>
                <th className="py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-b border-line-soft last:border-0">
                  <td className="py-2.5 pr-3 font-mono text-[12.5px] font-bold text-ink">{d.filename}</td>
                  <td className="py-2.5 pr-3">
                    <span className="rounded-full bg-brand-tint px-2.5 py-1 font-mono text-[12px] font-bold text-brand-deep">
                      {d.kind === "unknown" ? "?" : d.kind}
                    </span>{" "}
                    <span className="text-[12.5px] text-ink-soft">{kindLabel(d.kind)}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-[12.5px] text-ink-soft">{summaryText(d)}</td>
                  <td className="py-2.5 pr-3 text-ink-soft">{fmtDate(d.created_at, locale)}</td>
                  <td className="py-2.5">
                    <button
                      onClick={() => openDetail(d.id)}
                      className="font-bold text-brand hover:underline"
                    >
                      {m.ediView}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {docs.length === 0 && (
            <p className="py-6 text-center text-[13.5px] text-muted">{m.emptyEdi}</p>
          )}
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}>
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-mono text-[15px] font-bold text-ink">{detail.filename}</h3>
                <p className="mt-1 text-[13px] text-muted">
                  {kindLabel(detail.kind)} · {detail.parsed.segmentCount} segments ·{" "}
                  {fmtDate(detail.created_at, locale)}
                </p>
              </div>
              <button
                onClick={() => setDetail(null)}
                className="rounded-full border border-line px-3 py-1 text-sm font-bold text-ink-soft"
              >
                {m.ediClose}
              </button>
            </div>

            <div className="mt-4 flex gap-2">
              {(["parsed", "raw"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDetailTab(t)}
                  className={`rounded-full px-4 py-1.5 text-[13px] font-bold ${
                    detailTab === t ? "bg-brand text-white" : "border border-line text-ink-soft"
                  }`}
                >
                  {t === "parsed" ? m.ediHeader : m.ediRaw}
                </button>
              ))}
            </div>

            {detailTab === "parsed" ? (
              <div className="mt-4 space-y-4">
                {Object.keys(detail.parsed.header).length > 0 && (
                  <div>
                    <p className="text-[13px] font-bold text-ink">{m.ediHeader}</p>
                    <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {Object.entries(detail.parsed.header).map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-card-soft p-2.5">
                          <dt className="font-mono text-[11px] text-faint">{k}</dt>
                          <dd className="mt-0.5 break-all text-[13px] font-bold text-ink">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
                {detail.parsed.lines.length > 0 && (
                  <div>
                    <p className="text-[13px] font-bold text-ink">{m.ediLines}</p>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full min-w-[480px] text-left text-[12.5px]">
                        <thead>
                          <tr className="border-b border-line text-[11px] uppercase text-faint">
                            <th className="py-1 pr-2">#</th>
                            <th className="py-1 pr-2">SKU</th>
                            <th className="py-1 pr-2">Qty</th>
                            <th className="py-1 pr-2">Price</th>
                            <th className="py-1">Desc</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.parsed.lines.map((l, i) => (
                            <tr key={i} className="border-b border-line-soft last:border-0">
                              <td className="py-1.5 pr-2 font-mono">{l.line ?? i + 1}</td>
                              <td className="py-1.5 pr-2 font-mono">{l.sku ?? "—"}</td>
                              <td className="py-1.5 pr-2">{[l.qty, l.uom].filter(Boolean).join(" ") || "—"}</td>
                              <td className="py-1.5 pr-2">{l.price ?? "—"}</td>
                              <td className="py-1.5 text-ink-soft">{l.desc ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {Object.keys(detail.parsed.totals).length > 0 && (
                  <div>
                    <p className="text-[13px] font-bold text-ink">{m.ediTotals}</p>
                    <dl className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(detail.parsed.totals).map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-card-soft px-3 py-2">
                          <span className="font-mono text-[11px] text-faint">{k}: </span>
                          <span className="text-[13px] font-bold text-ink">{v}</span>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
                {detail.parsed.warnings.length > 0 && (
                  <div>
                    <p className="text-[13px] font-bold text-ink">{m.ediWarnings}</p>
                    <ul className="mt-1 list-inside list-disc text-[12.5px] text-amber-700">
                      {detail.parsed.warnings.map((w, i) => (
                        <li key={i} className="font-mono">{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <pre className="mt-4 max-h-[50vh] overflow-auto rounded-xl bg-ink p-4 font-mono text-[11.5px] leading-relaxed text-white">
                {detail.raw_text}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
