"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Supplier = {
  id: string; code: string; name_en: string | null; name_zh: string | null;
  country: string | null; contact_name: string | null; contact_email: string | null;
  contact_phone: string | null; address: string | null; payment_terms: string | null;
  currency: string | null; status: string;
  score_quality: number | null; score_delivery: number | null;
  score_cost: number | null; score_service: number | null;
  score_overall: number | null;
  docs: Record<string, string>; risk_level: string; risk_flags: string[];
  notes: string | null; updated_at: string;
};

const DOC_KEYS = ["business_license", "iso_cert", "bank_info", "tax_form", "compliance_decl", "insurance"];
const DOC_STATES = ["ok", "pending", "missing"] as const;
const RISK_FLAGS = ["financial", "compliance", "delivery", "quality", "geopolitical"];
const RISK_LEVELS = ["low", "medium", "high"] as const;
const SCORE_FIELDS = ["score_quality", "score_delivery", "score_cost", "score_service"] as const;

function scoreTone(s: number | null) {
  if (s == null) return "text-ink-soft";
  if (s >= 80) return "text-emerald-600";
  if (s >= 60) return "text-amber-600";
  return "text-risk";
}

function riskTone(l: string) {
  if (l === "high") return "bg-risk-tint text-risk ring-risk/30";
  if (l === "medium") return "bg-warn-tint text-warn ring-warn/30";
  return "bg-ok-tint text-ok ring-ok/30";
}

function docTone(s: string) {
  if (s === "ok") return "bg-ok-tint text-ok";
  if (s === "pending") return "bg-warn-tint text-warn";
  return "bg-card-soft text-faint";
}

export default function SuppliersBoard({ messages, locale }: { messages: Record<string, string>; locale: string }) {
  const t = (k: string) => messages[k] ?? k;
  const [items, setItems] = useState<Supplier[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState<null | { supplier?: Supplier }>(null);
  const [importOpen, setImportOpen] = useState(false);
  const deb = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/app/suppliers${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      const d = await r.json();
      setItems(d.suppliers ?? []);
    } catch { /* keep old */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(""); }, [load]);
  useEffect(() => {
    if (deb.current) clearTimeout(deb.current);
    deb.current = setTimeout(() => load(q.trim()), 350);
    return () => { if (deb.current) clearTimeout(deb.current); };
  }, [q, load]);

  const del = async (s: Supplier) => {
    if (!confirm(t("deleteConfirm").replace("%CODE%", s.code))) return;
    await fetch(`/api/app/suppliers/${s.id}`, { method: "DELETE" });
    load(q.trim());
  };

  const scored = items.filter((s) => s.score_overall != null);
  const avgScore = scored.length ? Math.round(scored.reduce((a, s) => a + s.score_overall!, 0) / scored.length) : null;
  const highRisk = items.filter((s) => s.risk_level === "high").length;
  const docsPending = items.filter((s) => DOC_KEYS.some((k) => (s.docs?.[k] ?? "missing") !== "ok")).length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPh")}
          className="min-w-0 flex-1 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-soft/60 focus:border-brand"
        />
        <button
          onClick={() => setImportOpen(true)}
          className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-tint"
        >
          {t("import")}
        </button>
        <button
          onClick={() => setForm({})}
          className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5"
        >
          + {t("addSupplier")}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { n: String(items.length), label: t("statTotal"), tone: "text-brand" },
          { n: avgScore != null ? String(avgScore) : "—", label: t("statAvgScore"), tone: scoreTone(avgScore) },
          { n: String(highRisk), label: t("statHighRisk"), tone: highRisk ? "text-risk" : "text-ink-soft" },
          { n: String(docsPending), label: t("statDocsPending"), tone: docsPending ? "text-warn" : "text-ink-soft" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-white p-4">
            <p className={`text-3xl font-bold ${s.tone}`}>{s.n}</p>
            <p className="mt-1 text-xs font-medium text-ink-soft">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="hidden grid-cols-12 gap-2 border-b border-line bg-brand-tint-soft/60 px-5 py-3 text-xs font-bold uppercase tracking-wide text-ink-soft md:grid">
          <div className="col-span-2">{t("thCode")}</div>
          <div className="col-span-3">{t("thName")}</div>
          <div className="col-span-1">{t("thCountry")}</div>
          <div className="col-span-2">{t("thScore")}</div>
          <div className="col-span-1">{t("thDocs")}</div>
          <div className="col-span-2">{t("thRisk")}</div>
          <div className="col-span-1 text-right">{t("thActions")}</div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-ink-soft">…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-soft">{t("empty")}</div>
        ) : (
          items.map((s) => {
            const docsOk = DOC_KEYS.filter((k) => (s.docs?.[k] ?? "missing") === "ok").length;
            return (
              <div key={s.id} className="border-b border-line/70 last:border-0">
                <div className="grid grid-cols-12 items-center gap-2 px-5 py-4">
                  <div className="col-span-6 md:col-span-2">
                    <p className="font-mono text-sm font-bold text-ink">{s.code}</p>
                    {s.status === "inactive" && (
                      <span className="mt-0.5 inline-block rounded-full bg-card-soft px-2 py-0.5 text-[10px] font-bold text-faint ring-1 ring-line">
                        {t("statusInactive")}
                      </span>
                    )}
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <p className="text-sm font-semibold text-ink">{s.name_zh || s.name_en || "—"}</p>
                    {s.name_zh && s.name_en && <p className="text-xs text-ink-soft">{s.name_en}</p>}
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <span className="text-sm text-ink">{s.country ?? "—"}</span>
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    {s.score_overall != null ? (
                      <span className={`text-lg font-bold ${scoreTone(s.score_overall)}`}>{s.score_overall}</span>
                    ) : (
                      <span className="text-xs text-ink-soft">{t("noScore")}</span>
                    )}
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${docsOk === DOC_KEYS.length ? "bg-ok-tint text-ok" : "bg-warn-tint text-warn"}`}>
                      {docsOk}/{DOC_KEYS.length}
                    </span>
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${riskTone(s.risk_level)}`}>
                      {t("risk" + s.risk_level.charAt(0).toUpperCase() + s.risk_level.slice(1))}
                    </span>
                    {s.risk_flags.length > 0 && (
                      <span className="ml-1 text-[11px] text-ink-soft">+{s.risk_flags.length}</span>
                    )}
                  </div>
                  <div className="col-span-12 md:col-span-1 flex md:justify-end gap-2">
                    <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} className="text-xs font-bold text-brand-deep hover:underline">
                      {t("detail")}
                    </button>
                    <button onClick={() => setForm({ supplier: s })} className="text-xs font-bold text-brand-deep hover:underline">
                      {t("edit")}
                    </button>
                    <button onClick={() => del(s)} className="text-xs font-bold text-risk hover:underline">
                      {t("delete")}
                    </button>
                  </div>
                </div>
                {expanded === s.id && <Detail s={s} t={t} />}
              </div>
            );
          })
        )}
      </div>

      {form && (
        <SupplierForm
          t={t}
          supplier={form.supplier}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); load(q.trim()); }}
        />
      )}
      {importOpen && (
        <ImportDialog t={t} onClose={() => setImportOpen(false)} onDone={() => { setImportOpen(false); load(q.trim()); }} />
      )}
    </div>
  );
}

/* ---- Row detail: scorecard, document checklist, risk flags, contact ---- */
function Detail({ s, t }: { s: Supplier; t: (k: string) => string }) {
  const scoreLabel = (f: string) =>
    f === "score_quality" ? t("scoreQuality") : f === "score_delivery" ? t("scoreDelivery") : f === "score_cost" ? t("scoreCost") : t("scoreService");
  return (
    <div className="border-t border-dashed border-line bg-brand-tint-soft/40 px-5 py-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t("contact")}</p>
          <div className="mt-1 space-y-1 text-sm text-ink">
            {s.contact_name && <p className="font-semibold">{s.contact_name}</p>}
            {s.contact_email && <p className="text-ink-soft">{s.contact_email}</p>}
            {s.contact_phone && <p className="text-ink-soft">{s.contact_phone}</p>}
            {s.address && <p className="text-xs text-ink-soft">{s.address}</p>}
            {(s.payment_terms || s.currency) && (
              <p className="text-xs text-ink-soft">
                {[s.payment_terms, s.currency].filter(Boolean).join(" · ")}
              </p>
            )}
            {!s.contact_name && !s.contact_email && !s.contact_phone && <p className="text-xs text-ink-soft">—</p>}
          </div>
          {s.notes && <p className="mt-2 text-xs text-ink-soft">{s.notes}</p>}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            {t("scoreOverall")}{s.score_overall != null && <span className={`ml-1 ${scoreTone(s.score_overall)}`}>{s.score_overall}</span>}
          </p>
          <div className="mt-2 space-y-2">
            {SCORE_FIELDS.map((f) => {
              const v = s[f];
              return (
                <div key={f}>
                  <div className="flex justify-between text-xs">
                    <span className="text-ink-soft">{scoreLabel(f)}</span>
                    <span className={`font-bold ${scoreTone(v)}`}>{v ?? "—"}</span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-card-soft">
                    <div
                      className={`h-full rounded-full ${v == null ? "" : v >= 80 ? "bg-emerald-500" : v >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${v ?? 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t("docChecklist")}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {DOC_KEYS.map((k) => {
              const st = s.docs?.[k] ?? "missing";
              return (
                <span key={k} className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${docTone(st)}`}>
                  {t("doc_" + k)} · {t("doc" + st.charAt(0).toUpperCase() + st.slice(1))}
                </span>
              );
            })}
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-ink-soft">{t("riskFlags")}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${riskTone(s.risk_level)}`}>
              {t("risk" + s.risk_level.charAt(0).toUpperCase() + s.risk_level.slice(1))}
            </span>
            {s.risk_flags.map((f) => (
              <span key={f} className="rounded-full bg-risk-tint/60 px-2 py-0.5 text-[11px] font-bold text-risk ring-1 ring-risk/20">
                {t("flag_" + f) !== "flag_" + f ? t("flag_" + f) : f}
              </span>
            ))}
            {s.risk_flags.length === 0 && <span className="text-xs text-ink-soft">—</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Add / edit form ---- */
function SupplierForm({ t, supplier, onClose, onSaved }: {
  t: (k: string) => string; supplier?: Supplier; onClose: () => void; onSaved: () => void;
}) {
  const [code, setCode] = useState(supplier?.code ?? "");
  const [nameEn, setNameEn] = useState(supplier?.name_en ?? "");
  const [nameZh, setNameZh] = useState(supplier?.name_zh ?? "");
  const [country, setCountry] = useState(supplier?.country ?? "");
  const [contactName, setContactName] = useState(supplier?.contact_name ?? "");
  const [contactEmail, setContactEmail] = useState(supplier?.contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(supplier?.contact_phone ?? "");
  const [address, setAddress] = useState(supplier?.address ?? "");
  const [paymentTerms, setPaymentTerms] = useState(supplier?.payment_terms ?? "");
  const [currency, setCurrency] = useState(supplier?.currency ?? "");
  const [status, setStatus] = useState(supplier?.status ?? "active");
  const [scores, setScores] = useState<Record<string, string>>({
    score_quality: supplier?.score_quality?.toString() ?? "",
    score_delivery: supplier?.score_delivery?.toString() ?? "",
    score_cost: supplier?.score_cost?.toString() ?? "",
    score_service: supplier?.score_service?.toString() ?? "",
  });
  const [docs, setDocs] = useState<Record<string, string>>(
    Object.fromEntries(DOC_KEYS.map((k) => [k, supplier?.docs?.[k] ?? "missing"]))
  );
  const [riskLevel, setRiskLevel] = useState(supplier?.risk_level ?? "low");
  const [flags, setFlags] = useState<string[]>(supplier?.risk_flags ?? []);
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const toggleFlag = (f: string) =>
    setFlags((v) => (v.includes(f) ? v.filter((x) => x !== f) : [...v, f]));

  const save = async () => {
    if (!code.trim()) { setErr(t("codeRequired")); return; }
    setSaving(true); setErr("");
    const payload = {
      code: code.trim(), name_en: nameEn.trim(), name_zh: nameZh.trim(),
      country: country.trim(), contact_name: contactName.trim(), contact_email: contactEmail.trim(),
      contact_phone: contactPhone.trim(), address: address.trim(),
      payment_terms: paymentTerms.trim(), currency: currency.trim(),
      status, docs, risk_level: riskLevel, risk_flags: flags,
      notes: notes.trim(),
      score_quality: scores.score_quality, score_delivery: scores.score_delivery,
      score_cost: scores.score_cost, score_service: scores.score_service,
    };
    const r = supplier
      ? await fetch(`/api/app/suppliers/${supplier.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/app/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setErr(d.error === "dup_code" ? t("dupCode") : t("saveFailed")); return; }
    onSaved();
  };

  const input = "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand";
  const label = "mb-1 block text-xs font-bold text-ink-soft";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-ink">{supplier ? t("editTitle") : t("addTitle")}</h3>

        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-ink-soft">{t("contact")}</p>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <div><label className={label}>{t("fCode")} *</label><input className={input} value={code} onChange={(e) => setCode(e.target.value)} /></div>
          <div><label className={label}>{t("fCountry")}</label><input className={input} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="CN" maxLength={2} /></div>
          <div><label className={label}>{t("fNameZh")}</label><input className={input} value={nameZh} onChange={(e) => setNameZh(e.target.value)} /></div>
          <div><label className={label}>{t("fNameEn")}</label><input className={input} value={nameEn} onChange={(e) => setNameEn(e.target.value)} /></div>
          <div><label className={label}>{t("fContactName")}</label><input className={input} value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
          <div><label className={label}>{t("fContactPhone")}</label><input className={input} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></div>
          <div className="md:col-span-2"><label className={label}>{t("fContactEmail")}</label><input className={input} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
          <div className="md:col-span-2"><label className={label}>{t("fAddress")}</label><input className={input} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          <div><label className={label}>{t("fPaymentTerms")}</label><input className={input} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Net 30" /></div>
          <div><label className={label}>{t("fCurrency")}</label><input className={input} value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" maxLength={3} /></div>
          <div>
            <label className={label}>{t("fStatus")}</label>
            <div className="flex gap-1.5">
              {(["active", "inactive"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setStatus(v)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition-colors ${status === v ? "bg-brand text-white ring-brand" : "bg-white text-ink-soft ring-line hover:ring-brand"}`}>
                  {v === "active" ? t("statusActive") : t("statusInactive")}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-5 text-xs font-bold uppercase tracking-wide text-ink-soft">{t("scoreOverall")}</p>
        <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
          {SCORE_FIELDS.map((f) => (
            <div key={f}>
              <label className={label}>{t(f === "score_quality" ? "scoreQuality" : f === "score_delivery" ? "scoreDelivery" : f === "score_cost" ? "scoreCost" : "scoreService")}</label>
              <input type="number" min={0} max={100} className={input} value={scores[f]}
                onChange={(e) => setScores((v) => ({ ...v, [f]: e.target.value }))} placeholder="0–100" />
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs font-bold uppercase tracking-wide text-ink-soft">{t("docChecklist")}</p>
        <div className="mt-2 space-y-2">
          {DOC_KEYS.map((k) => (
            <div key={k} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
              <span className="text-sm font-semibold text-ink">{t("doc_" + k)}</span>
              <div className="flex gap-1">
                {DOC_STATES.map((st) => (
                  <button key={st} type="button" onClick={() => setDocs((v) => ({ ...v, [k]: st }))}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${docs[k] === st ? docTone(st) + " ring-1 ring-current" : "bg-white text-ink-soft ring-1 ring-line"}`}>
                    {t("doc" + st.charAt(0).toUpperCase() + st.slice(1))}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs font-bold uppercase tracking-wide text-ink-soft">{t("riskFlags")}</p>
        <div className="mt-2 flex gap-1.5">
          {RISK_LEVELS.map((lv) => (
            <button key={lv} type="button" onClick={() => setRiskLevel(lv)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition-colors ${riskLevel === lv ? riskTone(lv) + " ring-current" : "bg-white text-ink-soft ring-line"}`}>
              {t("riskLevel")}: {t("risk" + lv.charAt(0).toUpperCase() + lv.slice(1))}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {RISK_FLAGS.map((f) => (
            <button key={f} type="button" onClick={() => toggleFlag(f)}
              className={`rounded-full px-3 py-1 text-xs font-bold ring-1 transition-colors ${flags.includes(f) ? "bg-risk text-white ring-risk" : "bg-white text-ink-soft ring-line hover:ring-risk"}`}>
              {t("flag_" + f)}
            </button>
          ))}
        </div>

        <div className="mt-4"><label className={label}>{t("fNotes")}</label><textarea className={input} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

        {err && <p className="mt-3 text-sm font-bold text-risk">{err}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-line px-5 py-2 text-sm font-bold text-ink-soft">{t("cancel")}</button>
          <button onClick={save} disabled={saving} className="rounded-full bg-brand px-6 py-2 text-sm font-bold text-white disabled:opacity-50">
            {saving ? "…" : t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Excel import dialog ---- */
function ImportDialog({ t, onClose, onDone }: { t: (k: string) => string; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");

  const run = async () => {
    if (!file) return;
    setBusy(true); setResult("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/app/suppliers/import", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) { setResult(t("importFailed")); }
      else {
        setResult(t("importDone").replace("%A%", d.imported).replace("%B%", d.updated).replace("%C%", d.skipped));
        setTimeout(onDone, 1200);
      }
    } catch { setResult(t("importFailed")); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-ink">{t("importTitle")}</h3>
        <p className="mt-2 text-sm text-ink-soft">{t("importHint")}</p>
        <label className="mt-4 block cursor-pointer rounded-2xl border border-dashed border-line bg-brand-tint-soft/50 p-6 text-center text-sm font-bold text-brand-deep hover:bg-brand-tint-soft">
          {file ? file.name : t("chooseFile")}
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        {result && <p className="mt-3 text-sm font-bold text-ink">{result}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-line px-5 py-2 text-sm font-bold text-ink-soft">{t("cancel")}</button>
          <button onClick={run} disabled={!file || busy} className="rounded-full bg-brand px-6 py-2 text-sm font-bold text-white disabled:opacity-50">
            {busy ? "…" : t("importRun")}
          </button>
        </div>
      </div>
    </div>
  );
}
