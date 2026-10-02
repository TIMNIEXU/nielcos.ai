"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

/* Mode B — "My Services" workspace board (login only).
   Lists the customer's Service Orders, each with its own status, plus
   "Add a service" cards. Customs/warehouse go through the unified RFQ
   (/quote) until their dedicated intakes open — honest, no fake buttons. */

type Order = {
  id: string; so_no: string; service_type: string; status: string;
  gttid: string | null; intake: Record<string, unknown>;
  quoted_amount: number | null; quoted_note: string | null;
  created_at: string;
  service_quotes: { status: string; quoted_amount: number | null; quoted_note: string | null } | null;
};

const ST_TONE: Record<string, string> = {
  quote_requested: "bg-warn-tint text-warn",
  quoted: "bg-brand-tint/60 text-brand",
  confirmed: "bg-ok-tint text-ok",
  in_progress: "bg-ok-tint text-ok",
  completed: "bg-card-soft text-faint",
  invoiced: "bg-card-soft text-faint",
  closed: "bg-card-soft text-faint",
  cancelled: "bg-card-soft text-faint",
};

export default function ServicesBoard({
  messages, locale,
}: {
  messages: Record<string, string>; locale: string;
}) {
  const t = (k: string) => messages[k] ?? k;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [setupRequired, setSetupRequired] = useState(false);
  const [detail, setDetail] = useState<Order | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/app/service-orders");
      const d = await r.json();
      if (d.setup_required) setSetupRequired(true);
      else setOrders(d.orders ?? []);
    } catch {
      setErr(t("loadFailed"));
    }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const intake = (o: Order, k: string) => String(o.intake?.[k] ?? "");

  return (
    <div>
      {/* Add a service */}
      <h2 className="text-[15px] font-bold text-ink">{t("addTitle")}</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <Link href={`/${locale}/services/drayage`} className="dash-card dash-card-hover block p-5">
          <p className="text-[15px] font-bold text-ink">{t("drayageName")}</p>
          <p className="mt-1 text-[13px] text-ink-soft">{t("drayageDesc")}</p>
          <span className="mt-3 inline-block rounded-lg bg-brand px-4 py-1.5 text-[13px] font-bold text-white">{t("orderNow")}</span>
        </Link>
        <Link href={`/${locale}/quote?service=customs`} className="dash-card dash-card-hover block p-5">
          <p className="text-[15px] font-bold text-ink">{t("customsName")}</p>
          <p className="mt-1 text-[13px] text-ink-soft">{t("customsDesc")}</p>
          <span className="mt-3 inline-block rounded-lg border border-line px-4 py-1.5 text-[13px] font-bold text-brand">{t("requestQuote")}</span>
        </Link>
        <Link href={`/${locale}/quote?service=warehouse`} className="dash-card dash-card-hover block p-5">
          <p className="text-[15px] font-bold text-ink">{t("warehouseName")}</p>
          <p className="mt-1 text-[13px] text-ink-soft">{t("warehouseDesc")}</p>
          <span className="mt-3 inline-block rounded-lg border border-line px-4 py-1.5 text-[13px] font-bold text-brand">{t("requestQuote")}</span>
        </Link>
      </div>

      {/* Orders table */}
      <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
        <table className="w-full min-w-[720px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-[12px] uppercase tracking-wide text-faint">
              <th className="px-4 py-3">{t("thSo")}</th>
              <th className="px-4 py-3">{t("thService")}</th>
              <th className="px-4 py-3">{t("thStatus")}</th>
              <th className="px-4 py-3">{t("thGttid")}</th>
              <th className="px-4 py-3">{t("thCreated")}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="cursor-pointer border-b border-line/60 hover:bg-brand-tint/30" onClick={() => setDetail(o)}>
                <td className="px-4 py-3 font-mono font-bold text-brand">{o.so_no}</td>
                <td className="px-4 py-3">{t(`svc_${o.service_type}`)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${ST_TONE[o.status] ?? "bg-card-soft text-faint"}`}>
                    {t(`st_${o.status}`)}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-[12.5px] text-ink-soft">{o.gttid ?? "—"}</td>
                <td className="px-4 py-3 text-ink-soft">{o.created_at.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !setupRequired && orders.length === 0 && (
          <p className="px-4 py-8 text-center text-[13.5px] text-faint">{t("empty")}</p>
        )}
        {setupRequired && (
          <p className="px-4 py-8 text-center text-[13.5px] text-faint">{t("setupRequired")}</p>
        )}
        {err && <p className="px-4 py-4 text-[13px] font-semibold text-err">{err}</p>}
      </div>

      {/* Detail dialog */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[17px] font-bold text-ink">{t("detailTitle")} · <span className="font-mono text-brand">{detail.so_no}</span></h3>
            <dl className="mt-4 space-y-2.5 text-[13.5px]">
              {[
                [t("dContainer"), intake(detail, "container_no")],
                [t("dPickup"), intake(detail, "pickup")],
                [t("dDelivery"), intake(detail, "delivery")],
                [t("dLfd"), intake(detail, "lfd")],
                [t("dQuoted"), detail.quoted_amount != null ? `USD ${Number(detail.quoted_amount).toLocaleString()}` : "—"],
                [t("dGttid"), detail.gttid ?? t("dNoGttid")],
              ].map(([k, v]) => (
                <div key={k as string} className="flex gap-3">
                  <dt className="w-32 shrink-0 font-bold text-ink-soft">{k}</dt>
                  <dd className="text-ink">{v as string}</dd>
                </div>
              ))}
            </dl>
            <button onClick={() => setDetail(null)} className="mt-6 rounded-xl border border-line px-5 py-2 text-[13.5px] font-bold text-ink-soft">
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
