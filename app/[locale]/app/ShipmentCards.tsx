"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

type Shipment = {
  gttid: string | null;
  container_number: string;
  mbl_no?: string | null;
  containers?: { container: string }[] | null;
  status: string;
  origin?: string | null;
  destination?: string | null;
  eta?: string | null;
};

const TONE: Record<string, string> = {
  pending_pickup: "bg-slate-100 text-slate-600",
  at_port: "bg-blue-50 text-blue-700",
  in_transit: "bg-brand-tint text-brand-deep",
  out_for_delivery: "bg-orange-50 text-orange-700",
  delivered: "bg-emerald-50 text-emerald-700",
  on_hold: "bg-red-50 text-red-700",
};

export default function ShipmentCards({
  shipments,
  locale,
}: {
  shipments: Shipment[];
  locale: string;
}) {
  const t = useTranslations("app");
  const statusName = (s: string) => {
    try {
      return t(`statusNames.${s}`);
    } catch {
      return s;
    }
  };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {shipments.map((s) => (
        <Link
          key={s.gttid ?? s.container_number}
          href={`/${locale}/app/${encodeURIComponent(s.gttid ?? "")}`}
          className="group rounded-2xl border border-line bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-24px_rgba(29,78,216,0.5)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-ink-soft/70 uppercase">
                {t("gttid")}
              </p>
              <p className="font-mono text-lg font-bold text-ink">{s.gttid}</p>
              <p className="mt-0.5 text-sm text-ink-soft">
                {t("container")}: <span className="font-semibold">{s.container_number}</span>
              </p>
              {s.mbl_no && (
                <p className="mt-0.5 font-mono text-xs text-ink-soft">
                  MBL {s.mbl_no}
                </p>
              )}
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${TONE[s.status] ?? "bg-slate-100 text-slate-600"}`}
            >
              {statusName(s.status)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-3 text-sm">
            <span className="text-ink-soft">
              {[s.origin, s.destination].filter(Boolean).join(" → ") || "—"}
            </span>
            <span className="text-ink-soft">
              {t("eta")}: {s.eta ?? "—"}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
