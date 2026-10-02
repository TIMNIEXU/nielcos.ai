"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type PassportEvent = {
  id: string;
  entry_id: string | null;
  hts_code: string | null;
  duty_rate: number | null;
  customs_value: number;
  occurred_at: string;
};

type Analysis = {
  htsNo: string | null;
  htsFound: boolean;
  mfnRate: number | null;
  rateText: string | null;
  addl: { duty_type: string; rate: number; source: string }[];
  currentRate: number | null;
  lastRate: number | null;
  lastHts: string | null;
  lastAt: string | null;
  changed: boolean;
  deltaPct: number;
  impactUsd: number;
  impactBasis: "year" | "partial" | "none";
  basisCount: number;
  basisValue: number;
  importCount: number;
  totalValue: number;
};

function fmtRate(r: number | null | undefined): string {
  if (r == null || Number.isNaN(r)) return "—";
  return `${Number(r.toFixed(2))}%`;
}
function fmtUsd(v: number): string {
  return `$${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function fmtDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

/* Minimal SVG line chart: duty rate over time. Purely presentational. */
function RateChart({ events, emptyLabel }: { events: PassportEvent[]; emptyLabel: string }) {
  const pts = useMemo(() => {
    const withRate = [...events]
      .filter((e) => e.duty_rate != null)
      .sort((a, b) => +new Date(a.occurred_at) - +new Date(b.occurred_at));
    return withRate;
  }, [events]);
  if (!pts.length)
    return <p className="py-8 text-center text-sm text-ink-soft">{emptyLabel}</p>;

  const W = 620, H = 170, P = 34;
  const rates = pts.map((p) => p.duty_rate as number);
  let lo = Math.min(...rates), hi = Math.max(...rates);
  if (hi - lo < 0.5) { lo -= 0.25; hi += 0.25; }
  const t0 = +new Date(pts[0].occurred_at);
  const t1 = +new Date(pts[pts.length - 1].occurred_at);
  const span = Math.max(t1 - t0, 1);
  const X = (i: number) => P + ((+new Date(pts[i].occurred_at) - t0) / span) * (W - 2 * P);
  const Y = (r: number) => H - P - ((r - lo) / (hi - lo)) * (H - 2 * P);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.duty_rate as number).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={P} x2={W - P} y1={P + f * (H - 2 * P)} y2={P + f * (H - 2 * P)} stroke="#e5eaf1" strokeDasharray="4 4" />
      ))}
      <path d={d} fill="none" stroke="#1d4ed8" strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={p.id}>
          <circle cx={X(i)} cy={Y(p.duty_rate as number)} r="4" fill="#1d4ed8" stroke="#fff" strokeWidth="2" />
          <title>{`${fmtDate(p.occurred_at)} — ${fmtRate(p.duty_rate)}`}</title>
        </g>
      ))}
      <text x={P} y={H - 10} fontSize="11" fill="#64748b">{fmtDate(pts[0].occurred_at)}</text>
      <text x={W - P} y={H - 10} fontSize="11" fill="#64748b" textAnchor="end">{fmtDate(pts[pts.length - 1].occurred_at)}</text>
      <text x={8} y={P - 8} fontSize="11" fill="#64748b">{fmtRate(hi)}</text>
      <text x={8} y={H - P + 4} fontSize="11" fill="#64748b">{fmtRate(lo)}</text>
    </svg>
  );
}

export default function PassportView({
  productId,
  locale,
  messages,
}: {
  productId: string;
  locale: string;
  messages: Record<string, string>;
}) {
  const t = (k: string) => messages[k] ?? k;
  const [data, setData] = useState<{
    product: any;
    events: PassportEvent[];
    analysis: Analysis;
  } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/app/products/${productId}/passport`);
        if (!r.ok) throw new Error("load");
        setData(await r.json());
      } catch {
        setFailed(true);
      }
    })();
  }, [productId]);

  if (failed)
    return <p className="py-16 text-center text-sm font-bold text-red-600">{t("loadFailed")}</p>;
  if (!data) return <p className="py-16 text-center text-sm text-ink-soft">{t("loading")}</p>;

  const { product, events, analysis: a } = data;
  const name = product.name_en || product.name_zh || product.sku;
  const avgRate =
    events.length && events.some((e) => e.duty_rate != null)
      ? events.reduce((s, e) => s + (e.duty_rate ?? 0), 0) /
        events.filter((e) => e.duty_rate != null).length
      : null;

  const basisText =
    a.impactBasis === "year"
      ? t("basisYear")
      : t("basisPartial").replace("%N%", String(a.basisCount));
  const banner = t("bannerBody")
    .replace("%LAST%", fmtRate(a.lastRate))
    .replace("%CUR%", fmtRate(a.currentRate))
    .replace("%IMPACT%", fmtUsd(a.impactUsd))
    .replace("%BASIS%", basisText);

  return (
    <div className="space-y-5">
      {/* profile */}
      <div className="dash-card p-6">
        <p className="text-[12px] font-bold tracking-widest text-brand uppercase">{t("profileTitle")}</p>
        <h2 className="mt-1 font-mono text-2xl font-extrabold text-ink">{product.sku}</h2>
        {name !== product.sku && <p className="mt-1 text-[15px] text-ink-soft">{name}</p>}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-ink-soft uppercase">{t("fHts")}</p>
            <p className="mt-0.5 font-mono font-bold text-ink">{product.hts_code ?? "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-wider text-ink-soft uppercase">{t("fOrigin")}</p>
            <p className="mt-0.5 font-bold text-ink">{product.origin_country ?? "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-wider text-ink-soft uppercase">{t("fMaterial")}</p>
            <p className="mt-0.5 font-bold text-ink">{product.material ?? "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-wider text-ink-soft uppercase">{t("fNotes")}</p>
            <p className="mt-0.5 text-ink-soft">{product.notes ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* tariff-change banner */}
      {a.changed && (
        <div className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-200">
          <p className="text-[15px] font-extrabold text-amber-800">⚠️ {t("bannerTitle")}</p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-amber-900">{banner}</p>
          <p className="mt-1 text-[12px] text-amber-700/80">{t("bannerNote")}</p>
        </div>
      )}

      {/* stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { l: t("statsImports"), v: String(a.importCount) },
          { l: t("statsValue"), v: fmtUsd(a.totalValue) },
          { l: t("statsAvgRate"), v: fmtRate(avgRate) },
          { l: t("statsLast"), v: fmtDate(a.lastAt) },
        ].map((s) => (
          <div key={s.l} className="dash-card p-5">
            <p className="text-[11px] font-bold tracking-wider text-ink-soft uppercase">{s.l}</p>
            <p className="mt-1 text-2xl font-extrabold text-ink">{s.v}</p>
          </div>
        ))}
      </div>

      {/* chart */}
      <div className="dash-card p-6">
        <h3 className="text-[16px] font-bold text-ink">{t("chartTitle")}</h3>
        <div className="mt-2">
          <RateChart events={events} emptyLabel={t("chartEmpty")} />
        </div>
      </div>

      {/* events */}
      <div className="dash-card p-6">
        <h3 className="text-[16px] font-bold text-ink">{t("eventsTitle")}</h3>
        {events.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[15px] font-bold text-ink">{t("emptyTitle")}</p>
            <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-ink-soft">{t("emptyBody")}</p>
            <Link
              href={`/${locale}/app/customs`}
              className="mt-4 inline-block rounded-xl bg-brand px-5 py-2.5 text-[14px] font-bold text-white"
            >
              {t("goCustoms")}
            </Link>
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead>
                <tr className="text-[11px] tracking-wider text-ink-soft uppercase">
                  <th className="py-2 pr-4 font-bold">{t("thDate")}</th>
                  <th className="py-2 pr-4 font-bold">{t("thHts")}</th>
                  <th className="py-2 pr-4 font-bold">{t("thRate")}</th>
                  <th className="py-2 pr-4 font-bold">{t("thValue")}</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-t border-line-soft">
                    <td className="py-2.5 pr-4 text-ink-soft">{fmtDate(e.occurred_at)}</td>
                    <td className="py-2.5 pr-4 font-mono font-bold text-ink">{e.hts_code ?? "—"}</td>
                    <td className="py-2.5 pr-4 font-bold text-ink">{fmtRate(e.duty_rate)}</td>
                    <td className="py-2.5 pr-4 text-ink">{fmtUsd(e.customs_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
