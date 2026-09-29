"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Extracted = {
  fields?: Record<string, string>;
  containers?: { container: string }[];
  charges?: { description: string; amount: number }[];
};

type Doc = {
  id: string;
  company_id: string;
  shipment_id: string | null;
  file_name: string;
  file_path: string;
  file_size?: number | null;
  created_at: string;
  doc_type?: string | null;
  parse_status?: string | null;
  extracted?: Extracted | null;
  group_id?: string | null;
  version_no?: number | null;
  is_current?: boolean | null;
  share_token?: string | null;
  share_expires_at?: string | null;
  shipments?: { gttid: string } | null;
};

type Shipment = { id: string; gttid: string; mbl_no?: string | null };

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

export default function DocumentsBoard({
  t,
  ta,
  locale,
  companyId,
}: {
  t: Record<string, string>;
  ta: Record<string, string>;
  locale: string;
  companyId: string;
}) {
  const [tab, setTab] = useState<"library" | "upload" | "shares">("library");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("__all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [shareDoc, setShareDoc] = useState<Doc | null>(null);
  const [expiry, setExpiry] = useState<"7d" | "30d" | "never">("30d");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [done, setDone] = useState(false);
  const [uploadShipment, setUploadShipment] = useState("__none");
  const [parsingIds, setParsingIds] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const versionRef = useRef<HTMLInputElement>(null);
  const [versionTarget, setVersionTarget] = useState<Doc | null>(null);

  const fmt = (s: string, n: number | string) => s.replace("{n}", String(n));
  const typeName = (dt?: string | null) =>
    ta[TYPE_KEY[dt ?? "other"] ?? "docTypeOther"] ?? dt ?? "—";

  async function load() {
    const sb = createClient();
    const [{ data: d }, { data: s }] = await Promise.all([
      sb
        .from("documents")
        .select("*, shipments(gttid)")
        .order("created_at", { ascending: false }),
      sb.from("shipments").select("id, gttid, mbl_no").order("created_at", { ascending: false }).limit(60),
    ]);
    if (d) setDocs(d as Doc[]);
    if (s) setShipments(s as Shipment[]);
  }
  useEffect(() => {
    load();
  }, []);

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
    load();
  }

  async function uploadFile(file: File, shipmentId: string | null): Promise<Doc | null> {
    const sb = createClient();
    const path = `${companyId}/${shipmentId ?? "unassigned"}/${Date.now()}-${file.name}`;
    const { error: upErr } = await sb.storage.from("shipment-docs").upload(path, file);
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
    if (dbErr || !inserted) throw dbErr || new Error("insert");
    // First version: the group is the row itself.
    await sb.from("documents").update({ group_id: inserted.id }).eq("id", inserted.id);
    return { ...(inserted as Doc), group_id: inserted.id, version_no: 1 };
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(false);
    setDone(false);
    if (file.size > MAX_MB * 1024 * 1024) {
      setErr(true);
      return;
    }
    setBusy(true);
    try {
      const row = await uploadFile(file, uploadShipment === "__none" ? null : uploadShipment);
      if (row?.id) runParse(row.id);
      setDone(true);
      setTab("library");
    } catch {
      setErr(true);
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleNewVersion(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const target = versionTarget;
    if (!file || !target?.group_id) return;
    setBusy(true);
    try {
      const sb = createClient();
      const groupRows = docs.filter((d) => (d.group_id ?? d.id) === target.group_id);
      const maxV = Math.max(...groupRows.map((d) => d.version_no ?? 1));
      const path = `${companyId}/${target.shipment_id ?? "unassigned"}/${Date.now()}-${file.name}`;
      const { error: upErr } = await sb.storage.from("shipment-docs").upload(path, file);
      if (upErr) throw upErr;
      const { data: inserted, error: dbErr } = await sb
        .from("documents")
        .insert({
          company_id: companyId,
          shipment_id: target.shipment_id,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          group_id: target.group_id,
          version_no: maxV + 1,
          is_current: true,
        })
        .select("id")
        .single();
      if (dbErr || !inserted) throw dbErr || new Error("insert");
      await sb
        .from("documents")
        .update({ is_current: false })
        .eq("group_id", target.group_id)
        .neq("id", inserted.id);
      runParse(inserted.id);
    } catch {
      /* surface via reload state */
    }
    setBusy(false);
    setVersionTarget(null);
    if (versionRef.current) versionRef.current.value = "";
    load();
  }

  async function revertVersion(doc: Doc) {
    const sb = createClient();
    const gid = doc.group_id ?? doc.id;
    await sb.from("documents").update({ is_current: false }).eq("group_id", gid);
    await sb.from("documents").update({ is_current: true }).eq("id", doc.id);
    load();
  }

  async function removeVersion(doc: Doc) {
    if (!confirm(t.deleteVersion)) return;
    const sb = createClient();
    await sb.storage.from("shipment-docs").remove([doc.file_path]);
    await sb.from("documents").delete().eq("id", doc.id);
    const gid = doc.group_id ?? doc.id;
    const rest = docs.filter((d) => (d.group_id ?? d.id) === gid && d.id !== doc.id);
    if (doc.is_current && rest.length > 0) {
      const newest = [...rest].sort((a, b) => (b.version_no ?? 1) - (a.version_no ?? 1))[0];
      await sb.from("documents").update({ is_current: true }).eq("id", newest.id);
    }
    load();
  }

  async function removeGroup(gid: string) {
    if (!confirm(t.deleteGroup)) return;
    const sb = createClient();
    const rows = docs.filter((d) => (d.group_id ?? d.id) === gid);
    await sb.storage.from("shipment-docs").remove(rows.map((d) => d.file_path));
    await sb.from("documents").delete().eq("group_id", gid);
    if (expanded === gid) setExpanded(null);
    load();
  }

  async function download(doc: Doc) {
    const sb = createClient();
    const { data, error } = await sb.storage.from("shipment-docs").createSignedUrl(doc.file_path, 300);
    if (!error && data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  function shareLink(doc: Doc) {
    return `${window.location.origin}/share/d/${doc.share_token}`;
  }

  async function createShare() {
    if (!shareDoc) return;
    const sb = createClient();
    const token = crypto.randomUUID();
    const expires =
      expiry === "never" ? null : new Date(Date.now() + (expiry === "7d" ? 7 : 30) * 864e5).toISOString();
    await sb.from("documents").update({ share_token: token, share_expires_at: expires }).eq("id", shareDoc.id);
    setShareDoc({ ...shareDoc, share_token: token, share_expires_at: expires });
    setCopied(false);
    load();
  }

  async function revokeShare(doc: Doc) {
    if (!confirm(t.revokeConfirm)) return;
    const sb = createClient();
    await sb.from("documents").update({ share_token: null, share_expires_at: null }).eq("id", doc.id);
    setShareDoc(null);
    load();
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  function summary(doc: Doc): string | null {
    const f = doc.extracted?.fields ?? {};
    const nCtn = doc.extracted?.containers?.length ?? 0;
    const parts: string[] = [];
    if (f.mbl_no) parts.push(`MBL ${f.mbl_no}`);
    if (f.invoice_no) parts.push(f.invoice_no);
    if (f.total_amount) parts.push(`${f.currency || ""} ${fmtNum(f.total_amount)}`.trim());
    if (nCtn) parts.push(fmt(ta.summaryContainers ?? "{n}", nCtn));
    return parts.length ? parts.join(" · ") : null;
  }

  function statusBadge(doc: Doc) {
    if (parsingIds.has(doc.id) || doc.parse_status === "pending")
      return <span className="text-xs font-semibold text-brand">● {t.statusPending}</span>;
    if (doc.parse_status === "parsed")
      return <span className="text-xs font-semibold text-emerald-600">● {t.statusParsed}</span>;
    return (
      <button
        type="button"
        onClick={() => runParse(doc.id)}
        className="text-xs font-semibold text-ink-soft underline hover:text-brand"
      >
        {t.parseNow}
      </button>
    );
  }

  // Group rows: current version per group for the library list.
  const groups = new Map<string, Doc[]>();
  for (const d of docs) {
    const gid = d.group_id ?? d.id;
    if (!groups.has(gid)) groups.set(gid, []);
    groups.get(gid)!.push(d);
  }
  const currentRows = [...groups.values()]
    .map((rows) => rows.find((r) => r.is_current) ?? rows[0])
    .filter((d) => {
      if (search && !d.file_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "__all" && (d.doc_type ?? "other") !== typeFilter) return false;
      return true;
    });
  const sharedRows = docs.filter((d) => d.share_token);

  const tabs = [
    { id: "library" as const, label: t.tabLibrary },
    { id: "upload" as const, label: t.tabUpload },
    { id: "shares" as const, label: t.tabShares },
  ];

  return (
    <div>
      <div className="flex gap-2 border-b border-line">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-bold transition-colors ${
              tab === tb.id
                ? "border-brand text-brand-deep"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {tb.label}
            {tb.id === "shares" && sharedRows.length > 0 && (
              <span className="ml-1.5 rounded-full bg-brand-tint px-2 py-0.5 text-[11px] text-brand-deep">
                {sharedRows.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "library" && (
        <div className="mt-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPh}
              className="flex-1 rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-soft/50 focus:border-brand"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink outline-none focus:border-brand"
            >
              <option value="__all">{t.allTypes}</option>
              {Object.keys(TYPE_TONE).map((k) => (
                <option key={k} value={k}>{typeName(k)}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
            <div className="hidden grid-cols-[1fr_130px_90px_150px_110px_120px] gap-3 border-b border-line-soft bg-brand-tint-soft px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-ink-soft md:grid">
              <span>{t.thName}</span><span>{t.thType}</span><span>{t.thVersion}</span>
              <span>{t.thShipment}</span><span>{t.thStatus}</span><span className="text-right">{t.thActions}</span>
            </div>
            {currentRows.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-ink-soft/60">{t.empty}</p>
            )}
            {currentRows.map((d) => {
              const gid = d.group_id ?? d.id;
              const rows = (groups.get(gid) ?? []).sort((a, b) => (b.version_no ?? 1) - (a.version_no ?? 1));
              const open = expanded === gid;
              const s = summary(d);
              return (
                <div key={d.id} className="border-b border-line-soft last:border-0">
                  <div className="grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-[1fr_130px_90px_150px_110px_120px] md:items-center md:gap-3">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setExpanded(open ? null : gid)}
                        className="block max-w-full truncate text-left text-sm font-bold text-ink hover:text-brand"
                        title={d.file_name}
                      >
                        {d.file_name}
                      </button>
                      {s && <p className="mt-0.5 truncate text-xs text-ink-soft">{s}</p>}
                      {d.share_token && (
                        <span className="mt-1 inline-block rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                          {t.sharedBadge}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold ${TYPE_TONE[d.doc_type ?? "other"] ?? TYPE_TONE.other}`}>
                        {typeName(d.doc_type)}
                      </span>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setExpanded(open ? null : gid)}
                        className="text-xs font-bold text-brand-deep hover:underline"
                      >
                        v{d.version_no ?? 1}
                        {rows.length > 1 && <span className="ml-1 font-medium text-ink-soft">· {fmt(t.versionsCount, rows.length)}</span>}
                      </button>
                    </div>
                    <div className="text-xs">
                      {d.shipments?.gttid ? (
                        <a href={`/${locale}/app/${d.shipment_id}`} className="font-bold text-brand-deep hover:underline">
                          {d.shipments.gttid}
                        </a>
                      ) : (
                        <span className="text-ink-soft/50">{t.noShipment}</span>
                      )}
                    </div>
                    <div>{statusBadge(d)}</div>
                    <div className="flex flex-wrap justify-start gap-1.5 md:justify-end">
                      <button type="button" onClick={() => download(d)} className="rounded-full border border-line px-3 py-1 text-[11px] font-bold text-brand-deep hover:border-brand">{ta.download}</button>
                      <button type="button" onClick={() => { setVersionTarget(d); versionRef.current?.click(); }} className="rounded-full border border-line px-3 py-1 text-[11px] font-bold text-ink-soft hover:border-brand hover:text-brand-deep">{t.uploadNewVersion}</button>
                      <button type="button" onClick={() => { setShareDoc(d); setExpiry("30d"); setCopied(false); }} className="rounded-full border border-line px-3 py-1 text-[11px] font-bold text-ink-soft hover:border-brand hover:text-brand-deep">{t.shareBtn}</button>
                      <button type="button" onClick={() => removeGroup(gid)} className="rounded-full border border-line px-3 py-1 text-[11px] font-bold text-ink-soft hover:border-red-400 hover:text-red-600">{ta.delete}</button>
                    </div>
                  </div>
                  {open && (
                    <div className="border-t border-dashed border-line-soft bg-brand-tint-soft/50 px-5 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t.historyTitle}</p>
                      <ul className="mt-2 space-y-2">
                        {rows.map((v) => (
                          <li key={v.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-line-soft">
                            <span className="font-extrabold text-ink">v{v.version_no ?? 1}</span>
                            {v.is_current && (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">{t.currentBadge}</span>
                            )}
                            {v.share_token && (
                              <span className="rounded-full bg-violet-50 px-2 py-0.5 font-bold text-violet-700">{t.sharedBadge}</span>
                            )}
                            <span className="text-ink-soft/70">
                              {new Date(v.created_at).toLocaleString()}
                              {v.file_size ? ` · ${(v.file_size / 1024).toFixed(0)} KB` : ""}
                            </span>
                            <span className="ml-auto flex gap-1.5">
                              <button type="button" onClick={() => download(v)} className="font-bold text-brand-deep hover:underline">{ta.download}</button>
                              {!v.is_current && (
                                <button type="button" onClick={() => revertVersion(v)} className="font-bold text-ink-soft hover:text-brand-deep hover:underline">{t.makeCurrent}</button>
                              )}
                              <button type="button" onClick={() => removeVersion(v)} className="font-bold text-ink-soft hover:text-red-600 hover:underline">{ta.delete}</button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <input ref={versionRef} type="file" className="hidden" onChange={handleNewVersion}
            accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx" />
        </div>
      )}

      {tab === "upload" && (
        <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-line bg-white p-6">
          <h2 className="text-lg font-extrabold text-ink">{t.uploadTitle}</h2>
          <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-ink-soft">{t.shipmentLabel}</label>
          <select
            value={uploadShipment}
            onChange={(e) => setUploadShipment(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand"
          >
            <option value="__none">{t.shipmentPh}</option>
            {shipments.map((s) => (
              <option key={s.id} value={s.id}>{s.gttid}{s.mbl_no ? ` · MBL ${s.mbl_no}` : ""}</option>
            ))}
          </select>
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload}
            accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx" />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="mt-4 w-full rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-deep disabled:opacity-60"
          >
            {busy ? ta.uploading : t.chooseFile}
          </button>
          <p className="mt-2 text-center text-xs text-ink-soft/70">{t.uploadHint2}</p>
          {err && <p className="mt-3 text-center text-sm font-semibold text-red-600">Upload failed.</p>}
          {done && <p className="mt-3 text-center text-sm font-semibold text-emerald-600">{t.uploadDone}</p>}
        </div>
      )}

      {tab === "shares" && (
        <div className="mt-5">
          <p className="rounded-2xl border border-violet-200 bg-violet-50/60 px-4 py-3 text-xs text-violet-900">{t.shareNote}</p>
          <div className="mt-4 space-y-3">
            {sharedRows.length === 0 && (
              <p className="rounded-2xl border border-dashed border-line bg-white px-5 py-10 text-center text-sm text-ink-soft/60">{t.shareEmpty}</p>
            )}
            {sharedRows.map((d) => (
              <div key={d.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-white px-5 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">
                    {d.file_name}
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">v{d.version_no ?? 1}</span>
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-brand-deep">{shareLink(d)}</p>
                  <p className="mt-0.5 text-[11px] text-ink-soft/70">
                    {t.expiryLabel}: {d.share_expires_at ? new Date(d.share_expires_at).toLocaleString() : t.expiryNever}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => copy(shareLink(d))}
                    className="rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-deep">
                    {copied ? t.copied : t.copyLink}
                  </button>
                  <button type="button" onClick={() => revokeShare(d)}
                    className="rounded-full border border-line px-4 py-1.5 text-xs font-bold text-ink-soft hover:border-red-400 hover:text-red-600">
                    {t.revoke}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {shareDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setShareDoc(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-ink">{t.shareTitle}</h3>
            <p className="mt-1 truncate text-sm text-ink-soft">{shareDoc.file_name} · v{shareDoc.version_no ?? 1}</p>
            {!shareDoc.share_token ? (
              <>
                <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-ink-soft">{t.expiryLabel}</label>
                <div className="mt-1.5 flex gap-2">
                  {(["7d", "30d", "never"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setExpiry(k)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${
                        expiry === k ? "border-brand bg-brand-tint text-brand-deep" : "border-line text-ink-soft"
                      }`}
                    >
                      {t[k === "7d" ? "expiry7d" : k === "30d" ? "expiry30d" : "expiryNever"]}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={createShare}
                  className="mt-4 w-full rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brand-deep"
                >
                  {t.createShare}
                </button>
              </>
            ) : (
              <>
                <p className="mt-4 break-all rounded-xl bg-brand-tint-soft p-3 font-mono text-xs text-brand-deep">
                  {shareLink(shareDoc)}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => copy(shareLink(shareDoc))}
                    className="flex-1 rounded-2xl bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-deep"
                  >
                    {copied ? t.copied : t.copyLink}
                  </button>
                  <button
                    type="button"
                    onClick={() => revokeShare(shareDoc)}
                    className="rounded-2xl border border-line px-5 py-2.5 text-sm font-bold text-ink-soft hover:border-red-400 hover:text-red-600"
                  >
                    {t.revoke}
                  </button>
                </div>
              </>
            )}
            <button
              type="button"
              onClick={() => setShareDoc(null)}
              className="mt-3 w-full py-1 text-center text-xs font-semibold text-ink-soft hover:text-ink"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
