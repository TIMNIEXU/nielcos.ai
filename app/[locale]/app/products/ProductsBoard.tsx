"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Duty = {
  kind: string;
  label: string;
  label_cn?: string;
  rate_text?: string;
  source?: string;
  note?: string;
};
type Pga = { hts_prefix: string; agency: string; agency_cn: string; note: string };
type Product = {
  id: string; sku: string; name_en: string | null; name_zh: string | null;
  hts_code: string | null; origin_country: string | null; material: string | null;
  pga_manual: string[]; notes: string | null; updated_at: string;
  mfn_rate: number | null; rate_text: string | null; hts_description: string | null;
  hts_found: boolean; duties: Duty[]; pga_auto: Pga[];
};

const AGENCIES = ["FDA", "EPA", "CPSC", "FCC", "APHIS", "FSIS", "TTB", "DOT", "ATF", "FWS"];

function pct(r: number | null) {
  if (r == null) return "—";
  return `${(r * 100).toFixed(r < 0.01 ? 2 : 1).replace(/\.0$/, "")}%`;
}

export default function ProductsBoard({ messages, locale }: { messages: Record<string, string>; locale: string }) {
  const t = (k: string) => messages[k] ?? k;
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState<null | { product?: Product }>(null);
  const [importOpen, setImportOpen] = useState(false);
  const deb = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/app/products${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      const d = await r.json();
      setItems(d.products ?? []);
    } catch { /* keep old */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(""); }, [load]);
  useEffect(() => {
    if (deb.current) clearTimeout(deb.current);
    deb.current = setTimeout(() => load(q.trim()), 350);
    return () => { if (deb.current) clearTimeout(deb.current); };
  }, [q, load]);

  const del = async (p: Product) => {
    if (!confirm(t("deleteConfirm").replace("%SKU%", p.sku))) return;
    await fetch(`/api/app/products/${p.id}`, { method: "DELETE" });
    load(q.trim());
  };

  const copyHts = (hts: string) => {
    navigator.clipboard?.writeText(hts).catch(() => {});
  };

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
          + {t("addProduct")}
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="hidden grid-cols-12 gap-2 border-b border-line bg-brand-tint-soft/60 px-5 py-3 text-xs font-bold uppercase tracking-wide text-ink-soft md:grid">
          <div className="col-span-2">{t("thSku")}</div>
          <div className="col-span-3">{t("thName")}</div>
          <div className="col-span-2">{t("thHts")}</div>
          <div className="col-span-1">{t("thMfn")}</div>
          <div className="col-span-2">{t("thDuties")}</div>
          <div className="col-span-1">{t("thPga")}</div>
          <div className="col-span-1 text-right">{t("thActions")}</div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-ink-soft">…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-soft">{t("empty")}</div>
        ) : (
          items.map((p) => (
            <div key={p.id} className="border-b border-line/70 last:border-0">
              <div className="grid grid-cols-12 items-center gap-2 px-5 py-4">
                <div className="col-span-6 md:col-span-2">
                  <p className="font-mono text-sm font-bold text-ink">{p.sku}</p>
                  <p className="text-xs text-ink-soft">{p.origin_country ?? "—"}</p>
                </div>
                <div className="col-span-6 md:col-span-3">
                  <p className="text-sm font-semibold text-ink">{p.name_zh || p.name_en || "—"}</p>
                  {p.name_zh && p.name_en && <p className="text-xs text-ink-soft">{p.name_en}</p>}
                </div>
                <div className="col-span-6 md:col-span-2">
                  {p.hts_code ? (
                    <button
                      onClick={() => copyHts(p.hts_code!)}
                      title={t("copyHts")}
                      className="font-mono text-sm font-bold text-brand-deep hover:underline"
                    >
                      {p.hts_code}
                    </button>
                  ) : (
                    <span className="text-sm text-ink-soft">{t("noHts")}</span>
                  )}
                </div>
                <div className="col-span-3 md:col-span-1">
                  <span className="text-sm font-bold text-ink">{pct(p.mfn_rate)}</span>
                </div>
                <div className="col-span-6 md:col-span-2 flex flex-wrap gap-1">
                  {p.duties.length === 0 && <span className="text-xs text-ink-soft">—</span>}
                  {p.duties.map((d, i) => (
                    <span key={i} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
                      {d.kind === "232" ? "232" : d.kind === "301-FL" ? "301" : d.kind} {d.rate_text ?? ""}
                    </span>
                  ))}
                </div>
                <div className="col-span-3 md:col-span-1 flex flex-wrap gap-1">
                  {p.pga_auto.length === 0 && p.pga_manual.length === 0 && <span className="text-xs text-ink-soft">—</span>}
                  {p.pga_auto.map((g) => (
                    <span key={"a" + g.agency} className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 ring-1 ring-sky-200">
                      {g.agency}
                    </span>
                  ))}
                  {p.pga_manual.map((a) => (
                    <span key={"m" + a} className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700 ring-1 ring-violet-300">
                      {a}
                    </span>
                  ))}
                </div>
                <div className="col-span-12 md:col-span-1 flex md:justify-end gap-2">
                  <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="text-xs font-bold text-brand-deep hover:underline">
                    {t("dutyDetail")}
                  </button>
                  <button onClick={() => setForm({ product: p })} className="text-xs font-bold text-brand-deep hover:underline">
                    {t("edit")}
                  </button>
                  <button onClick={() => del(p)} className="text-xs font-bold text-risk hover:underline">
                    {t("delete")}
                  </button>
                </div>
              </div>
              {expanded === p.id && <Detail p={p} t={t} locale={locale} />}
            </div>
          ))
        )}
      </div>

      {form && (
        <ProductForm
          t={t}
          product={form.product}
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

/* ---- Row detail: official HTS description, rate text, duty suggestions, PGA notes ---- */
function Detail({ p, t, locale }: { p: Product; t: (k: string) => string; locale: string }) {
  return (
    <div className="border-t border-dashed border-line bg-brand-tint-soft/40 px-5 py-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t("officialDesc")}</p>
          <p className="mt-1 text-sm text-ink">{p.hts_found ? p.hts_description : t("htsNoMatch")}</p>
          {p.rate_text && <p className="mt-1 font-mono text-xs text-ink-soft">{p.rate_text}</p>}
          {p.material && <p className="mt-1 text-xs text-ink-soft">{t("fMaterial")}: {p.material}</p>}
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t("thDuties")}</p>
          <div className="mt-1 space-y-1.5">
            <p className="text-sm text-ink">MFN <span className="font-bold">{pct(p.mfn_rate)}</span></p>
            {p.duties.length === 0 && <p className="text-xs text-ink-soft">—</p>}
            {p.duties.map((d, i) => (
              <div key={i} className="rounded-xl bg-white p-2.5 ring-1 ring-line">
                <p className="text-xs font-bold text-ink">
                  {d.kind} · {d.rate_text}
                </p>
                <p className="text-xs text-ink-soft">{locale === "zh-CN" ? d.label_cn ?? d.label : d.label}</p>
                {d.source && <p className="mt-0.5 text-[11px] text-ink-soft/70">{d.source}</p>}
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t("thPga")}</p>
          <div className="mt-1 space-y-1.5">
            {p.pga_auto.length === 0 && p.pga_manual.length === 0 && <p className="text-xs text-ink-soft">{t("noPga")}</p>}
            {p.pga_auto.map((g) => (
              <p key={g.agency} className="text-xs text-ink">
                <span className="font-bold text-sky-700">{g.agency}</span>
                <span className="text-ink-soft"> · {locale === "zh-CN" ? g.agency_cn : g.agency} — {g.note}</span>
              </p>
            ))}
            {p.pga_manual.map((a) => (
              <p key={a} className="text-xs text-ink">
                <span className="font-bold text-violet-700">{a}</span>
                <span className="text-ink-soft"> · {t("pgaManualLabel")}</span>
              </p>
            ))}
          </div>
          {p.notes && <p className="mt-2 text-xs text-ink-soft">{p.notes}</p>}
        </div>
      </div>
    </div>
  );
}

/* ---- Add / edit form with HTS keyword search ---- */
function ProductForm({ t, product, onClose, onSaved }: {
  t: (k: string) => string; product?: Product; onClose: () => void; onSaved: () => void;
}) {
  const [sku, setSku] = useState(product?.sku ?? "");
  const [nameEn, setNameEn] = useState(product?.name_en ?? "");
  const [nameZh, setNameZh] = useState(product?.name_zh ?? "");
  const [hts, setHts] = useState(product?.hts_code ?? "");
  const [origin, setOrigin] = useState(product?.origin_country ?? "");
  const [material, setMaterial] = useState(product?.material ?? "");
  const [notes, setNotes] = useState(product?.notes ?? "");
  const [manual, setManual] = useState<string[]>(product?.pga_manual ?? []);
  const [htsQ, setHtsQ] = useState("");
  const [cands, setCands] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const searchHts = async () => {
    if (!htsQ.trim()) return;
    setSearching(true);
    try {
      const r = await fetch("/api/app/customs/suggest", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: htsQ.trim() }),
      });
      const d = await r.json();
      setCands(d.candidates ?? []);
    } catch { setCands([]); }
    setSearching(false);
  };

  const pickHts = async (htsNo: string) => {
    setHts(htsNo);
    setCands([]);
    try {
      const r = await fetch("/api/app/customs/suggest", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hts: htsNo, origin, material }),
      });
      setPreview(await r.json());
    } catch { setPreview(null); }
  };

  const toggleManual = (a: string) =>
    setManual((m) => (m.includes(a) ? m.filter((x) => x !== a) : [...m, a]));

  const save = async () => {
    if (!sku.trim()) { setErr(t("skuRequired")); return; }
    setSaving(true); setErr("");
    const payload = {
      sku: sku.trim(), name_en: nameEn.trim(), name_zh: nameZh.trim(),
      hts_code: hts.trim(), origin_country: origin.trim(), material: material.trim(),
      notes: notes.trim(), pga_manual: manual,
    };
    const r = product
      ? await fetch(`/api/app/products/${product.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/app/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setErr(d.error === "dup_sku" ? t("dupSku") : t("saveFailed")); return; }
    onSaved();
  };

  const input = "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand";
  const label = "mb-1 block text-xs font-bold text-ink-soft";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-ink">{product ? t("editTitle") : t("addTitle")}</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div><label className={label}>{t("fSku")} *</label><input className={input} value={sku} onChange={(e) => setSku(e.target.value)} /></div>
          <div><label className={label}>{t("fOrigin")}</label><input className={input} value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="CN" maxLength={2} /></div>
          <div><label className={label}>{t("fNameZh")}</label><input className={input} value={nameZh} onChange={(e) => setNameZh(e.target.value)} /></div>
          <div><label className={label}>{t("fNameEn")}</label><input className={input} value={nameEn} onChange={(e) => setNameEn(e.target.value)} /></div>
          <div className="md:col-span-2">
            <label className={label}>{t("fHts")}</label>
            <div className="flex gap-2">
              <input className={input} value={hts} onChange={(e) => setHts(e.target.value)} placeholder="9506.91.00" />
            </div>
            <div className="mt-2 flex gap-2">
              <input
                className={input} value={htsQ} onChange={(e) => setHtsQ(e.target.value)}
                placeholder={t("htsSearchPh")} onKeyDown={(e) => e.key === "Enter" && searchHts()}
              />
              <button onClick={searchHts} disabled={searching} className="shrink-0 rounded-xl bg-brand-tint px-4 text-sm font-bold text-brand-deep disabled:opacity-50">
                {searching ? t("htsSearching") : t("htsSearch")}
              </button>
            </div>
            {cands.length > 0 && (
              <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-line">
                {cands.map((c: any) => (
                  <button key={c.hts_no} onClick={() => pickHts(c.hts_no)} className="block w-full px-3 py-2 text-left hover:bg-brand-tint-soft">
                    <span className="font-mono text-xs font-bold text-brand-deep">{c.hts_no}</span>
                    <span className="ml-2 text-xs text-ink">{c.description}</span>
                    <span className="ml-2 text-xs font-bold text-ink-soft">{c.rate_text ?? (c.rate != null ? pct(c.rate) : "")}</span>
                  </button>
                ))}
              </div>
            )}
            {preview?.found && (
              <div className="mt-2 rounded-xl bg-brand-tint-soft/60 p-3 text-xs text-ink">
                <p><span className="font-bold">MFN {pct(preview.general_rate)}</span> <span className="font-mono text-ink-soft">{preview.rate_text}</span></p>
                {(preview.duty_suggestions ?? []).map((d: any, i: number) => (
                  <p key={i} className="mt-0.5 text-amber-700">⚠ {d.kind} · {d.rate_text}</p>
                ))}
                {(preview.pga ?? []).map((g: any) => (
                  <p key={g.agency} className="mt-0.5 text-sky-700">🏷 {g.agency} — {g.note}</p>
                ))}
              </div>
            )}
          </div>
          <div className="md:col-span-2"><label className={label}>{t("fMaterial")}</label><input className={input} value={material} onChange={(e) => setMaterial(e.target.value)} /></div>
          <div className="md:col-span-2">
            <label className={label}>{t("fPgaManual")}</label>
            <div className="flex flex-wrap gap-1.5">
              {AGENCIES.map((a) => (
                <button
                  key={a} type="button" onClick={() => toggleManual(a)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ring-1 transition-colors ${manual.includes(a) ? "bg-violet-600 text-white ring-violet-600" : "bg-white text-ink-soft ring-line hover:ring-violet-400"}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2"><label className={label}>{t("fNotes")}</label><textarea className={input} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
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
      const r = await fetch("/api/app/products/import", { method: "POST", body: fd });
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
