"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Sheet = {
  id: string; gttid: string | null; title: string; currency: string;
  eta_date: string | null; status: string; notes: string | null;
  item_count: number; total: number; duty_total: number; updated_at: string;
};

type CostItem = {
  id: string; category: string; label: string | null; amount: number;
  notes: string | null; sort: number;
};

type Payable = {
  id: string; payee: string; category: string; amount: number; currency: string;
  due_date: string | null; gttid: string | null; status: string;
  paid_date: string | null; notes: string | null; updated_at: string;
};

const COST_CATS = ["goods", "freight", "insurance", "duty", "drayage", "warehouse", "demurrage", "other"];
const PAY_CATS = ["duty", "freight", "drayage", "warehouse", "supplier", "other"];
const SHEET_STATUSES = ["draft", "final"];
const PAY_STATUSES = ["pending", "paid", "cancelled"];

function money(n: number, cur: string, locale: string) {
  const s = (Math.round(n * 100) / 100).toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  return cur === "USD" ? "$" + s : s + " " + cur;
}

function joinMoney(pairs: { c: string; t: number }[], locale: string) {
  if (!pairs.length) return money(0, "USD", locale);
  return pairs.map((p) => money(p.t, p.c, locale)).join(" · ");
}

function sumByCurrency<T>(rows: T[], amt: (r: T) => number, cur: (r: T) => string) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(cur(r), (m.get(cur(r)) ?? 0) + amt(r));
  return [...m.entries()].map(([c, t]) => ({ c, t: Math.round(t * 100) / 100 }));
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function statusTone(s: string) {
  if (s === "final" || s === "paid") return "bg-ok-tint text-ok ring-ok/30";
  if (s === "overdue") return "bg-risk-tint text-risk ring-risk/30";
  if (s === "cancelled") return "bg-card-soft text-faint ring-line";
  return "bg-warn-tint text-warn ring-warn/30";
}

export default function FinanceBoard({ messages, locale }: { messages: Record<string, string>; locale: string }) {
  const t = (k: string) => messages[k] ?? k;
  const [tab, setTab] = useState<"cost" | "forecast" | "payables">("cost");

  return (
    <div>
      <div className="flex gap-2">
        {(["cost", "forecast", "payables"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${
              tab === v ? "bg-brand text-white shadow-sm" : "bg-white text-ink-soft ring-1 ring-line hover:ring-brand"
            }`}
          >
            {t("tab" + v.charAt(0).toUpperCase() + v.slice(1))}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {tab === "cost" && <CostTab t={t} locale={locale} />}
        {tab === "forecast" && <ForecastTab t={t} locale={locale} />}
        {tab === "payables" && <PayablesTab t={t} locale={locale} />}
      </div>
    </div>
  );
}

/* ================= 到岸成本 ================= */
function CostTab({ t, locale }: { t: (k: string) => string; locale: string }) {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<null | { sheet?: Sheet }>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [estimatorFor, setEstimatorFor] = useState<Sheet | null>(null);
  const deb = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/app/finance/sheets${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      const d = await r.json();
      setSheets(d.sheets ?? []);
    } catch { /* keep old */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(""); }, [load]);
  useEffect(() => {
    if (deb.current) clearTimeout(deb.current);
    deb.current = setTimeout(() => load(q.trim()), 350);
    return () => { if (deb.current) clearTimeout(deb.current); };
  }, [q, load]);

  const del = async (s: Sheet) => {
    if (!confirm(t("deleteConfirmSheet").replace("%TITLE%", s.title))) return;
    await fetch(`/api/app/finance/sheets/${s.id}`, { method: "DELETE" });
    if (openId === s.id) setOpenId(null);
    load(q.trim());
  };

  const flip = async (s: Sheet) => {
    await fetch(`/api/app/finance/sheets/${s.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s.status === "draft" ? "final" : "draft" }),
    });
    load(q.trim());
  };

  const landed = sumByCurrency(sheets, (s) => s.total, (s) => s.currency);
  const drafts = sheets.filter((s) => s.status === "draft").length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPh")}
          className="min-w-0 flex-1 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-soft/60 focus:border-brand"
        />
        <button onClick={() => setForm({})}
          className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5">
          + {t("addSheet")}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-3xl font-bold text-ink">{sheets.length}</p>
          <p className="mt-1 text-xs font-medium text-ink-soft">{t("statSheets")}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="truncate text-2xl font-bold text-brand">{joinMoney(landed, locale)}</p>
          <p className="mt-1 text-xs font-medium text-ink-soft">{t("statLandedTotal")}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-3xl font-bold text-warn">{drafts}</p>
          <p className="mt-1 text-xs font-medium text-ink-soft">{t("statDraft")}</p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="hidden grid-cols-12 gap-2 border-b border-line bg-brand-tint-soft/60 px-5 py-3 text-xs font-bold uppercase tracking-wide text-ink-soft md:grid">
          <div className="col-span-4">{t("thTitle")}</div>
          <div className="col-span-2">{t("thEta")}</div>
          <div className="col-span-2">{t("thItems")}</div>
          <div className="col-span-2">{t("thTotal")}</div>
          <div className="col-span-2 text-right">{t("thActions")}</div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-ink-soft">…</div>
        ) : sheets.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-soft">{t("emptySheets")}</div>
        ) : (
          sheets.map((s) => (
            <div key={s.id} className="border-b border-line/70 last:border-0">
              <div className="grid grid-cols-12 items-center gap-2 px-5 py-4">
                <div className="col-span-8 md:col-span-4">
                  <button onClick={() => setOpenId(openId === s.id ? null : s.id)} className="text-left">
                    <p className="text-sm font-bold text-ink hover:text-brand-deep">{s.title}</p>
                  </button>
                  {s.gttid && <p className="font-mono text-xs text-ink-soft">{s.gttid}</p>}
                </div>
                <div className="col-span-4 md:col-span-2">
                  <span className="text-sm text-ink">{s.eta_date ?? "—"}</span>
                </div>
                <div className="col-span-4 md:col-span-2">
                  <span className="text-sm text-ink">{s.item_count}</span>
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${statusTone(s.status)}`}>
                    {t("status_" + s.status)}
                  </span>
                </div>
                <div className="col-span-4 md:col-span-2">
                  <span className="text-sm font-bold text-ink">{money(s.total, s.currency, locale)}</span>
                </div>
                <div className="col-span-4 md:col-span-2 flex md:justify-end gap-2">
                  <button onClick={() => setEstimatorFor(s)} className="text-xs font-bold text-brand-deep hover:underline">{t("dutyEstimator")}</button>
                  <button onClick={() => flip(s)} className="text-xs font-bold text-ink-soft hover:underline">
                    {s.status === "draft" ? t("finalize") : t("reopen")}
                  </button>
                  <button onClick={() => setForm({ sheet: s })} className="text-xs font-bold text-brand-deep hover:underline">{t("edit")}</button>
                  <button onClick={() => del(s)} className="text-xs font-bold text-risk hover:underline">{t("delete")}</button>
                </div>
              </div>
              {openId === s.id && (
                <SheetDetail t={t} locale={locale} sheet={s} onChanged={() => load(q.trim())} />
              )}
            </div>
          ))
        )}
      </div>
      <p className="mt-3 text-xs text-ink-soft">{t("perCurrencyNote")}</p>

      {form && (
        <SheetForm t={t} sheet={form.sheet} onClose={() => setForm(null)}
          onSaved={() => { setForm(null); load(q.trim()); }} />
      )}
      {estimatorFor && (
        <DutyEstimator t={t} locale={locale} sheet={estimatorFor}
          onClose={() => setEstimatorFor(null)}
          onAdded={() => { setEstimatorFor(null); load(q.trim()); }} />
      )}
    </div>
  );
}

function SheetDetail({ t, locale, sheet, onChanged }: {
  t: (k: string) => string; locale: string; sheet: Sheet; onChanged: () => void;
}) {
  const [items, setItems] = useState<CostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [cat, setCat] = useState("freight");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [editing, setEditing] = useState<CostItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/app/finance/sheets/${sheet.id}`);
      const d = await r.json();
      setItems(d.items ?? []);
    } catch { /* keep old */ }
    setLoading(false);
  }, [sheet.id]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) return;
    await fetch(`/api/app/finance/sheets/${sheet.id}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: cat, label: label.trim(), amount: n }),
    });
    setLabel(""); setAmount(""); setAdding(false);
    load(); onChanged();
  };

  const delItem = async (it: CostItem) => {
    if (!confirm(t("deleteConfirmItem"))) return;
    await fetch(`/api/app/finance/items/${it.id}`, { method: "DELETE" });
    load(); onChanged();
  };

  const saveEdit = async () => {
    if (!editing) return;
    const n = Number(editing.amount);
    if (!Number.isFinite(n) || n < 0) return;
    await fetch(`/api/app/finance/items/${editing.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: editing.category, label: editing.label, amount: n }),
    });
    setEditing(null);
    load(); onChanged();
  };

  const byCat = new Map<string, number>();
  for (const it of items) byCat.set(it.category, (byCat.get(it.category) ?? 0) + Number(it.amount));
  const total = [...byCat.values()].reduce((a, b) => a + b, 0);

  const input = "rounded-xl border border-line bg-white px-3 py-1.5 text-sm text-ink outline-none focus:border-brand";

  return (
    <div className="border-t border-dashed border-line bg-brand-tint-soft/40 px-5 py-4">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t("sheetItems")}</p>
      {loading ? (
        <p className="py-4 text-center text-sm text-ink-soft">…</p>
      ) : (
        <div className="mt-2 overflow-hidden rounded-xl border border-line bg-white">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-2 border-b border-line/60 px-4 py-2 last:border-0">
              <span className="shrink-0 rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-bold text-brand-deep">
                {t("cat_" + it.category)}
              </span>
              {editing?.id === it.id ? (
                <>
                  <select value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className={input}>
                    {COST_CATS.map((c) => <option key={c} value={c}>{t("cat_" + c)}</option>)}
                  </select>
                  <input value={editing.label ?? ""} onChange={(e) => setEditing({ ...editing, label: e.target.value })} className={`${input} min-w-0 flex-1`} />
                  <input type="number" min={0} value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) })} className={`${input} w-28`} />
                  <button onClick={saveEdit} className="text-xs font-bold text-brand-deep hover:underline">{t("save")}</button>
                  <button onClick={() => setEditing(null)} className="text-xs font-bold text-ink-soft hover:underline">{t("cancel")}</button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{it.label || t("cat_" + it.category)}</span>
                  <span className="font-mono text-sm font-bold text-ink">{money(Number(it.amount), sheet.currency, locale)}</span>
                  <button onClick={() => setEditing(it)} className="text-xs font-bold text-brand-deep hover:underline">{t("edit")}</button>
                  <button onClick={() => delItem(it)} className="text-xs font-bold text-risk hover:underline">{t("delete")}</button>
                </>
              )}
            </div>
          ))}
          {items.length === 0 && <p className="px-4 py-3 text-sm text-ink-soft">{t("emptyItems")}</p>}
          <div className="flex items-center justify-between bg-brand-tint-soft/60 px-4 py-2">
            <span className="text-xs font-bold text-ink-soft">{t("grandTotal")}</span>
            <span className="font-mono text-sm font-bold text-ink">{money(total, sheet.currency, locale)}</span>
          </div>
        </div>
      )}

      {!adding ? (
        <button onClick={() => setAdding(true)} className="mt-3 text-xs font-bold text-brand-deep hover:underline">
          + {t("addItem")}
        </button>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={input}>
            {COST_CATS.map((c) => <option key={c} value={c}>{t("cat_" + c)}</option>)}
          </select>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("fItemLabel")} className={`${input} min-w-0 flex-1`} />
          <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t("fItemAmount")} className={`${input} w-32`} />
          <button onClick={add} className="rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-white">{t("save")}</button>
          <button onClick={() => setAdding(false)} className="text-xs font-bold text-ink-soft hover:underline">{t("cancel")}</button>
        </div>
      )}
    </div>
  );
}

/* ---- 关税估算器：接真实税率库 ---- */
function DutyEstimator({ t, locale, sheet, onClose, onAdded }: {
  t: (k: string) => string; locale: string; sheet: Sheet; onClose: () => void; onAdded: () => void;
}) {
  const [hts, setHts] = useState("");
  const [origin, setOrigin] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | {
    hts_no: string; mfn: number | null; rate_text: string | null;
    suggestions: { duty_type: string; rate: number; source: string }[];
    duty: number; totalRate: number;
  }>(null);
  const [err, setErr] = useState("");

  const run = async () => {
    const v = Number(value);
    if (!hts.trim() || !origin.trim() || !Number.isFinite(v) || v <= 0) { setErr(t("estimatorInputErr")); return; }
    setBusy(true); setErr(""); setResult(null);
    try {
      const r = await fetch(`/api/public/duty-lookup?hts=${encodeURIComponent(hts.trim())}&origin=${encodeURIComponent(origin.trim())}`);
      const d = await r.json();
      if (!d.found) { setErr(t("dutyNotFound")); setBusy(false); return; }
      const mfn = d.general_rate != null ? Number(d.general_rate) : null;
      const suggestions = (d.duty_suggestions ?? []).filter((s: any) => s.kind === "rate");
      const addRate = suggestions.reduce((a: number, s: any) => a + Number(s.rate || 0), 0);
      const totalRate = (mfn ?? 0) + addRate;
      setResult({
        hts_no: d.hts_no, mfn, rate_text: d.rate_text ?? null, suggestions,
        duty: Math.round(v * totalRate) / 100, totalRate,
      });
    } catch { setErr(t("dutyNotFound")); }
    setBusy(false);
  };

  const addItem = async () => {
    if (!result) return;
    const parts = [
      result.mfn != null ? `MFN ${result.mfn}%` : null,
      ...result.suggestions.map((s) => `${s.duty_type} ${s.rate}%`),
    ].filter(Boolean).join(" + ");
    await fetch(`/api/app/finance/sheets/${sheet.id}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "duty",
        label: t("dutyItemLabel").replace("%HTS%", result.hts_no),
        amount: result.duty,
        notes: parts,
      }),
    });
    onAdded();
  };

  const input = "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand";
  const label = "mb-1 block text-xs font-bold text-ink-soft";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-ink">{t("dutyEstimator")}</h3>
        <p className="mt-1 text-xs text-ink-soft">{t("dutyHint")}</p>
        <div className="mt-4 grid gap-3">
          <div><label className={label}>{t("fHts")}</label><input className={input} value={hts} onChange={(e) => setHts(e.target.value)} placeholder="9506.91.00" /></div>
          <div><label className={label}>{t("fOrigin")}</label><input className={input} value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="China" /></div>
          <div><label className={label}>{t("fCargoValue")} ({sheet.currency})</label><input type="number" min={0} className={input} value={value} onChange={(e) => setValue(e.target.value)} placeholder="10000" /></div>
        </div>
        {err && <p className="mt-3 text-sm font-bold text-risk">{err}</p>}
        {result && (
          <div className="mt-4 rounded-2xl border border-line bg-brand-tint-soft/50 p-4">
            <p className="font-mono text-sm font-bold text-ink">{result.hts_no}</p>
            <p className="mt-1 text-sm text-ink">
              {t("dutyMfn")}: {result.rate_text ?? (result.mfn != null ? result.mfn + "%" : "—")}
            </p>
            {result.suggestions.map((s, i) => (
              <p key={i} className="text-sm text-ink">{s.duty_type}: {s.rate}% <span className="text-xs text-ink-soft">({s.source})</span></p>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
              <span className="text-sm font-bold text-ink">{t("dutyAmount")}</span>
              <span className="font-mono text-lg font-bold text-brand-deep">{money(result.duty, sheet.currency, locale)}</span>
            </div>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-line px-5 py-2 text-sm font-bold text-ink-soft">{t("cancel")}</button>
          {!result ? (
            <button onClick={run} disabled={busy} className="rounded-full bg-brand px-6 py-2 text-sm font-bold text-white disabled:opacity-50">
              {busy ? "…" : t("estimateDuty")}
            </button>
          ) : (
            <button onClick={addItem} className="rounded-full bg-brand px-6 py-2 text-sm font-bold text-white">
              {t("addDutyItem")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= 关税预测 ================= */
function ForecastTab({ t, locale }: { t: (k: string) => string; locale: string }) {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/app/finance/sheets");
        const d = await r.json();
        setSheets((d.sheets ?? []).filter((s: Sheet) => s.status === "draft" && s.eta_date && s.duty_total > 0));
      } catch { /* keep old */ }
      setLoading(false);
    })();
  }, []);

  const months = new Map<string, Sheet[]>();
  for (const s of sheets) {
    const k = s.eta_date!.slice(0, 7);
    if (!months.has(k)) months.set(k, []);
    months.get(k)!.push(s);
  }
  const ordered = [...months.entries()].sort(([a], [b]) => a.localeCompare(b));
  const monthName = (ym: string) => {
    const d = new Date(ym + "-01T00:00:00");
    return d.toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US", { year: "numeric", month: "long" });
  };
  const maxTotal = Math.max(0, ...ordered.map(([, list]) =>
    Math.max(0, ...sumByCurrency(list, (s) => s.duty_total, (s) => s.currency).map((p) => p.t))));

  return (
    <div>
      <p className="text-sm text-ink-soft">{t("forecastSub")}</p>
      {loading ? (
        <p className="py-10 text-center text-sm text-ink-soft">…</p>
      ) : ordered.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-line bg-white p-10 text-center text-sm text-ink-soft">
          {t("emptyForecast")}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {ordered.map(([ym, list]) => {
            const perCur = sumByCurrency(list, (s) => s.duty_total, (s) => s.currency);
            return (
              <div key={ym} className="rounded-2xl border border-line bg-white p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-ink">{monthName(ym)}</h3>
                  <span className="font-mono text-sm font-bold text-brand-deep">{joinMoney(perCur, locale)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-brand-tint-soft">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${maxTotal ? Math.round((perCur[0]?.t ?? 0) / maxTotal * 100) : 0}%` }} />
                </div>
                <div className="mt-3 divide-y divide-line/60">
                  {list.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink">{s.title}</p>
                        <p className="text-xs text-ink-soft">ETA {s.eta_date}{s.gttid ? ` · ${s.gttid}` : ""}</p>
                      </div>
                      <span className="font-mono text-sm font-bold text-ink">{money(s.duty_total, s.currency, locale)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-xs text-ink-soft">{t("forecastHint")}</p>
    </div>
  );
}

/* ================= 应付与现金流 ================= */
function PayablesTab({ t, locale }: { t: (k: string) => string; locale: string }) {
  const [items, setItems] = useState<Payable[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<null | { p?: Payable }>(null);
  const deb = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (query: string, f: string) => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (query) sp.set("q", query);
      if (f !== "all" && PAY_STATUSES.includes(f)) sp.set("status", f);
      const r = await fetch(`/api/app/finance/payables${sp.toString() ? `?${sp}` : ""}`);
      const d = await r.json();
      setItems(d.payables ?? []);
    } catch { /* keep old */ }
    setLoading(false);
  }, []);

  useEffect(() => { load("", "all"); }, [load]);
  useEffect(() => {
    if (deb.current) clearTimeout(deb.current);
    deb.current = setTimeout(() => load(q.trim(), filter), 350);
    return () => { if (deb.current) clearTimeout(deb.current); };
  }, [q, filter, load]);

  const today = todayStr();
  const isOverdue = (p: Payable) => p.status === "pending" && p.due_date != null && p.due_date < today;
  const dispStatus = (p: Payable) => (isOverdue(p) ? "overdue" : p.status);

  const markPaid = async (p: Payable) => {
    await fetch(`/api/app/finance/payables/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" }),
    });
    load(q.trim(), filter);
  };

  const del = async (p: Payable) => {
    if (!confirm(t("deleteConfirmPayable").replace("%PAYEE%", p.payee))) return;
    await fetch(`/api/app/finance/payables/${p.id}`, { method: "DELETE" });
    load(q.trim(), filter);
  };

  const inDays = (n: number) => {
    const d = new Date(); d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const overdue = items.filter(isOverdue);
  const due7 = items.filter((p) => p.status === "pending" && p.due_date && p.due_date >= today && p.due_date <= inDays(7));
  const due30 = items.filter((p) => p.status === "pending" && p.due_date && p.due_date >= today && p.due_date <= inDays(30));

  return (
    <div>
      <p className="text-sm text-ink-soft">{t("paySub")}</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className={`truncate text-xl font-bold ${overdue.length ? "text-risk" : "text-ink-soft"}`}>
            {joinMoney(sumByCurrency(overdue, (p) => p.amount, (p) => p.currency), locale)}
          </p>
          <p className="mt-1 text-xs font-medium text-ink-soft">{t("statOverdue")} ({overdue.length})</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className={`truncate text-xl font-bold ${due7.length ? "text-warn" : "text-ink-soft"}`}>
            {joinMoney(sumByCurrency(due7, (p) => p.amount, (p) => p.currency), locale)}
          </p>
          <p className="mt-1 text-xs font-medium text-ink-soft">{t("statDue7")}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="truncate text-xl font-bold text-brand">
            {joinMoney(sumByCurrency(due30, (p) => p.amount, (p) => p.currency), locale)}
          </p>
          <p className="mt-1 text-xs font-medium text-ink-soft">{t("statDue30")}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPh")}
          className="min-w-0 flex-1 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-soft/60 focus:border-brand"
        />
        <div className="flex gap-1.5">
          {["all", ...PAY_STATUSES].map((v) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition-colors ${filter === v ? "bg-brand text-white ring-brand" : "bg-white text-ink-soft ring-line hover:ring-brand"}`}>
              {v === "all" ? t("filterAll") : t("pay_" + v)}
            </button>
          ))}
        </div>
        <button onClick={() => setForm({})}
          className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5">
          + {t("addPayable")}
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="hidden grid-cols-12 gap-2 border-b border-line bg-brand-tint-soft/60 px-5 py-3 text-xs font-bold uppercase tracking-wide text-ink-soft md:grid">
          <div className="col-span-3">{t("thPayee")}</div>
          <div className="col-span-2">{t("thCategory")}</div>
          <div className="col-span-2">{t("thAmount")}</div>
          <div className="col-span-2">{t("thDue")}</div>
          <div className="col-span-1">{t("thStatus")}</div>
          <div className="col-span-2 text-right">{t("thActions")}</div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-ink-soft">…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-soft">{t("emptyPayables")}</div>
        ) : (
          items.map((p) => (
            <div key={p.id} className="border-b border-line/70 last:border-0">
              <div className="grid grid-cols-12 items-center gap-2 px-5 py-4">
                <div className="col-span-6 md:col-span-3">
                  <p className="text-sm font-bold text-ink">{p.payee}</p>
                  {p.gttid && <p className="font-mono text-xs text-ink-soft">{p.gttid}</p>}
                </div>
                <div className="col-span-6 md:col-span-2">
                  <span className="text-xs font-bold text-ink">{t("cat_" + p.category)}</span>
                </div>
                <div className="col-span-4 md:col-span-2">
                  <span className="font-mono text-sm font-bold text-ink">{money(p.amount, p.currency, locale)}</span>
                </div>
                <div className="col-span-4 md:col-span-2">
                  <span className={`text-sm ${isOverdue(p) ? "font-bold text-risk" : "text-ink"}`}>{p.due_date ?? "—"}</span>
                </div>
                <div className="col-span-4 md:col-span-1">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${statusTone(dispStatus(p))}`}>
                    {t("pay_" + dispStatus(p))}
                  </span>
                </div>
                <div className="col-span-12 md:col-span-2 flex md:justify-end gap-2">
                  {p.status === "pending" && (
                    <button onClick={() => markPaid(p)} className="text-xs font-bold text-emerald-600 hover:underline">{t("markPaid")}</button>
                  )}
                  <button onClick={() => setForm({ p })} className="text-xs font-bold text-brand-deep hover:underline">{t("edit")}</button>
                  <button onClick={() => del(p)} className="text-xs font-bold text-risk hover:underline">{t("delete")}</button>
                </div>
              </div>
              {p.notes && (
                <div className="border-t border-dashed border-line bg-brand-tint-soft/40 px-5 py-2">
                  <p className="text-xs text-ink-soft">{p.notes}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <p className="mt-3 text-xs text-ink-soft">{t("perCurrencyNote")}</p>

      {form && (
        <PayableForm t={t} p={form.p} onClose={() => setForm(null)}
          onSaved={() => { setForm(null); load(q.trim(), filter); }} />
      )}
    </div>
  );
}

/* ---- Sheet add/edit form ---- */
function SheetForm({ t, sheet, onClose, onSaved }: {
  t: (k: string) => string; sheet?: Sheet; onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState(sheet?.title ?? "");
  const [gttid, setGttid] = useState(sheet?.gttid ?? "");
  const [currency, setCurrency] = useState(sheet?.currency ?? "USD");
  const [eta, setEta] = useState(sheet?.eta_date ?? "");
  const [status, setStatus] = useState(sheet?.status ?? "draft");
  const [notes, setNotes] = useState(sheet?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!title.trim()) { setErr(t("titleRequired")); return; }
    setSaving(true); setErr("");
    const payload = { title: title.trim(), gttid: gttid.trim(), currency: currency.trim(), eta_date: eta, status, notes: notes.trim() };
    const r = sheet
      ? await fetch(`/api/app/finance/sheets/${sheet.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/app/finance/sheets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setErr(t("saveFailed")); return; }
    onSaved();
  };

  const input = "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand";
  const label = "mb-1 block text-xs font-bold text-ink-soft";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-ink">{sheet ? t("editTitleSheet") : t("addTitleSheet")}</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><label className={label}>{t("fTitle")} *</label><input className={input} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><label className={label}>{t("fGttid")}</label><input className={input} value={gttid} onChange={(e) => setGttid(e.target.value.toUpperCase())} placeholder="NIEL-2026-000001" /></div>
          <div><label className={label}>{t("fCurrency")}</label><input className={input} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} /></div>
          <div><label className={label}>{t("fEta")}</label><input type="date" className={input} value={eta} onChange={(e) => setEta(e.target.value)} /></div>
          <div>
            <label className={label}>{t("fStatus")}</label>
            <div className="flex gap-1.5">
              {SHEET_STATUSES.map((v) => (
                <button key={v} type="button" onClick={() => setStatus(v)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition-colors ${status === v ? "bg-brand text-white ring-brand" : "bg-white text-ink-soft ring-line hover:ring-brand"}`}>
                  {t("status_" + v)}
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

/* ---- Payable add/edit form ---- */
function PayableForm({ t, p, onClose, onSaved }: {
  t: (k: string) => string; p?: Payable; onClose: () => void; onSaved: () => void;
}) {
  const [payee, setPayee] = useState(p?.payee ?? "");
  const [category, setCategory] = useState(p?.category ?? "duty");
  const [amount, setAmount] = useState(p?.amount?.toString() ?? "");
  const [currency, setCurrency] = useState(p?.currency ?? "USD");
  const [due, setDue] = useState(p?.due_date ?? "");
  const [gttid, setGttid] = useState(p?.gttid ?? "");
  const [status, setStatus] = useState(p?.status ?? "pending");
  const [notes, setNotes] = useState(p?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!payee.trim()) { setErr(t("payeeRequired")); return; }
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) { setErr(t("amountInvalid")); return; }
    setSaving(true); setErr("");
    const payload = {
      payee: payee.trim(), category, amount: n, currency: currency.trim(),
      due_date: due, gttid: gttid.trim(), status, notes: notes.trim(),
    };
    const r = p
      ? await fetch(`/api/app/finance/payables/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/app/finance/payables", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setErr(t("saveFailed")); return; }
    onSaved();
  };

  const input = "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand";
  const label = "mb-1 block text-xs font-bold text-ink-soft";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-ink">{p ? t("editTitlePayable") : t("addTitlePayable")}</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div><label className={label}>{t("fPayee")} *</label><input className={input} value={payee} onChange={(e) => setPayee(e.target.value)} /></div>
          <div>
            <label className={label}>{t("fCategory")}</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
              {PAY_CATS.map((c) => <option key={c} value={c}>{t("cat_" + c)}</option>)}
            </select>
          </div>
          <div><label className={label}>{t("fAmount")} *</label><input type="number" min={0} className={input} value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div><label className={label}>{t("fCurrency")}</label><input className={input} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} /></div>
          <div><label className={label}>{t("fDueDate")}</label><input type="date" className={input} value={due} onChange={(e) => setDue(e.target.value)} /></div>
          <div><label className={label}>{t("fGttid")}</label><input className={input} value={gttid} onChange={(e) => setGttid(e.target.value.toUpperCase())} /></div>
          <div>
            <label className={label}>{t("fStatus")}</label>
            <div className="flex flex-wrap gap-1.5">
              {PAY_STATUSES.map((v) => (
                <button key={v} type="button" onClick={() => setStatus(v)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition-colors ${status === v ? "bg-brand text-white ring-brand" : "bg-white text-ink-soft ring-line hover:ring-brand"}`}>
                  {t("pay_" + v)}
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
