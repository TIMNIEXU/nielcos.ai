"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { buildAlerts, type FreightAlert } from "@/lib/freightAlerts";

type T = Record<string, string>;
type Shipment = {
  id: string;
  gttid: string | null;
  mbl_no: string | null;
  container_number: string | null;
  containers: any;
  status: string | null;
  origin: string | null;
  destination: string | null;
  current_location: string | null;
  eta: string | null;
  milestones: { at?: string | null; location?: string | null; label?: string | null }[] | null;
  updated_at: string | null;
};
type Ticket = {
  id: string;
  type: string;
  title: string;
  note: string;
  status: string;
  created_at: string;
  shipment_id: string | null;
  shipments: { gttid: string | null; mbl_no: string | null; container_number: string | null } | null;
};

const STATUS_TONE: Record<string, string> = {
  pending_pickup: "bg-slate-100 text-slate-600",
  at_port: "bg-blue-50 text-blue-700",
  in_transit: "bg-brand-tint text-brand-deep",
  out_for_delivery: "bg-orange-50 text-orange-700",
  delivered: "bg-emerald-50 text-emerald-700",
  on_hold: "bg-red-50 text-red-700",
};
const ALERT_TONE = {
  danger: "border-red-200 bg-red-50",
  warning: "border-amber-200 bg-amber-50",
  info: "border-slate-200 bg-slate-50",
};
const TICKET_TONE: Record<string, string> = {
  open: "bg-red-50 text-red-700",
  in_progress: "bg-amber-50 text-amber-700",
  resolved: "bg-emerald-50 text-emerald-700",
};

function containerList(s: Shipment): string[] {
  const out: string[] = [];
  if (Array.isArray(s.containers)) {
    for (const c of s.containers) {
      const v = typeof c === "string" ? c : c?.container ?? "";
      if (v) out.push(String(v));
    }
  }
  if (s.container_number && !out.includes(s.container_number)) out.unshift(s.container_number);
  return out;
}

function ShipmentCard({ s, t, statusNames, locale, onTicket }: {
  s: Shipment; t: T; statusNames: Record<string, string>; locale: string;
  onTicket: (s: Shipment) => void;
}) {
  const cntrs = containerList(s);
  const ms = Array.isArray(s.milestones) ? s.milestones : [];
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {s.mbl_no && (
            <span className="rounded-lg bg-brand-tint px-2.5 py-1 font-mono text-[13px] font-bold text-brand-deep">
              MBL {s.mbl_no}
            </span>
          )}
          {s.gttid && <span className="text-[13px] font-semibold text-ink-soft">{s.gttid}</span>}
          {s.status && (
            <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${STATUS_TONE[s.status] ?? "bg-slate-100 text-slate-600"}`}>
              {statusNames[s.status] ?? s.status}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {s.gttid && (
            <Link href={`/${locale}/app/${encodeURIComponent(s.gttid)}`} className="rounded-full border border-brand/30 px-3 py-1 text-[12.5px] font-bold text-brand-deep hover:bg-brand-tint">
              {t.viewShipment}
            </Link>
          )}
          <button onClick={() => onTicket(s)} className="rounded-full bg-amber-100 px-3 py-1 text-[12.5px] font-bold text-amber-800 hover:bg-amber-200">
            {t.createTicket}
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-[13.5px] text-ink-soft sm:grid-cols-2">
        <p>📦 {t.containers}: <span className="font-mono font-semibold text-ink">{cntrs.join(" · ") || "—"}</span></p>
        <p>🗓 {t.eta}: <span className="font-semibold text-ink">{s.eta ? new Date(s.eta).toLocaleDateString() : "—"}</span></p>
        <p>🌍 {(s.origin ?? "") + (s.destination ? ` → ${s.destination}` : "") || "—"}</p>
        {s.current_location && <p>📍 {s.current_location}</p>}
      </div>
      {ms.length > 0 && (
        <div className="mt-4 border-t border-line/60 pt-3">
          <p className="mb-2 text-[12.5px] font-bold text-ink-soft">{t.milestones}</p>
          <ol className="space-y-1.5">
            {ms.slice(0, 8).map((m, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-ink-soft">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span>
                  {m.label ?? ""}
                  {m.location ? ` · ${m.location}` : ""}
                  {m.at ? <span className="text-faint"> · {new Date(m.at).toLocaleDateString()}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function FreightBoard({ t, statusNames, shipments, locale }: {
  t: T; statusNames: Record<string, string>; shipments: Shipment[]; locale: string;
}) {
  const [tab, setTab] = useState<"track" | "alerts" | "exceptions">("track");
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Shipment[] | null>(null);
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [formShip, setFormShip] = useState("");
  const [formType, setFormType] = useState("customs_hold");
  const [formTitle, setFormTitle] = useState("");
  const [formNote, setFormNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const alerts: FreightAlert[] = useMemo(() => buildAlerts(shipments as any[]), [shipments]);
  const shipById = useMemo(() => Object.fromEntries(shipments.map((s) => [s.id, s])), [shipments]);

  const doTrack = async () => {
    if (q.trim().length < 3) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/app/freight/track?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults(data.shipments ?? []);
    } finally {
      setSearching(false);
    }
  };

  const loadTickets = async () => {
    const res = await fetch("/api/app/freight/exceptions");
    const data = await res.json();
    setTickets(data.exceptions ?? []);
  };

  const openTicketForm = (s?: Shipment) => {
    setFormShip(s?.id ?? "");
    setFormType("customs_hold");
    setFormTitle("");
    setFormNote("");
    setMsg("");
    setFormOpen(true);
    setTab("exceptions");
  };

  const submitTicket = async () => {
    if (!formTitle.trim()) { setMsg(t.needTitle); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/app/freight/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipment_id: formShip || null, type: formType, title: formTitle.trim(), note: formNote.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setFormOpen(false);
        setMsg(t.ticketCreated);
        await loadTickets();
      } else {
        setMsg(data.error ?? "error");
      }
    } finally {
      setSaving(false);
    }
  };

  const advanceTicket = async (tk: Ticket) => {
    const next = tk.status === "open" ? "in_progress" : tk.status === "in_progress" ? "resolved" : "open";
    await fetch("/api/app/freight/exceptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tk.id, status: next }),
    });
    await loadTickets();
  };

  const filtered = (tickets ?? []).filter((x) => filter === "all" || x.status === filter);
  const openCount = (tickets ?? []).filter((x) => x.status !== "resolved").length;

  const inputCls = "w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[14px] text-ink placeholder:text-faint focus:border-brand focus:outline-none";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {([["track", t.tabTrack], ["alerts", `${t.tabAlerts}${alerts.length ? ` (${alerts.length})` : ""}`], ["exceptions", `${t.tabExceptions}${openCount ? ` (${openCount})` : ""}`]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => { setTab(k); if (k === "exceptions" && tickets === null) loadTickets(); }}
            className={`rounded-full px-5 py-2 text-[14px] font-bold ${tab === k ? "bg-brand text-white" : "border border-line bg-white text-ink-soft hover:border-brand/40"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── 追踪 ── */}
      {tab === "track" && (
        <div className="mt-5">
          <div className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doTrack()}
              placeholder={t.trackPh} className={`${inputCls} font-mono`} />
            <button onClick={doTrack} disabled={searching || q.trim().length < 3}
              className="shrink-0 rounded-full bg-brand px-6 py-2.5 text-[14px] font-bold text-white hover:bg-brand-dark disabled:opacity-50">
              {searching ? t.searching : `🔍 ${t.trackBtn}`}
            </button>
          </div>
          <p className="mt-2 text-[12.5px] text-faint">{t.trackHint}</p>
          <div className="mt-4 space-y-4">
            {results !== null && results.length === 0 && (
              <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-ink-soft">{t.noResult}</p>
            )}
            {(results ?? []).map((s) => (
              <ShipmentCard key={s.id} s={s} t={t} statusNames={statusNames} locale={locale} onTicket={openTicketForm} />
            ))}
          </div>
        </div>
      )}

      {/* ── 节点预警 ── */}
      {tab === "alerts" && (
        <div className="mt-5 space-y-3">
          {alerts.length === 0 && (
            <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-ink-soft">{t.alertsEmpty}</p>
          )}
          {alerts.map((a, i) => {
            const s = shipById[a.shipmentId];
            return (
              <div key={i} className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${ALERT_TONE[a.level]}`}>
                <div>
                  <p className="text-[14.5px] font-bold text-ink">
                    {a.level === "danger" ? "🔴" : a.level === "warning" ? "🟡" : "🔵"} {t[`alert_${a.code}`]}
                  </p>
                  <p className="mt-0.5 font-mono text-[12.5px] text-ink-soft">
                    {a.mbl ? `MBL ${a.mbl}` : ""}{a.mbl && a.gttid ? " · " : ""}{a.gttid}
                    {a.eta ? ` · ETA ${new Date(a.eta).toLocaleDateString()}` : ""}
                  </p>
                </div>
                {s?.gttid && (
                  <Link href={`/${locale}/app/${encodeURIComponent(s.gttid)}`}
                    className="rounded-full border border-brand/30 bg-white px-4 py-1.5 text-[13px] font-bold text-brand-deep hover:bg-brand-tint">
                    {t.viewShipment}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 异常工单 ── */}
      {tab === "exceptions" && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {[["all", t.filterAll], ["open", t.statusOpen], ["in_progress", t.statusInProgress], ["resolved", t.statusResolved]].map(([k, label]) => (
                <button key={k} onClick={() => setFilter(k)}
                  className={`rounded-full px-4 py-1.5 text-[13px] font-bold ${filter === k ? "bg-ink text-white" : "border border-line bg-white text-ink-soft"}`}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => openTicketForm()}
              className="rounded-full bg-brand px-5 py-2 text-[13.5px] font-bold text-white hover:bg-brand-dark">
              ＋ {t.newTicket}
            </button>
          </div>
          {msg && <p className="mt-3 text-[13px] font-medium text-ink-soft">{msg}</p>}

          {formOpen && (
            <div className="mt-4 rounded-2xl border border-brand/30 bg-white p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{t.ticketShipment}</label>
                  <select value={formShip} onChange={(e) => setFormShip(e.target.value)} className={inputCls}>
                    <option value="">{t.linkedNone}</option>
                    {shipments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {(s.mbl_no ? `MBL ${s.mbl_no}` : s.gttid) ?? s.id} · {s.container_number ?? ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{t.ticketType}</label>
                  <select value={formType} onChange={(e) => setFormType(e.target.value)} className={inputCls}>
                    {["customs_hold","demurrage_risk","doc_missing","schedule_delay","damage_claim","other"].map((k) => (
                      <option key={k} value={k}>{t[`type_${k}`]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{t.ticketTitle}</label>
                <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder={t.ticketTitlePh} className={inputCls} />
              </div>
              <div className="mt-4">
                <label className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{t.ticketNote}</label>
                <textarea value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder={t.ticketNotePh} rows={3} className={inputCls} />
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={submitTicket} disabled={saving}
                  className="rounded-full bg-brand px-6 py-2 text-[14px] font-bold text-white hover:bg-brand-dark disabled:opacity-50">
                  {t.submit}
                </button>
                <button onClick={() => setFormOpen(false)} className="rounded-full border border-line px-6 py-2 text-[14px] font-bold text-ink-soft">
                  {t.cancel}
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-3">
            {tickets !== null && filtered.length === 0 && (
              <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-ink-soft">{t.exceptionsEmpty}</p>
            )}
            {filtered.map((tk) => (
              <div key={tk.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${TICKET_TONE[tk.status] ?? TICKET_TONE.open}`}>
                      {tk.status === "open" ? t.statusOpen : tk.status === "in_progress" ? t.statusInProgress : t.statusResolved}
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[12px] font-semibold text-ink-soft">{t[`type_${tk.type}`] ?? tk.type}</span>
                    <span className="text-[14.5px] font-bold text-ink">{tk.title}</span>
                  </div>
                  <button onClick={() => advanceTicket(tk)}
                    className="rounded-full border border-brand/30 px-3.5 py-1 text-[12.5px] font-bold text-brand-deep hover:bg-brand-tint">
                    {tk.status === "open" ? t.advance : tk.status === "in_progress" ? t.resolve : t.reopen}
                  </button>
                </div>
                {(tk.shipments?.mbl_no || tk.shipments?.gttid) && (
                  <p className="mt-1.5 font-mono text-[12.5px] text-ink-soft">
                    {tk.shipments.mbl_no ? `MBL ${tk.shipments.mbl_no}` : ""}{tk.shipments.gttid ? ` · ${tk.shipments.gttid}` : ""}
                  </p>
                )}
                {tk.note && <p className="mt-1.5 text-[13.5px] text-ink-soft">{tk.note}</p>}
                <p className="mt-1 text-[12px] text-faint">{new Date(tk.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
