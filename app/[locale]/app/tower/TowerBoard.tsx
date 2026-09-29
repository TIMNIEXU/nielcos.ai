"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Props = { messages: Record<string, string>; locale: string };

type Snapshot = {
  kpis: {
    activeShipments: number;
    openExceptions: number;
    riskCount: number;
    demurrageExposure: number;
    overduePayables: { count: number; total: number };
  };
  exceptions: any[];
  risks: any[];
  shipments: any[];
  regulatory: any[];
};

const EX_SEV: Record<string, "high" | "medium" | "low"> = {
  customs_hold: "high",
  demurrage_risk: "high",
  damage_claim: "high",
  schedule_delay: "medium",
  doc_missing: "medium",
  other: "low",
};

const sevTone: Record<string, string> = {
  high: "bg-risk text-white",
  medium: "bg-warn text-white",
  low: "bg-sky text-white",
};

const sevDot: Record<string, string> = {
  high: "bg-risk",
  medium: "bg-warn",
  low: "bg-sky",
};

export default function TowerBoard({ messages: dict, locale }: Props) {
  const t = (k: string) => dict[k] ?? k;
  const isZh = locale === "zh-CN";
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [committedQ, setCommittedQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "attention">("all");
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError(false);
    try {
      const r = await fetch(`/api/app/tower${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      if (!r.ok) throw new Error("bad");
      setData(await r.json());
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(committedQ);
  }, [committedQ, load]);

  const daysAgo = (iso: string | null) => {
    if (!iso) return "";
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (d <= 0) return t("todayLabel");
    return t("daysAgo").replace("%N", String(d));
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      in_transit: t("stInTransit"),
      at_port: t("stAtPort"),
      out_for_delivery: t("stOutForDelivery"),
      pending_pickup: t("stPendingPickup"),
      delivered: t("stDelivered"),
      on_hold: t("stOnHold"),
    };
    return map[s] ?? s;
  };

  const exTypeLabel = (ty: string) => {
    const map: Record<string, string> = {
      customs_hold: t("typeCustomsHold"),
      demurrage_risk: t("typeDemurrageRisk"),
      doc_missing: t("typeDocMissing"),
      schedule_delay: t("typeScheduleDelay"),
      damage_claim: t("typeDamageClaim"),
      other: t("typeOther"),
    };
    return map[ty] ?? ty;
  };

  const sevLabel = (s: string) =>
    s === "high" ? t("sevHigh") : s === "medium" ? t("sevMedium") : t("sevLow");

  const exStatusLabel = (s: string) =>
    s === "open" ? t("stOpen") : s === "in_progress" ? t("stInProgress") : t("stResolved");

  const riskKindLabel = (k: string) => {
    const map: Record<string, string> = {
      demurrage: t("riskDemurrage"),
      payable: t("riskPayable"),
      warehouse: t("riskWarehouse"),
      hold: t("riskHold"),
      stale: t("riskStale"),
    };
    return map[k] ?? k;
  };

  const patchException = async (id: string, status: string) => {
    setActing(id);
    try {
      await fetch("/api/app/freight/exceptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      await load(committedQ);
    } finally {
      setActing(null);
    }
  };

  const shipments = useMemo(() => {
    const list = data?.shipments ?? [];
    if (filter === "active")
      return list.filter((s: any) =>
        ["in_transit", "at_port", "out_for_delivery", "pending_pickup"].includes(s.status)
      );
    if (filter === "attention") return list.filter((s: any) => s.status === "on_hold");
    return list;
  }, [data, filter]);

  const k = data?.kpis;

  return (
    <div>
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: t("kpiActive"), value: k ? String(k.activeShipments) : "—", tone: "text-brand" },
          { label: t("kpiExceptions"), value: k ? String(k.openExceptions) : "—", tone: "text-risk" },
          { label: t("kpiRisks"), value: k ? String(k.riskCount) : "—", tone: "text-warn" },
          {
            label: t("kpiDemurrage"),
            value: k ? `$${k.demurrageExposure.toLocaleString()}` : "—",
            tone: "text-risk",
          },
          {
            label: t("kpiOverdue"),
            value: k ? `${k.overduePayables.count} · $${k.overduePayables.total.toLocaleString()}` : "—",
            tone: "text-warn",
          },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-line bg-white p-4">
            <p className={`text-2xl font-bold md:text-3xl ${c.tone}`}>{c.value}</p>
            <p className="mt-1 text-xs font-medium text-ink-soft">{c.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-risk/30 bg-risk-tint p-4 text-sm text-risk">
          {t("loadFailed")}{" "}
          <button onClick={() => load(committedQ)} className="font-bold underline">
            {t("retry")}
          </button>
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Left: exceptions + risks */}
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-base font-bold text-ink">{t("secExceptions")}</h2>
            {loading && !data ? (
              <p className="mt-3 text-sm text-ink-soft">…</p>
            ) : (data?.exceptions ?? []).length === 0 ? (
              <p className="mt-3 rounded-xl bg-card-soft p-4 text-center text-sm text-ink-soft">
                {t("emptyExceptions")}
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {(data?.exceptions ?? []).map((e: any) => {
                  const sev = EX_SEV[e.type] ?? "low";
                  const ship = e.shipments ?? {};
                  const ref = ship.gttid ?? ship.mbl_no ?? ship.container_number ?? "";
                  return (
                    <li key={e.id} className="rounded-xl border border-line-soft p-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${sevTone[sev]}`}>
                          {sevLabel(sev)}
                        </span>
                        <span className="rounded-full bg-card-soft px-2 py-0.5 text-[11px] font-bold text-ink-soft ring-1 ring-line">
                          {exTypeLabel(e.type)}
                        </span>
                        <span className="rounded-full bg-card-soft px-2 py-0.5 text-[11px] font-medium text-ink-soft ring-1 ring-line">
                          {exStatusLabel(e.status)}
                        </span>
                        {ref && (
                          <Link
                            href={`/${locale}/app/${ship.gttid ?? ""}`}
                            className="font-mono text-[11px] font-bold text-brand-deep hover:underline"
                          >
                            {ref}
                          </Link>
                        )}
                        <span className="ml-auto text-[11px] text-faint">{daysAgo(e.updated_at)}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-bold text-ink">{e.title}</p>
                      {e.note && <p className="mt-0.5 text-xs text-ink-soft">{e.note}</p>}
                      <div className="mt-2 flex gap-2">
                        {e.status === "open" && (
                          <button
                            disabled={acting === e.id}
                            onClick={() => patchException(e.id, "in_progress")}
                            className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-white hover:bg-brand-deep disabled:opacity-50"
                          >
                            {t("actClaim")}
                          </button>
                        )}
                        {e.status !== "resolved" && (
                          <button
                            disabled={acting === e.id}
                            onClick={() => patchException(e.id, "resolved")}
                            className="rounded-full border border-ok/40 bg-ok-tint px-3 py-1 text-xs font-bold text-ok hover:bg-ok hover:text-white disabled:opacity-50"
                          >
                            {t("actResolve")}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-base font-bold text-ink">{t("secRisks")}</h2>
            {loading && !data ? (
              <p className="mt-3 text-sm text-ink-soft">…</p>
            ) : (data?.risks ?? []).length === 0 ? (
              <p className="mt-3 rounded-xl bg-card-soft p-4 text-center text-sm text-ink-soft">
                {t("emptyRisks")}
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {(data?.risks ?? []).map((r: any, i: number) => (
                  <li key={i} className="flex gap-3 rounded-xl border border-line-soft p-3">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${sevDot[r.severity]}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink">
                        <span className="mr-2 rounded bg-card-soft px-1.5 py-0.5 text-[10.5px] font-bold text-ink-soft ring-1 ring-line">
                          {riskKindLabel(r.kind)}
                        </span>
                        {isZh ? r.title_zh : r.title}
                      </p>
                      {(isZh ? r.detail_zh : r.detail) && (
                        <p className="mt-0.5 text-xs text-ink-soft">{isZh ? r.detail_zh : r.detail}</p>
                      )}
                    </div>
                    <span className="ml-auto shrink-0 text-[11px] font-bold text-ink-soft">
                      {sevLabel(r.severity)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right: shipments */}
        <div>
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-base font-bold text-ink">{t("secShipments")}</h2>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                setCommittedQ(q.trim());
              }}
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("searchPh")}
                className="min-w-0 flex-1 rounded-full border border-line bg-card-soft px-3.5 py-1.5 text-sm text-ink outline-none placeholder:text-faint focus:border-brand"
              />
            </form>
            <div className="mt-2.5 flex gap-1.5">
              {(
                [
                  ["all", t("filterAll")],
                  ["active", t("filterActive")],
                  ["attention", t("filterAttention")],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setFilter(v)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    filter === v
                      ? "bg-brand text-white"
                      : "border border-line bg-white text-ink-soft hover:border-brand"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {loading && !data ? (
              <p className="mt-3 text-sm text-ink-soft">…</p>
            ) : shipments.length === 0 ? (
              <p className="mt-3 rounded-xl bg-card-soft p-4 text-center text-sm text-ink-soft">
                {t("emptyShipments")}
              </p>
            ) : (
              <ul className="mt-3 max-h-[560px] space-y-2.5 overflow-y-auto pr-0.5">
                {shipments.map((s: any) => (
                  <li key={s.id} className="rounded-xl border border-line-soft p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                          s.status === "on_hold"
                            ? "bg-risk-tint text-risk"
                            : s.status === "delivered"
                              ? "bg-ok-tint text-ok"
                              : "bg-brand-tint text-brand-deep"
                        }`}
                      >
                        {statusLabel(s.status)}
                      </span>
                      {s.gttid && (
                        <Link
                          href={`/${locale}/app/${s.gttid}`}
                          className="font-mono text-xs font-bold text-brand-deep hover:underline"
                        >
                          {s.gttid}
                        </Link>
                      )}
                      <span className="ml-auto text-[10.5px] text-faint">
                        {t("updatedLabel")}{daysAgo(s.updated_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">
                      {[s.origin, s.destination].filter(Boolean).join(" → ")}
                      {s.container_number ? ` · ${s.container_number}` : ""}
                    </p>
                    {s.current_location && (
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {t("locLabel")}：{s.current_location}
                      </p>
                    )}
                    {s.eta && (
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {t("etaLabel")}: {String(s.eta).slice(0, 10)}
                      </p>
                    )}
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-card-soft">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${s.progress ?? 0}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Regulatory */}
      <section className="mt-5 rounded-2xl border border-line bg-white p-5">
        <h2 className="text-base font-bold text-ink">{t("secRegulatory")}</h2>
        {loading && !data ? (
          <p className="mt-3 text-sm text-ink-soft">…</p>
        ) : (data?.regulatory ?? []).length === 0 ? (
          <p className="mt-3 rounded-xl bg-card-soft p-4 text-center text-sm text-ink-soft">
            {t("emptyRegulatory")}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line-soft">
            {(data?.regulatory ?? []).map((u: any) => (
              <li key={u.id} className="flex items-baseline gap-3 py-2.5">
                <Link
                  href={`/${locale}/app/compliance`}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:text-brand-deep"
                >
                  {isZh ? u.title_zh ?? u.title : u.title}
                </Link>
                {u.effective_date && (
                  <span className="shrink-0 font-mono text-[11px] text-faint">{u.effective_date}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
