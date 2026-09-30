"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { intlLocale } from "@/lib/locale";

type Move = {
  id: string; container_number: string; mbl: string | null; gttid: string | null;
  move_type: string; origin: string | null; destination: string | null;
  carrier: string | null; driver_name: string | null; truck_plate: string | null;
  scheduled_date: string | null; completed_date: string | null; status: string;
  last_free_day: string | null; demurrage_rate: number | null; detention_rate: number | null;
  notes: string | null; updated_at: string;
};

type Appt = {
  id: string; warehouse_name: string; address: string | null; appt_at: string | null;
  appt_type: string; container_number: string | null; reference: string | null;
  status: string; notes: string | null; updated_at: string;
};

const MOVE_TYPES = ["pickup", "delivery", "reposition"];
const MOVE_STATUSES = ["scheduled", "in_transit", "completed", "cancelled"];
const APPT_TYPES = ["inbound", "outbound"];
const APPT_STATUSES = ["scheduled", "confirmed", "completed", "cancelled", "missed"];

function statusTone(s: string) {
  if (s === "completed" || s === "confirmed") return "bg-ok-tint text-ok ring-ok/30";
  if (s === "in_transit") return "bg-brand-tint text-brand-deep ring-brand/30";
  if (s === "cancelled" || s === "missed") return "bg-card-soft text-faint ring-line";
  return "bg-warn-tint text-warn ring-warn/30";
}

export default function LogisticsBoard({ messages, locale }: { messages: Record<string, string>; locale: string }) {
  const t = (k: string) => messages[k] ?? k;
  const [tab, setTab] = useState<"moves" | "appts" | "demurrage">("moves");

  return (
    <div>
      <div className="flex gap-2">
        {(["moves", "appts", "demurrage"] as const).map((v) => (
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
        {tab === "moves" && <MovesTab t={t} locale={locale} />}
        {tab === "appts" && <ApptsTab t={t} locale={locale} />}
        {tab === "demurrage" && <DemurrageTab t={t} locale={locale} />}
      </div>
    </div>
  );
}

/* ================= 拖车协同 ================= */
function MovesTab({ t, locale }: { t: (k: string) => string; locale: string }) {
  const [items, setItems] = useState<Move[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<null | { move?: Move }>(null);
  const [importOpen, setImportOpen] = useState(false);
  const deb = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/app/logistics/moves${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      const d = await r.json();
      setItems(d.moves ?? []);
    } catch { /* keep old */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(""); }, [load]);
  useEffect(() => {
    if (deb.current) clearTimeout(deb.current);
    deb.current = setTimeout(() => load(q.trim()), 350);
    return () => { if (deb.current) clearTimeout(deb.current); };
  }, [q, load]);

  const del = async (m: Move) => {
    if (!confirm(t("deleteConfirmMove").replace("%CODE%", m.container_number))) return;
    await fetch(`/api/app/logistics/moves/${m.id}`, { method: "DELETE" });
    load(q.trim());
  };

  const advance = async (m: Move) => {
    const next = m.status === "scheduled" ? "in_transit" : "completed";
    const body: Record<string, string> = { status: next };
    if (next === "completed") body.completed_date = new Date().toISOString().slice(0, 10);
    await fetch(`/api/app/logistics/moves/${m.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    load(q.trim());
  };

  const inTransit = items.filter((m) => m.status === "in_transit").length;
  const scheduled = items.filter((m) => m.status === "scheduled").length;
  const completed = items.filter((m) => m.status === "completed").length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPh")}
          className="min-w-0 flex-1 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-soft/60 focus:border-brand"
        />
        <button onClick={() => setImportOpen(true)}
          className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-tint">
          {t("import")}
        </button>
        <button onClick={() => setForm({})}
          className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5">
          + {t("addMove")}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { n: String(inTransit), label: t("statInTransit"), tone: "text-brand" },
          { n: String(scheduled), label: t("statScheduled"), tone: "text-warn" },
          { n: String(completed), label: t("statCompleted"), tone: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-white p-4">
            <p className={`text-3xl font-bold ${s.tone}`}>{s.n}</p>
            <p className="mt-1 text-xs font-medium text-ink-soft">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="hidden grid-cols-12 gap-2 border-b border-line bg-brand-tint-soft/60 px-5 py-3 text-xs font-bold uppercase tracking-wide text-ink-soft md:grid">
          <div className="col-span-2">{t("thContainer")}</div>
          <div className="col-span-1">{t("thType")}</div>
          <div className="col-span-3">{t("thRoute")}</div>
          <div className="col-span-2">{t("thCarrier")}</div>
          <div className="col-span-1">{t("thScheduled")}</div>
          <div className="col-span-1">{t("thStatus")}</div>
          <div className="col-span-2 text-right">{t("thActions")}</div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-ink-soft">…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-soft">{t("emptyMoves")}</div>
        ) : (
          items.map((m) => (
            <div key={m.id} className="border-b border-line/70 last:border-0">
              <div className="grid grid-cols-12 items-center gap-2 px-5 py-4">
                <div className="col-span-6 md:col-span-2">
                  <p className="font-mono text-sm font-bold text-ink">{m.container_number}</p>
                  {m.mbl && <p className="text-xs text-ink-soft">{m.mbl}</p>}
                </div>
                <div className="col-span-6 md:col-span-1">
                  <span className="text-xs font-bold text-ink">{t("move_" + m.move_type)}</span>
                </div>
                <div className="col-span-6 md:col-span-3">
                  <p className="text-sm text-ink">{[m.origin, m.destination].filter(Boolean).join(" → ") || "—"}</p>
                  {m.gttid && <p className="font-mono text-xs text-ink-soft">{m.gttid}</p>}
                </div>
                <div className="col-span-6 md:col-span-2">
                  <p className="text-sm text-ink">{m.carrier ?? "—"}</p>
                  {(m.driver_name || m.truck_plate) && (
                    <p className="text-xs text-ink-soft">{[m.driver_name, m.truck_plate].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
                <div className="col-span-3 md:col-span-1">
                  <span className="text-sm text-ink">{m.scheduled_date ?? "—"}</span>
                </div>
                <div className="col-span-3 md:col-span-1">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${statusTone(m.status)}`}>
                    {t("status_" + m.status)}
                  </span>
                </div>
                <div className="col-span-12 md:col-span-2 flex md:justify-end gap-2">
                  {m.status === "scheduled" && (
                    <button onClick={() => advance(m)} className="text-xs font-bold text-brand-deep hover:underline">{t("startMove")}</button>
                  )}
                  {m.status === "in_transit" && (
                    <button onClick={() => advance(m)} className="text-xs font-bold text-emerald-600 hover:underline">{t("completeMove")}</button>
                  )}
                  <button onClick={() => setForm({ move: m })} className="text-xs font-bold text-brand-deep hover:underline">{t("edit")}</button>
                  <button onClick={() => del(m)} className="text-xs font-bold text-risk hover:underline">{t("delete")}</button>
                </div>
              </div>
              {m.last_free_day && (
                <div className="border-t border-dashed border-line bg-brand-tint-soft/40 px-5 py-2">
                  <p className="text-xs text-ink-soft">
                    {t("fLastFreeDay")}: <span className="font-mono font-bold text-ink">{m.last_free_day}</span>
                    {m.demurrage_rate != null && <span className="ml-2">${m.demurrage_rate}/{t("perDay")}</span>}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {form && (
        <MoveForm t={t} move={form.move} onClose={() => setForm(null)}
          onSaved={() => { setForm(null); load(q.trim()); }} />
      )}
      {importOpen && (
        <ImportDialog t={t} onClose={() => setImportOpen(false)} onDone={() => { setImportOpen(false); load(q.trim()); }} />
      )}
    </div>
  );
}

/* ================= 仓储预约 ================= */
function ApptsTab({ t, locale }: { t: (k: string) => string; locale: string }) {
  const [items, setItems] = useState<Appt[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<null | { appt?: Appt }>(null);
  const deb = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/app/logistics/appts${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      const d = await r.json();
      setItems(d.appts ?? []);
    } catch { /* keep old */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(""); }, [load]);
  useEffect(() => {
    if (deb.current) clearTimeout(deb.current);
    deb.current = setTimeout(() => load(q.trim()), 350);
    return () => { if (deb.current) clearTimeout(deb.current); };
  }, [q, load]);

  const del = async (a: Appt) => {
    if (!confirm(t("deleteConfirmAppt").replace("%NAME%", a.warehouse_name))) return;
    await fetch(`/api/app/logistics/appts/${a.id}`, { method: "DELETE" });
    load(q.trim());
  };

  const fmtDt = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString(intlLocale(locale), {
      month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  };

  const upcoming = items.filter((a) => ["scheduled", "confirmed"].includes(a.status)).length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPh")}
          className="min-w-0 flex-1 rounded-2xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink-soft/60 focus:border-brand"
        />
        <button onClick={() => setForm({})}
          className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5">
          + {t("addAppt")}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-3xl font-bold text-brand">{upcoming}</p>
          <p className="mt-1 text-xs font-medium text-ink-soft">{t("statTodayAppts")}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-3xl font-bold text-ink">{items.length}</p>
          <p className="mt-1 text-xs font-medium text-ink-soft">{t("statTotalAppts")}</p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="hidden grid-cols-12 gap-2 border-b border-line bg-brand-tint-soft/60 px-5 py-3 text-xs font-bold uppercase tracking-wide text-ink-soft md:grid">
          <div className="col-span-3">{t("thWarehouse")}</div>
          <div className="col-span-2">{t("thApptTime")}</div>
          <div className="col-span-2">{t("thApptType")}</div>
          <div className="col-span-2">{t("thContainer")}</div>
          <div className="col-span-1">{t("thStatus")}</div>
          <div className="col-span-2 text-right">{t("thActions")}</div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-ink-soft">…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-soft">{t("emptyAppts")}</div>
        ) : (
          items.map((a) => (
            <div key={a.id} className="border-b border-line/70 last:border-0">
              <div className="grid grid-cols-12 items-center gap-2 px-5 py-4">
                <div className="col-span-6 md:col-span-3">
                  <p className="text-sm font-bold text-ink">{a.warehouse_name}</p>
                  {a.address && <p className="text-xs text-ink-soft">{a.address}</p>}
                </div>
                <div className="col-span-6 md:col-span-2">
                  <p className="text-sm text-ink">{fmtDt(a.appt_at)}</p>
                </div>
                <div className="col-span-3 md:col-span-2">
                  <span className="text-xs font-bold text-ink">{t("appt_" + a.appt_type)}</span>
                  {a.reference && <p className="font-mono text-xs text-ink-soft">{a.reference}</p>}
                </div>
                <div className="col-span-3 md:col-span-2">
                  <span className="font-mono text-sm text-ink">{a.container_number ?? "—"}</span>
                </div>
                <div className="col-span-3 md:col-span-1">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${statusTone(a.status)}`}>
                    {t("status_" + a.status)}
                  </span>
                </div>
                <div className="col-span-12 md:col-span-2 flex md:justify-end gap-2">
                  <button onClick={() => setForm({ appt: a })} className="text-xs font-bold text-brand-deep hover:underline">{t("edit")}</button>
                  <button onClick={() => del(a)} className="text-xs font-bold text-risk hover:underline">{t("delete")}</button>
                </div>
              </div>
              {a.notes && (
                <div className="border-t border-dashed border-line bg-brand-tint-soft/40 px-5 py-2">
                  <p className="text-xs text-ink-soft">{a.notes}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {form && (
        <ApptForm t={t} appt={form.appt} onClose={() => setForm(null)}
          onSaved={() => { setForm(null); load(q.trim()); }} />
      )}
    </div>
  );
}

/* ================= 滞期监控 ================= */
function DemurrageTab({ t, locale }: { t: (k: string) => string; locale: string }) {
  const [moves, setMoves] = useState<Move[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/app/logistics/moves");
        const d = await r.json();
        setMoves(d.moves ?? []);
      } catch { /* keep old */ }
      setLoading(false);
    })();
  }, []);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const rows = moves
    .filter((m) => m.last_free_day && !["completed", "cancelled"].includes(m.status))
    .map((m) => {
      const lfd = new Date(m.last_free_day + "T00:00:00");
      const daysLeft = Math.round((lfd.getTime() - today.getTime()) / 86400000);
      const est = daysLeft < 0 && m.demurrage_rate != null ? -daysLeft * m.demurrage_rate : 0;
      return { m, daysLeft, est };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const overdue = rows.filter((r) => r.daysLeft < 0);
  const dueSoon = rows.filter((r) => r.daysLeft >= 0 && r.daysLeft <= 3);
  const exposure = overdue.reduce((a, r) => a + r.est, 0);

  const money = (n: number) => "$" + (Math.round(n * 100) / 100).toLocaleString(intlLocale(locale));

  return (
    <div>
      <p className="text-sm text-ink-soft">{t("demSub")}</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className={`text-3xl font-bold ${overdue.length ? "text-risk" : "text-ink-soft"}`}>{overdue.length}</p>
          <p className="mt-1 text-xs font-medium text-ink-soft">{t("statOverdue")}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className={`text-3xl font-bold ${dueSoon.length ? "text-warn" : "text-ink-soft"}`}>{dueSoon.length}</p>
          <p className="mt-1 text-xs font-medium text-ink-soft">{t("statDueSoon")}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className={`text-3xl font-bold ${exposure > 0 ? "text-risk" : "text-ink-soft"}`}>{money(exposure)}</p>
          <p className="mt-1 text-xs font-medium text-ink-soft">{t("statExposure")}</p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="hidden grid-cols-12 gap-2 border-b border-line bg-brand-tint-soft/60 px-5 py-3 text-xs font-bold uppercase tracking-wide text-ink-soft md:grid">
          <div className="col-span-2">{t("demContainer")}</div>
          <div className="col-span-2">{t("demMbl")}</div>
          <div className="col-span-2">{t("demLfd")}</div>
          <div className="col-span-2">{t("demDays")}</div>
          <div className="col-span-2">{t("demEstCost")}</div>
          <div className="col-span-2">{t("demCarrier")}</div>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-ink-soft">…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-soft">{t("emptyDemurrage")}</div>
        ) : (
          rows.map(({ m, daysLeft, est }) => (
            <div key={m.id} className="grid grid-cols-12 items-center gap-2 border-b border-line/70 px-5 py-4 last:border-0">
              <div className="col-span-6 md:col-span-2">
                <p className="font-mono text-sm font-bold text-ink">{m.container_number}</p>
              </div>
              <div className="col-span-6 md:col-span-2">
                <span className="text-sm text-ink">{m.mbl ?? "—"}</span>
              </div>
              <div className="col-span-4 md:col-span-2">
                <span className="font-mono text-sm text-ink">{m.last_free_day}</span>
              </div>
              <div className="col-span-4 md:col-span-2">
                {daysLeft < 0 ? (
                  <span className="rounded-full bg-risk-tint px-2 py-0.5 text-[11px] font-bold text-risk">
                    {t("daysOverdue").replace("%N%", String(-daysLeft))}
                  </span>
                ) : daysLeft <= 3 ? (
                  <span className="rounded-full bg-warn-tint px-2 py-0.5 text-[11px] font-bold text-warn">
                    {t("daysLeft").replace("%N%", String(daysLeft))}
                  </span>
                ) : (
                  <span className="rounded-full bg-ok-tint px-2 py-0.5 text-[11px] font-bold text-ok">
                    {t("daysLeft").replace("%N%", String(daysLeft))}
                  </span>
                )}
              </div>
              <div className="col-span-4 md:col-span-2">
                <span className={`text-sm font-bold ${est > 0 ? "text-risk" : "text-ink-soft"}`}>{est > 0 ? money(est) : "—"}</span>
              </div>
              <div className="col-span-12 md:col-span-2">
                <span className="text-sm text-ink">{m.carrier ?? "—"}</span>
              </div>
            </div>
          ))
        )}
      </div>
      <p className="mt-3 text-xs text-ink-soft">{t("demHint")}</p>
    </div>
  );
}

/* ---- Move add/edit form ---- */
function MoveForm({ t, move, onClose, onSaved }: {
  t: (k: string) => string; move?: Move; onClose: () => void; onSaved: () => void;
}) {
  const [container, setContainer] = useState(move?.container_number ?? "");
  const [mbl, setMbl] = useState(move?.mbl ?? "");
  const [gttid, setGttid] = useState(move?.gttid ?? "");
  const [moveType, setMoveType] = useState(move?.move_type ?? "delivery");
  const [origin, setOrigin] = useState(move?.origin ?? "");
  const [destination, setDestination] = useState(move?.destination ?? "");
  const [carrier, setCarrier] = useState(move?.carrier ?? "");
  const [driver, setDriver] = useState(move?.driver_name ?? "");
  const [plate, setPlate] = useState(move?.truck_plate ?? "");
  const [sched, setSched] = useState(move?.scheduled_date ?? "");
  const [status, setStatus] = useState(move?.status ?? "scheduled");
  const [lfd, setLfd] = useState(move?.last_free_day ?? "");
  const [demRate, setDemRate] = useState(move?.demurrage_rate?.toString() ?? "");
  const [detRate, setDetRate] = useState(move?.detention_rate?.toString() ?? "");
  const [notes, setNotes] = useState(move?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!container.trim()) { setErr(t("containerRequired")); return; }
    setSaving(true); setErr("");
    const payload = {
      container_number: container.trim(), mbl: mbl.trim(), gttid: gttid.trim(),
      move_type: moveType, origin: origin.trim(), destination: destination.trim(),
      carrier: carrier.trim(), driver_name: driver.trim(), truck_plate: plate.trim(),
      scheduled_date: sched, status, last_free_day: lfd,
      demurrage_rate: demRate, detention_rate: detRate, notes: notes.trim(),
    };
    const r = move
      ? await fetch(`/api/app/logistics/moves/${move.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/app/logistics/moves", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const d = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setErr(t("saveFailed")); return; }
    onSaved();
  };

  const input = "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand";
  const label = "mb-1 block text-xs font-bold text-ink-soft";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-ink">{move ? t("editTitleMove") : t("addTitleMove")}</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div><label className={label}>{t("fContainer")} *</label><input className={input} value={container} onChange={(e) => setContainer(e.target.value.toUpperCase())} placeholder="EGHU8394650" /></div>
          <div>
            <label className={label}>{t("fMoveType")}</label>
            <div className="flex gap-1.5">
              {MOVE_TYPES.map((v) => (
                <button key={v} type="button" onClick={() => setMoveType(v)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition-colors ${moveType === v ? "bg-brand text-white ring-brand" : "bg-white text-ink-soft ring-line hover:ring-brand"}`}>
                  {t("move_" + v)}
                </button>
              ))}
            </div>
          </div>
          <div><label className={label}>{t("fOrigin")}</label><input className={input} value={origin} onChange={(e) => setOrigin(e.target.value)} /></div>
          <div><label className={label}>{t("fDestination")}</label><input className={input} value={destination} onChange={(e) => setDestination(e.target.value)} /></div>
          <div><label className={label}>{t("fMbl")}</label><input className={input} value={mbl} onChange={(e) => setMbl(e.target.value)} /></div>
          <div><label className={label}>{t("fGttid")}</label><input className={input} value={gttid} onChange={(e) => setGttid(e.target.value)} placeholder="NIEL-2026-000001" /></div>
          <div><label className={label}>{t("fCarrier")}</label><input className={input} value={carrier} onChange={(e) => setCarrier(e.target.value)} /></div>
          <div><label className={label}>{t("fDriver")}</label><input className={input} value={driver} onChange={(e) => setDriver(e.target.value)} /></div>
          <div><label className={label}>{t("fTruckPlate")}</label><input className={input} value={plate} onChange={(e) => setPlate(e.target.value)} /></div>
          <div><label className={label}>{t("fScheduledDate")}</label><input type="date" className={input} value={sched} onChange={(e) => setSched(e.target.value)} /></div>
          <div>
            <label className={label}>{t("fStatus")}</label>
            <div className="flex flex-wrap gap-1.5">
              {MOVE_STATUSES.map((v) => (
                <button key={v} type="button" onClick={() => setStatus(v)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition-colors ${status === v ? "bg-brand text-white ring-brand" : "bg-white text-ink-soft ring-line hover:ring-brand"}`}>
                  {t("status_" + v)}
                </button>
              ))}
            </div>
          </div>
          <div><label className={label}>{t("fLastFreeDay")}</label><input type="date" className={input} value={lfd} onChange={(e) => setLfd(e.target.value)} /></div>
          <div><label className={label}>{t("fDemurrageRate")}</label><input type="number" min={0} className={input} value={demRate} onChange={(e) => setDemRate(e.target.value)} placeholder="150" /></div>
          <div><label className={label}>{t("fDetentionRate")}</label><input type="number" min={0} className={input} value={detRate} onChange={(e) => setDetRate(e.target.value)} placeholder="150" /></div>
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

/* ---- Appt add/edit form ---- */
function ApptForm({ t, appt, onClose, onSaved }: {
  t: (k: string) => string; appt?: Appt; onClose: () => void; onSaved: () => void;
}) {
  const [warehouse, setWarehouse] = useState(appt?.warehouse_name ?? "");
  const [address, setAddress] = useState(appt?.address ?? "");
  const [apptAt, setApptAt] = useState(appt?.appt_at ? appt.appt_at.slice(0, 16) : "");
  const [apptType, setApptType] = useState(appt?.appt_type ?? "inbound");
  const [container, setContainer] = useState(appt?.container_number ?? "");
  const [reference, setReference] = useState(appt?.reference ?? "");
  const [status, setStatus] = useState(appt?.status ?? "scheduled");
  const [notes, setNotes] = useState(appt?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!warehouse.trim()) { setErr(t("warehouseRequired")); return; }
    setSaving(true); setErr("");
    const payload = {
      warehouse_name: warehouse.trim(), address: address.trim(),
      appt_at: apptAt ? new Date(apptAt).toISOString() : "",
      appt_type: apptType, container_number: container.trim(),
      reference: reference.trim(), status, notes: notes.trim(),
    };
    const r = appt
      ? await fetch(`/api/app/logistics/appts/${appt.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/app/logistics/appts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setErr(t("saveFailed")); return; }
    onSaved();
  };

  const input = "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand";
  const label = "mb-1 block text-xs font-bold text-ink-soft";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-ink">{appt ? t("editTitleAppt") : t("addTitleAppt")}</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div><label className={label}>{t("fWarehouse")} *</label><input className={input} value={warehouse} onChange={(e) => setWarehouse(e.target.value)} /></div>
          <div><label className={label}>{t("fApptAt")}</label><input type="datetime-local" className={input} value={apptAt} onChange={(e) => setApptAt(e.target.value)} /></div>
          <div className="md:col-span-2"><label className={label}>{t("fAddress")}</label><input className={input} value={address} onChange={(e) => setAddress(e.target.value)} /></div>
          <div>
            <label className={label}>{t("fApptType")}</label>
            <div className="flex gap-1.5">
              {APPT_TYPES.map((v) => (
                <button key={v} type="button" onClick={() => setApptType(v)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition-colors ${apptType === v ? "bg-brand text-white ring-brand" : "bg-white text-ink-soft ring-line hover:ring-brand"}`}>
                  {t("appt_" + v)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={label}>{t("fStatus")}</label>
            <div className="flex flex-wrap gap-1.5">
              {APPT_STATUSES.map((v) => (
                <button key={v} type="button" onClick={() => setStatus(v)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition-colors ${status === v ? "bg-brand text-white ring-brand" : "bg-white text-ink-soft ring-line hover:ring-brand"}`}>
                  {t("status_" + v)}
                </button>
              ))}
            </div>
          </div>
          <div><label className={label}>{t("fContainer")}</label><input className={input} value={container} onChange={(e) => setContainer(e.target.value.toUpperCase())} /></div>
          <div><label className={label}>{t("fReference")}</label><input className={input} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="GTTID / SO" /></div>
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

/* ---- Excel import dialog (moves) ---- */
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
      const r = await fetch("/api/app/logistics/moves/import", { method: "POST", body: fd });
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
