"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { matchPga, type PgaRule } from "@/lib/hts";

type Entry = {
  id: string;
  entry_no: string | null;
  importer_name: string | null;
  shipment_id: string | null;
  status: string;
  milestones: { at: string; label: string; note?: string }[];
  notes: string | null;
};

type Line = {
  id: string;
  description: string;
  quantity: number | null;
  value_usd: number;
  suggested_hts: { hts_no: string; description: string; rate: number | null; score: number }[];
  confirmed_hts: string | null;
  duty_rate: number | null;
  additional_pct: number;
  material?: string | null;
  origin_country?: string | null;
  hts_source?: string | null;
};

type PreviewRow = {
  description: string;
  quantity: string;
  value_usd: string;
  hts: string;
  hts_rate: string;
  material: string;
  origin: string;
  confidence: string;
  candidates: Line["suggested_hts"];
  keep: boolean;
};

type Props = {
  locale: string;
  initialEntry: Entry;
  initialLines: Line[];
  pgaRules: PgaRule[];
  shipments: { id: string; gttid: string | null; container_number: string }[];
  labels: Record<string, string>;
};

const STATUS_OPTS = ["draft", "classifying", "packet_ready", "filed", "released"];

export default function EntryDetail({ locale, initialEntry, initialLines, pgaRules, shipments, labels: t }: Props) {
  const router = useRouter();
  const [entry, setEntry] = useState<Entry>(initialEntry);
  const [lines, setLines] = useState<Line[]>(initialLines);

  // header form
  const [entryNo, setEntryNo] = useState(initialEntry.entry_no ?? "");
  const [importer, setImporter] = useState(initialEntry.importer_name ?? "");
  const [shipmentId, setShipmentId] = useState(initialEntry.shipment_id ?? "");
  const [status, setStatus] = useState(initialEntry.status);
  const [notes, setNotes] = useState(initialEntry.notes ?? "");
  const [savingHead, setSavingHead] = useState(false);

  // new line form
  const [nd, setNd] = useState("");
  const [nq, setNq] = useState("");
  const [nv, setNv] = useState("");
  const [adding, setAdding] = useState(false);

  // per-line suggestion state
  const [suggesting, setSuggesting] = useState<string | null>(null);

  // document import state
  const [impBusy, setImpBusy] = useState(false);
  const [impError, setImpError] = useState("");
  const [impDocType, setImpDocType] = useState("");
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);

  const handleImportFile = async (f: File | undefined) => {
    if (!f) return;
    setImpError("");
    setImpBusy(true);
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch(`/api/app/customs/entries/${entry.id}/import`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setImpError(
          data.error === "no_text" ? t.scannedPdf
          : data.error === "not_pdf" ? t.fileNotPdf
          : `${t.importFailed}: ${data.error ?? ""}`
        );
        return;
      }
      const rows: PreviewRow[] = (data.lines ?? []).map((l: any) => ({
        description: l.description ?? "",
        quantity: l.quantity != null ? String(l.quantity) : "",
        value_usd: l.value_usd != null ? String(l.value_usd) : "",
        hts: l.hts ?? "",
        hts_rate: l.hts_rate != null ? String(l.hts_rate) : "",
        material: l.material ?? "",
        origin: l.origin ?? data.origin_default ?? "",
        confidence: l.confidence ?? "low",
        candidates: l.candidates ?? [],
        keep: true,
      }));
      setImpDocType(data.doc_type ?? "");
      setPreview(rows);
    } finally {
      setImpBusy(false);
    }
  };

  const confirmImport = async () => {
    if (!preview) return;
    const kept = preview.filter((r) => r.keep && r.description.trim());
    if (!kept.length) { setPreview(null); return; }
    setImpBusy(true);
    try {
      const res = await fetch(`/api/app/customs/entries/${entry.id}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: kept.map((r) => ({
            description: r.description.trim(),
            quantity: r.quantity === "" ? null : Number(r.quantity),
            value_usd: Number(r.value_usd) || 0,
            confirmed_hts: r.hts.trim() || null,
            duty_rate: r.hts_rate === "" ? null : Number(r.hts_rate),
            material: r.material.trim(),
            origin_country: r.origin.trim(),
            hts_source: r.hts.trim() ? "imported" : null,
            suggested_hts: r.candidates,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setImpError(`${t.importFailed}: ${data.error ?? ""}`); return; }
      const ids: string[] = data.ids ?? [];
      const newLines: Line[] = kept.map((r, i) => ({
        id: ids[i] ?? `tmp-${Date.now()}-${i}`,
        description: r.description.trim(),
        quantity: r.quantity === "" ? null : Number(r.quantity),
        value_usd: Number(r.value_usd) || 0,
        suggested_hts: r.candidates,
        confirmed_hts: r.hts.trim() || null,
        duty_rate: r.hts_rate === "" ? null : Number(r.hts_rate),
        additional_pct: 0,
        material: r.material.trim() || null,
        origin_country: r.origin.trim() || null,
        hts_source: r.hts.trim() ? "imported" : null,
      }));
      setLines((ls) => [...ls, ...newLines]);
      setPreview(null);
    } finally {
      setImpBusy(false);
    }
  };

  // milestone form
  const [mLabel, setMLabel] = useState("");
  const [mNote, setMNote] = useState("");
  const [mDate, setMDate] = useState(() => new Date().toISOString().slice(0, 10));

  const statusName = (s: string) =>
    ({ draft: t.stDraft, classifying: t.stClassifying, packet_ready: t.stPacketReady, filed: t.stFiled, released: t.stReleased } as Record<string, string>)[s] ?? s;

  const docTypeName = (d: string) =>
    ({
      commercial_invoice: t.docInvoice,
      packing_list: t.docPacking,
      bill_of_lading: t.docBl,
      arrival_notice: t.docArrival,
    } as Record<string, string>)[d] ?? t.docOther;

  const patchEntry = async (patch: Record<string, any>) => {
    const res = await fetch(`/api/app/customs/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    return res.ok;
  };

  const saveHeader = async () => {
    setSavingHead(true);
    const ok = await patchEntry({
      entry_no: entryNo.trim() || null,
      importer_name: importer.trim() || null,
      shipment_id: shipmentId || null,
      status,
      notes: notes.trim() || null,
    });
    setSavingHead(false);
    if (ok) {
      setEntry({ ...entry, entry_no: entryNo.trim() || null, importer_name: importer.trim() || null, shipment_id: shipmentId || null, status, notes: notes.trim() || null });
    }
  };

  const deleteEntry = async () => {
    if (!confirm(t.confirmDeleteEntry)) return;
    await fetch(`/api/app/customs/entries/${entry.id}`, { method: "DELETE" });
    router.push(`/${locale}/app/customs`);
  };

  const addLine = async () => {
    if (!nd.trim()) return;
    setAdding(true);
    const res = await fetch(`/api/app/customs/entries/${entry.id}/lines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: nd.trim(), quantity: nq, value_usd: nv }),
    });
    const data = await res.json();
    setAdding(false);
    if (res.ok) {
      setLines([...lines, { id: data.id, description: nd.trim(), quantity: nq ? Number(nq) : null, value_usd: Number(nv) || 0, suggested_hts: [], confirmed_hts: null, duty_rate: null, additional_pct: 0 }]);
      setNd(""); setNq(""); setNv("");
    }
  };

  const patchLine = async (id: string, patch: Record<string, any>) => {
    const res = await fetch(`/api/app/customs/lines/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const deleteLine = async (id: string) => {
    if (!confirm(t.confirmDeleteLine)) return;
    const res = await fetch(`/api/app/customs/lines/${id}`, { method: "DELETE" });
    if (res.ok) setLines((ls) => ls.filter((l) => l.id !== id));
  };

  const suggestFor = async (line: Line) => {
    setSuggesting(line.id);
    const res = await fetch("/api/app/customs/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: line.description }),
    });
    const data = await res.json();
    setSuggesting(null);
    if (res.ok) {
      const cands = data.candidates ?? [];
      setLines((ls) => ls.map((l) => (l.id === line.id ? { ...l, suggested_hts: cands } : l)));
      // persist candidates so they survive reload
      fetch(`/api/app/customs/lines/${line.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggested_hts: cands }),
      });
    }
  };

  const useCandidate = (line: Line, c: { hts_no: string; rate: number | null }) => {
    patchLine(line.id, { confirmed_hts: c.hts_no, duty_rate: c.rate });
  };

  const addMilestone = async () => {
    if (!mLabel.trim()) return;
    const next = [...(entry.milestones ?? []), { at: new Date(mDate).toISOString(), label: mLabel.trim(), note: mNote.trim() || undefined }];
    const ok = await patchEntry({ milestones: next });
    if (ok) {
      setEntry({ ...entry, milestones: next });
      setMLabel(""); setMNote("");
    }
  };

  const { totalValue, totalDuty } = useMemo(() => {
    let v = 0, d = 0;
    for (const l of lines) {
      const val = Number(l.value_usd) || 0;
      v += val;
      d += val * ((Number(l.duty_rate) || 0) + (Number(l.additional_pct) || 0)) / 100;
    }
    return { totalValue: v, totalDuty: d };
  }, [lines]);

  const lineDuty = (l: Line) =>
    (Number(l.value_usd) || 0) * ((Number(l.duty_rate) || 0) + (Number(l.additional_pct) || 0)) / 100;

  const pgaFor = (l: Line) => {
    const hts = l.confirmed_hts || l.suggested_hts?.[0]?.hts_no || "";
    return hts ? matchPga(hts, pgaRules) : [];
  };

  const inputCls = "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand";
  const lblCls = "mb-1 block text-xs font-bold tracking-wider text-ink-soft uppercase";
  const isZh = locale === "zh-CN";

  return (
    <div>
      <Link href={`/${locale}/app/customs`} className="text-sm font-bold text-brand-deep hover:underline">
        ← {t.back}
      </Link>

      {/* header */}
      <div className="mt-4 rounded-2xl border border-line bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={lblCls}>{t.entryNo}</label>
            <input value={entryNo} onChange={(e) => setEntryNo(e.target.value)} className={`${inputCls} font-mono`} />
          </div>
          <div>
            <label className={lblCls}>{t.importer}</label>
            <input value={importer} onChange={(e) => setImporter(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={lblCls}>{t.linkedShipment}</label>
            <select value={shipmentId} onChange={(e) => setShipmentId(e.target.value)} className={inputCls}>
              <option value="">{t.noShipment}</option>
              {shipments.map((s) => (
                <option key={s.id} value={s.id}>{s.gttid ?? s.container_number} — {s.container_number}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={lblCls}>{t.status}</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              {STATUS_OPTS.map((s) => <option key={s} value={s}>{statusName(s)}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={lblCls}>{t.notes}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button onClick={saveHeader} disabled={savingHead} className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
            {t.save}
          </button>
          <button onClick={deleteEntry} className="rounded-full border border-red-200 px-5 py-2 text-sm font-bold text-red-600">
            {t.delete}
          </button>
        </div>
      </div>

      {/* lines */}
      <div className="mt-6 rounded-2xl border border-line bg-white p-5">
        <h2 className="text-lg font-bold text-ink">{t.lines}</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">{t.rateNote}</p>

        <div className="mt-4 grid gap-3 rounded-xl bg-brand-tint-soft p-4 sm:grid-cols-[1fr_110px_130px_auto]">
          <input value={nd} onChange={(e) => setNd(e.target.value)} placeholder={t.lineDesc} className={inputCls} />
          <input value={nq} onChange={(e) => setNq(e.target.value)} placeholder={t.qty} inputMode="decimal" className={inputCls} />
          <input value={nv} onChange={(e) => setNv(e.target.value)} placeholder={t.valueUsd} inputMode="decimal" className={inputCls} />
          <button onClick={addLine} disabled={adding || !nd.trim()} className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            + {t.addLine}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-brand/40 bg-white px-4 py-2.5 text-sm font-bold text-brand-deep hover:bg-brand-tint-soft ${impBusy ? "pointer-events-none opacity-50" : ""}`}>
            📄 {impBusy ? t.importing : t.importDoc}
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => { handleImportFile(e.target.files?.[0]); e.target.value = ""; }}
            />
          </label>
          <span className="text-xs text-ink-soft">{t.importFormats}</span>
        </div>
        {impError && <p className="mt-2 text-xs font-bold text-red-600">{impError}</p>}

        <div className="mt-4 space-y-4">
          {lines.map((l) => {
            const pga = pgaFor(l);
            return (
              <div key={l.id} className="rounded-xl border border-line-soft p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-ink">{l.description}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {t.qty}: {l.quantity ?? "—"} · {t.valueUsd}: ${Number(l.value_usd).toLocaleString()}
                    </p>
                    {(l.material || l.origin_country || l.hts_source === "imported") && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {l.material && (
                          <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 ring-1 ring-sky-200">
                            {t.material}: {l.material}
                          </span>
                        )}
                        {l.origin_country && (
                          <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 ring-1 ring-violet-200">
                            {t.originCountry}: {l.origin_country}
                          </span>
                        )}
                        {l.hts_source === "imported" && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                            📄 {t.docHts}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button onClick={() => deleteLine(l.id)} className="shrink-0 text-xs font-bold text-red-500 hover:underline">
                    {t.delete}
                  </button>
                </div>

                {/* HTS */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => suggestFor(l)}
                    disabled={suggesting === l.id}
                    className="rounded-full bg-brand-tint px-4 py-1.5 text-xs font-bold text-brand-deep disabled:opacity-50"
                  >
                    {suggesting === l.id ? t.suggesting : `✨ ${t.suggestHts}`}
                  </button>
                  {l.confirmed_hts && (
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-mono text-xs font-bold text-emerald-700">
                      {t.confirmedHts}: {l.confirmed_hts}
                    </span>
                  )}
                </div>

                {l.suggested_hts?.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {l.suggested_hts.map((c) => (
                      <div key={c.hts_no} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-ink">{c.hts_no}</span>
                          <span className="ml-2 text-ink-soft">{c.description}</span>
                          <span className="ml-2 text-ink-soft">
                            {c.rate == null ? "—" : `${c.rate}%`} · {t.matchScore} {c.score}
                          </span>
                        </div>
                        <button onClick={() => useCandidate(l, c)} className="shrink-0 rounded-full bg-white px-3 py-1 font-bold text-brand-deep ring-1 ring-brand/30 hover:bg-brand-tint">
                          {t.useThis}
                        </button>
                      </div>
                    ))}
                    <p className="text-[11px] text-ink-soft">({t.ruleBased})</p>
                  </div>
                )}
                {l.suggested_hts && l.suggested_hts.length === 0 && suggesting === null && (
                  <p className="mt-2 hidden text-xs text-ink-soft">{t.noCandidates}</p>
                )}

                {/* rates */}
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <label className={lblCls}>{t.confirmedHts}</label>
                    <input
                      defaultValue={l.confirmed_hts ?? ""}
                      key={`${l.id}-${l.confirmed_hts}`}
                      onBlur={(e) => { if (e.target.value.trim() !== (l.confirmed_hts ?? "")) patchLine(l.id, { confirmed_hts: e.target.value.trim() || null }); }}
                      placeholder="9403.60.80"
                      className={`${inputCls} font-mono`}
                    />
                  </div>
                  <div>
                    <label className={lblCls}>{t.dutyRate}</label>
                    <input
                      defaultValue={l.duty_rate ?? ""}
                      key={`${l.id}-r-${l.duty_rate}`}
                      onBlur={(e) => patchLine(l.id, { duty_rate: e.target.value === "" ? null : Number(e.target.value) })}
                      inputMode="decimal" className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={lblCls}>{t.addlPct}</label>
                    <input
                      defaultValue={l.additional_pct ?? 0}
                      key={`${l.id}-a-${l.additional_pct}`}
                      onBlur={(e) => patchLine(l.id, { additional_pct: Number(e.target.value) || 0 })}
                      inputMode="decimal" className={inputCls}
                    />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className={lblCls}>{t.material}</label>
                    <input
                      defaultValue={l.material ?? ""}
                      key={`${l.id}-m-${l.material}`}
                      onBlur={(e) => { if (e.target.value.trim() !== (l.material ?? "")) patchLine(l.id, { material: e.target.value.trim() || null }); }}
                      placeholder="Cotton 棉"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={lblCls}>{t.originCountry}</label>
                    <input
                      defaultValue={l.origin_country ?? ""}
                      key={`${l.id}-o-${l.origin_country}`}
                      onBlur={(e) => { if (e.target.value.trim() !== (l.origin_country ?? "")) patchLine(l.id, { origin_country: e.target.value.trim() || null }); }}
                      placeholder="CHINA"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* PGA */}
                <div className="mt-3">
                  <p className="text-xs font-bold tracking-wider text-ink-soft uppercase">{t.pgaFlags}</p>
                  {pga.length === 0 ? (
                    <p className="mt-1 text-xs text-ink-soft">{t.noPga}</p>
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {pga.map((r) => (
                        <span key={r.agency} title={r.note} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                          ⚠ {r.agency}{isZh && r.agency_cn ? ` ${r.agency_cn}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <p className="mt-3 text-right text-sm font-bold text-ink">
                  {t.estDuty}: <span className="font-mono">${lineDuty(l).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </p>
              </div>
            );
          })}
        </div>

        {lines.length > 0 && (
          <div className="mt-4 flex justify-end gap-6 border-t border-line-soft pt-4 text-sm font-bold text-ink">
            <span>{t.totalValue}: <span className="font-mono">${totalValue.toLocaleString()}</span></span>
            <span>{t.totalDuty}: <span className="font-mono text-brand-deep">${totalDuty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></span>
          </div>
        )}
      </div>

      {/* import preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-line p-5">
              <h3 className="text-lg font-bold text-ink">{t.importPreview}</h3>
              <p className="mt-1 text-xs text-ink-soft">
                {t.docType}: <b>{docTypeName(impDocType)}</b>
                {preview.length > 0 && <> · {t.linesFound}: <b>{preview.filter((r) => r.keep).length}</b></>} · {t.importHint}
              </p>
            </div>
            <div className="max-h-[58vh] overflow-auto p-5">
              {preview.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-soft">{t.noLinesFound}</p>
              ) : (
                <table className="w-full min-w-[760px] text-xs">
                  <thead>
                    <tr className="text-left text-ink-soft">
                      <th className="w-8 py-2"></th>
                      <th className="py-2 pr-2">{t.lineDesc}</th>
                      <th className="w-20 py-2 pr-2">{t.qty}</th>
                      <th className="w-24 py-2 pr-2">{t.valueUsd}</th>
                      <th className="w-28 py-2 pr-2">{t.detectedHts}</th>
                      <th className="w-28 py-2 pr-2">{t.material}</th>
                      <th className="w-24 py-2 pr-2">{t.originCountry}</th>
                      <th className="w-16 py-2">{t.confidence}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className={`border-t border-line-soft ${r.keep ? "" : "opacity-40"}`}>
                        <td className="py-2">
                          <input
                            type="checkbox"
                            checked={r.keep}
                            onChange={(e) => setPreview((p) => p!.map((x, j) => (j === i ? { ...x, keep: e.target.checked } : x)))}
                            className="h-4 w-4 accent-brand"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            value={r.description}
                            onChange={(e) => setPreview((p) => p!.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                            className={`${inputCls} !py-1.5 text-xs`}
                          />
                          {r.candidates.length > 0 && (
                            <p className="mt-1 text-[11px] text-ink-soft">
                              ✨ {r.candidates.map((c) => c.hts_no).join(" · ")}
                            </p>
                          )}
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            value={r.quantity}
                            onChange={(e) => setPreview((p) => p!.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
                            inputMode="decimal" className={`${inputCls} !py-1.5 font-mono text-xs`}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            value={r.value_usd}
                            onChange={(e) => setPreview((p) => p!.map((x, j) => (j === i ? { ...x, value_usd: e.target.value } : x)))}
                            inputMode="decimal" className={`${inputCls} !py-1.5 font-mono text-xs`}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            value={r.hts}
                            onChange={(e) => setPreview((p) => p!.map((x, j) => (j === i ? { ...x, hts: e.target.value } : x)))}
                            placeholder="—" className={`${inputCls} !py-1.5 font-mono text-xs`}
                          />
                          {r.hts && r.hts_rate && (
                            <p className="mt-1 text-[11px] font-bold text-emerald-700">{r.hts_rate}%</p>
                          )}
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            value={r.material}
                            onChange={(e) => setPreview((p) => p!.map((x, j) => (j === i ? { ...x, material: e.target.value } : x)))}
                            className={`${inputCls} !py-1.5 text-xs`}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            value={r.origin}
                            onChange={(e) => setPreview((p) => p!.map((x, j) => (j === i ? { ...x, origin: e.target.value } : x)))}
                            className={`${inputCls} !py-1.5 text-xs`}
                          />
                        </td>
                        <td className="py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            r.confidence === "high" ? "bg-emerald-50 text-emerald-700"
                            : r.confidence === "medium" ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-500"
                          }`}>
                            {r.confidence}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-line p-5">
              <button onClick={() => setPreview(null)} className="rounded-full border border-line px-5 py-2 text-sm font-bold text-ink-soft">
                {t.cancel}
              </button>
              <button
                onClick={confirmImport}
                disabled={impBusy || preview.filter((r) => r.keep).length === 0}
                className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {impBusy ? t.importing : `${t.confirmImport} (${preview.filter((r) => r.keep).length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* milestones */}
      <div className="mt-6 rounded-2xl border border-line bg-white p-5">
        <h2 className="text-lg font-bold text-ink">{t.milestones}</h2>
        <div className="mt-3 space-y-2">
          {(entry.milestones ?? []).map((m, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <span className="shrink-0 font-mono text-xs text-ink-soft">{m.at.slice(0, 10)}</span>
              <div>
                <p className="font-bold text-ink">{m.label}</p>
                {m.note && <p className="text-xs text-ink-soft">{m.note}</p>}
              </div>
            </div>
          ))}
          {(entry.milestones ?? []).length === 0 && <p className="text-sm text-ink-soft">—</p>}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[150px_1fr_1fr_auto]">
          <input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} className={inputCls} />
          <input value={mLabel} onChange={(e) => setMLabel(e.target.value)} placeholder={t.milestoneLabel} className={inputCls} />
          <input value={mNote} onChange={(e) => setMNote(e.target.value)} placeholder={t.milestoneNote} className={inputCls} />
          <button onClick={addMilestone} disabled={!mLabel.trim()} className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            + {t.addMilestone}
          </button>
        </div>
      </div>
    </div>
  );
}
