"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type L = Record<string, string>;

type Hold = { name: string; status: string; description: string | null };
type Fee = { type: string; amount: number; currency: string };
type ReleaseState = "released" | "hold" | "unknown";
type TrackEvent = { event: string; timestamp: string | null; location: string | null };

type Cont = {
  container_number: string;
  equipment: string | null;
  terminal: string | null;
  available_for_pickup: boolean | null;
  terminal_supported: boolean;
  customs_state: ReleaseState;
  customs_holds: Hold[];
  carrier_state: ReleaseState;
  carrier_holds: Hold[];
  other_holds: Hold[];
  pickup_ready: boolean | null;
  picked_up: boolean;
  last_free_day: string | null;
  fees: Fee[];
  events: TrackEvent[];
};

type Ship = {
  bill_of_lading_number: string | null;
  booking_number: string | null;
  shipping_line: string | null;
  shipping_line_scac: string | null;
  vessel: string | null;
  voyage: string | null;
  pol: string | null;
  pod: string | null;
  eta: string | null;
  arrived_at: string | null;
};

type ApiResult =
  | { ok: true; status: "ready"; shipment: Ship; containers: Cont[]; fetched_at: string }
  | { ok: true; status: "processing"; fetched_at: string }
  | { ok: false; error: string };

const ERR_KEY: Record<string, string> = {
  invalid_number: "errInvalid",
  not_found: "errNotFound",
  not_configured: "errNotConfigured",
  api_restricted: "errRestricted",
  bad_key: "errRestricted",
  rate_limited: "errRate",
  upstream_error: "errGeneric",
};

function fmtDate(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function eventLabel(raw: string, t: L): string {
  // Terminal49 event names arrive dotted, e.g. "container.transport.vessel_discharged".
  const e = raw.toLowerCase().split(".").pop() ?? raw.toLowerCase();
  if (/transshipment/.test(e) && /discharge/.test(e)) return `${t.evTransshipment} · ${t.evDischarge}`;
  if (/transshipment/.test(e) && /load/.test(e)) return `${t.evTransshipment} · ${t.evLoaded}`;
  if (/transshipment/.test(e)) return t.evTransshipment;
  if (/discharge/.test(e)) return t.evDischarge;
  if (/gate_out/.test(e) && /empty/.test(e)) return t.evEmptyOut;
  if (/gate_out/.test(e)) return t.evGateOut;
  if (/gate_in/.test(e)) return t.evGateIn;
  if (/empty_in|empty.*return|return.*empty/.test(e)) return t.evEmptyReturn;
  if (/vessel.*(arriv|berth)|arriv.*vessel/.test(e)) return t.evArrived;
  if (/depart/.test(e)) return t.evDeparted;
  if (/load/.test(e)) return t.evLoaded;
  if (/customs.*release|release.*customs/.test(e)) return t.evCustomsRelease;
  if (/customs.*hold|hold.*customs/.test(e)) return t.evCustomsHold;
  if (/rail/.test(e)) return t.evRail;
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ReleaseBadge({ state, t }: { state: ReleaseState; t: L }) {
  const conf =
    state === "released"
      ? { cls: "border-emerald-200 bg-emerald-50 text-emerald-700", label: t.stReleased, dot: "bg-emerald-500" }
      : state === "hold"
        ? { cls: "border-red-200 bg-red-50 text-red-700", label: t.stHold, dot: "bg-red-500" }
        : { cls: "border-line bg-canvas/60 text-ink-soft", label: t.stUnknown, dot: "bg-faint" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-bold ${conf.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
      {conf.label}
    </span>
  );
}

function HoldList({ holds, t }: { holds: Hold[]; t: L }) {
  if (holds.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1.5">
      {holds.map((h, i) => (
        <li key={i} className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] leading-relaxed text-red-800">
          <span className="font-bold">{t[`hold_${h.name}`] ?? h.name}</span>
          {h.status === "pending" && <span className="ml-1.5 font-semibold text-amber-700">({t.holdPending})</span>}
          {h.description && <span className="block text-red-700/90">{h.description}</span>}
        </li>
      ))}
    </ul>
  );
}

function ContainerCard({ c, t, locale }: { c: Cont; t: L; locale: string }) {
  const lfdDate = c.last_free_day ? new Date(c.last_free_day) : null;
  const lfdDays =
    lfdDate && !Number.isNaN(lfdDate.getTime())
      ? Math.ceil((lfdDate.getTime() - Date.now()) / 86_400_000)
      : null;
  const readyCls = c.picked_up
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : c.pickup_ready === true
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : c.pickup_ready === false
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-line bg-canvas/60 text-ink-soft";
  return (
    <div className="dash-card mt-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-mono text-[19px] font-black tracking-wide text-ink">{c.container_number}</div>
        <div className="text-[12.5px] text-faint">
          {[c.equipment, c.terminal].filter(Boolean).join(" · ")}
        </div>
      </div>

      <div className={`mt-4 rounded-2xl border px-4 py-3 text-[14.5px] font-bold ${readyCls}`}>
        {c.picked_up && <>{t.pickupDone}</>}
        {!c.picked_up && c.pickup_ready === true && <>{t.pickupReady}</>}
        {!c.picked_up && c.pickup_ready === false && <>{t.pickupNotReady}</>}
        {!c.picked_up && c.pickup_ready === null && <>{t.pickupUnknown}</>}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-bold text-ink">{t.relCustoms}</span>
            <ReleaseBadge state={c.customs_state} t={t} />
          </div>
          <HoldList holds={c.customs_holds} t={t} />
        </div>
        <div className="rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-bold text-ink">{t.relCarrier}</span>
            <ReleaseBadge state={c.carrier_state} t={t} />
          </div>
          <HoldList holds={c.carrier_holds} t={t} />
        </div>
      </div>

      {c.other_holds.length > 0 && (
        <div className="mt-4 rounded-2xl border border-line bg-white p-4">
          <div className="text-[13px] font-bold text-ink">{t.holdsOther}</div>
          <HoldList holds={c.other_holds} t={t} />
        </div>
      )}

      {!c.terminal_supported && <p className="mt-3 text-[12.5px] leading-relaxed text-amber-700">{t.termNoData}</p>}

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-soft">
        <span>
          <span className="font-bold text-ink">{t.lfd}: </span>
          {c.last_free_day ? fmtDate(c.last_free_day, locale) : t.lfdNone}
          {lfdDays !== null && c.last_free_day && (
            <span className={`ml-1.5 font-bold ${lfdDays < 0 ? "text-red-600" : lfdDays <= 2 ? "text-amber-600" : "text-emerald-600"}`}>
              ({lfdDays < 0 ? t.lfdPassed : lfdDays === 0 ? t.lfdToday : `${lfdDays} ${t.daysWord}`})
            </span>
          )}
        </span>
        {c.fees.length > 0 && (
          <span>
            <span className="font-bold text-ink">{t.feesTitle}: </span>
            {c.fees.map((f) => `${t[`fee_${f.type}`] ?? f.type} ${f.currency} ${f.amount.toLocaleString()}`).join(" · ")}
          </span>
        )}
      </div>

      {c.events.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <div className="text-[13px] font-bold text-ink">{t.timelineTitle}</div>
          <ul className="mt-3 space-y-2.5">
            {c.events.map((e, i) => (
              <li key={i} className="flex gap-3 text-[13px]">
                <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-brand" />
                <span className="font-semibold text-ink">{eventLabel(e.event, t)}</span>
                <span className="text-faint">
                  {fmtDate(e.timestamp, locale)}
                  {e.location ? ` · ${e.location}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ContainerTracker({ t, locale }: { t: L; locale: string }) {
  const [type, setType] = useState<"container" | "bill_of_lading" | "booking_number">("container");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);
  const polls = useRef(0);

  const run = useCallback(
    async (num: string, typ: string, isPoll: boolean) => {
      try {
        const res = await fetch(
          `/api/public/container-track?type=${encodeURIComponent(typ)}&number=${encodeURIComponent(num)}`
        );
        const data = (await res.json()) as ApiResult;
        if (!data.ok) {
          setError(t[ERR_KEY[data.error] ?? "errGeneric"] ?? t.errGeneric);
          setBusy(false);
          setProcessing(false);
          return;
        }
        if (data.status === "processing") {
          if (polls.current < 8) {
            polls.current += 1;
            setProcessing(true);
            setTimeout(() => void run(num, typ, true), 12000);
            return;
          }
          setError(t.errProcessingTimeout);
          setBusy(false);
          setProcessing(false);
          return;
        }
        setResult(data);
        setBusy(false);
        setProcessing(false);
      } catch {
        if (!isPoll) {
          setError(t.errGeneric);
          setBusy(false);
          setProcessing(false);
        }
      }
    },
    [t]
  );

  useEffect(() => {
    return () => {
      polls.current = 99; // stop polling after unmount
    };
  }, []);

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const num = number.trim().toUpperCase();
    if (!num || busy) return;
    polls.current = 0;
    setError(null);
    setResult(null);
    setProcessing(false);
    setBusy(true);
    void run(num, type, false);
  };

  const ship = result && result.ok && result.status === "ready" ? result.shipment : null;

  return (
    <div>
      <form onSubmit={submit} className="dash-card p-6 sm:p-8">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["container", t.typeContainer],
              ["bill_of_lading", t.typeBol],
              ["booking_number", t.typeBooking],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setType(v)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold ${
                type === v ? "bg-brand text-white" : "border border-line bg-white text-ink-soft"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder={t.fNumberPh}
            className="w-full flex-1 rounded-xl border border-line bg-white px-4 py-3 font-mono text-[15px] uppercase text-ink placeholder:normal-case placeholder:text-faint focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-brand-deep px-6 py-3 text-[14.5px] font-bold text-white disabled:opacity-60"
          >
            {busy ? t.searching : t.submit}
          </button>
        </div>
        {processing && <p className="mt-3 text-[13px] font-semibold text-amber-700">{t.processingNote}</p>}
        {error && <p className="mt-3 text-center text-[13.5px] font-semibold text-red-600">{error}</p>}
      </form>

      {ship && (
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1.5 px-1 text-[13px] text-ink-soft">
          {ship.shipping_line && (
            <span>
              <span className="font-bold text-ink">{t.cardLine}: </span>
              {ship.shipping_line}
            </span>
          )}
          {ship.vessel && (
            <span>
              <span className="font-bold text-ink">{t.cardVessel}: </span>
              {ship.vessel}
              {ship.voyage ? ` · ${ship.voyage}` : ""}
            </span>
          )}
          {ship.bill_of_lading_number && (
            <span>
              <span className="font-bold text-ink">{t.cardMbl}: </span>
              <span className="font-mono">{ship.bill_of_lading_number}</span>
            </span>
          )}
          {(ship.pol || ship.pod) && (
            <span>
              <span className="font-bold text-ink">{t.cardRoute}: </span>
              {[ship.pol, ship.pod].filter(Boolean).join(" → ")}
            </span>
          )}
          {ship.eta && !ship.arrived_at && (
            <span>
              <span className="font-bold text-ink">{t.cardEta}: </span>
              {fmtDate(ship.eta, locale)}
            </span>
          )}
          {ship.arrived_at && (
            <span>
              <span className="font-bold text-ink">{t.cardArrived}: </span>
              {fmtDate(ship.arrived_at, locale)}
            </span>
          )}
        </div>
      )}

      {result &&
        result.ok &&
        result.status === "ready" &&
        result.containers.map((c) => <ContainerCard key={c.container_number} c={c} t={t} locale={locale} />)}

      {result && result.ok && result.status === "ready" && (
        <div className="mt-5 rounded-2xl border border-line bg-white p-5 text-[12.5px] leading-relaxed text-ink-soft">
          <p>{t.sourceNote}</p>
          <p className="mt-1.5 text-faint">
            {t.sourceLabel}: Terminal49 · {t.updatedAt} {fmtDate(result.fetched_at, locale)}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`/${locale}/login`} className="rounded-xl bg-brand px-4 py-2.5 text-[13.5px] font-bold text-white">
              {t.ctaWorkspace}
            </Link>
            <Link href={`/${locale}/quote`} className="rounded-xl border border-line px-4 py-2.5 text-[13.5px] font-bold text-ink">
              {t.ctaQuote}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
