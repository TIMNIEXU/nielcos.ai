"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Props = { messages: Record<string, string>; locale: string };

type DutyRow = {
  id: string;
  gttid: string | null;
  title: string;
  currency: string | null;
  eta_date: string | null;
  status: string;
  duty: number;
};
type ClearanceRow = {
  id: string;
  gttid: string | null;
  mbl_no: string | null;
  container_number: string | null;
  status: string;
  origin: string | null;
  destination: string | null;
  eta: string | null;
  missing_docs: string[];
};
type SupplierRow = {
  id: string;
  code: string;
  name_en: string | null;
  name_zh: string | null;
  country: string | null;
  risk_level: string;
  missing_docs: { key: string; state: string }[];
};
type Snapshot = {
  duty: { total: number; currency: string; shipment_count: number; rows: DutyRow[] };
  clearance: { count: number; window_days: number; rows: ClearanceRow[] };
  suppliers: { count: number; rows: SupplierRow[] };
};

const DOC_LABEL: Record<string, string> = {
  commercial_invoice: "docCommercialInvoice",
  packing_list: "docPackingList",
  bill_of_lading: "docBL",
};
const SUP_DOC_LABEL: Record<string, string> = {
  business_license: "docBusinessLicense",
  iso_cert: "docIso",
  bank_info: "docBank",
  tax_form: "docTax",
  compliance_decl: "docCompliance",
  insurance: "docInsurance",
};
const TONES = ["bg-risk-tint text-risk", "bg-warn-tint text-warn", "bg-vio-tint text-vio"];

function fmtMoney(n: number) {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function ExecutiveBoard({ messages: dict, locale }: Props) {
  const t = (k: string) => dict[k] ?? k;
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const r = await fetch("/api/app/executive");
      if (!r.ok) throw new Error("bad");
      setData(await r.json());
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white ring-1 ring-line" />
        ))}
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-2xl border border-line bg-white p-10 text-center">
        <p className="text-ink-soft">{t("loadFailed")}</p>
        <button
          onClick={load}
          className="mt-4 rounded-full bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-deep"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  const allClear =
    data.duty.rows.length === 0 && data.clearance.count === 0 && data.suppliers.count === 0;

  const kpis = [
    {
      label: t("kpiDuty"),
      value: fmtMoney(data.duty.total),
      sub: t("kpiDutyCount").replace("%N", String(data.duty.shipment_count)),
      tone: "text-risk",
    },
    {
      label: t("kpiClearance"),
      value: String(data.clearance.count),
      sub: t("kpiClearanceCount").replace("%N", String(data.clearance.count)),
      tone: "text-warn",
    },
    {
      label: t("kpiSuppliers"),
      value: String(data.suppliers.rows.reduce((a, s) => a + s.missing_docs.length, 0)),
      sub: t("kpiSuppliersCount").replace(
        "%N",
        String(data.suppliers.rows.reduce((a, s) => a + s.missing_docs.length, 0))
      ),
      tone: "text-vio",
    },
  ];

  return (
    <div>
      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <p className={`text-[2rem] font-bold leading-none ${k.tone}`}>{k.value}</p>
            <p className="mt-2 text-[13.5px] font-semibold text-ink-soft">{k.label}</p>
            <p className="text-[12.5px] text-faint">{k.sub}</p>
          </div>
        ))}
      </div>

      {allClear ? (
        <div className="mt-4 rounded-2xl bg-card-soft p-8 text-center text-[14px] text-ink-soft">
          {t("emptyAll")}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {/* 1 — Duty exposure */}
          <section className="rounded-2xl border border-line bg-white p-5 shadow-card md:p-6">
            <div className="flex items-center gap-4">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[15px] font-bold ${TONES[0]}`}>1</span>
              <div className="flex-1">
                <p className="text-[15px] font-bold text-ink">
                  {t("secDuty")} · {fmtMoney(data.duty.total)}
                </p>
                <p className="text-[13px] text-muted">{t("secDutyDesc")}</p>
              </div>
            </div>
            {data.duty.rows.length === 0 ? (
              <p className="mt-4 rounded-xl bg-card-soft p-5 text-center text-[13.5px] text-ink-soft">{t("emptyDuty")}</p>
            ) : (
              <ul className="mt-4 divide-y divide-line-soft">
                {data.duty.rows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold text-ink">{r.title}</p>
                      <p className="font-mono text-[11.5px] text-faint">
                        {[r.gttid, r.eta_date ? `${t("etaLabel")} ${r.eta_date}` : null].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="shrink-0 text-[15px] font-bold text-risk">{fmtMoney(r.duty)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 2 — Clearance delay risk */}
          <section className="rounded-2xl border border-line bg-white p-5 shadow-card md:p-6">
            <div className="flex items-center gap-4">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[15px] font-bold ${TONES[1]}`}>2</span>
              <div className="flex-1">
                <p className="text-[15px] font-bold text-ink">{t("secClearance")}</p>
                <p className="text-[13px] text-muted">{t("secClearanceDesc")}</p>
              </div>
            </div>
            {data.clearance.rows.length === 0 ? (
              <p className="mt-4 rounded-xl bg-card-soft p-5 text-center text-[13.5px] text-ink-soft">{t("emptyClearance")}</p>
            ) : (
              <ul className="mt-4 divide-y divide-line-soft">
                {data.clearance.rows.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="font-mono text-[13px] font-semibold text-ink">
                        {r.gttid ?? r.mbl_no ?? r.container_number ?? r.id.slice(0, 8)}
                      </p>
                      <p className="text-[11.5px] text-faint">
                        {t("etaLabel")} {r.eta}
                        {[r.origin, r.destination].filter(Boolean).length
                          ? ` · ${[r.origin, r.destination].filter(Boolean).join(" → ")}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.missing_docs.map((d) => (
                        <span key={d} className="rounded-full bg-warn-tint px-2.5 py-0.5 text-[11px] font-bold text-warn">
                          {t("missingLabel")}: {t(DOC_LABEL[d] ?? d)}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 3 — Supplier documentation */}
          <section className="rounded-2xl border border-line bg-white p-5 shadow-card md:p-6">
            <div className="flex items-center gap-4">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[15px] font-bold ${TONES[2]}`}>3</span>
              <div className="flex-1">
                <p className="text-[15px] font-bold text-ink">{t("secSuppliers")}</p>
                <p className="text-[13px] text-muted">{t("secSuppliersDesc")}</p>
              </div>
            </div>
            {data.suppliers.rows.length === 0 ? (
              <p className="mt-4 rounded-xl bg-card-soft p-5 text-center text-[13.5px] text-ink-soft">{t("emptySuppliers")}</p>
            ) : (
              <ul className="mt-4 divide-y divide-line-soft">
                {data.suppliers.rows.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-ink">
                        {s.name_en || s.name_zh || s.code}
                        <span className="ml-2 font-mono text-[11px] font-normal text-faint">{s.code}</span>
                      </p>
                      {s.country && <p className="text-[11.5px] text-faint">{s.country}</p>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {s.missing_docs.map((d) => (
                        <span
                          key={d.key}
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            d.state === "missing" ? "bg-risk-tint text-risk" : "bg-warn-tint text-warn"
                          }`}
                        >
                          {t(SUP_DOC_LABEL[d.key] ?? d.key)} · {d.state === "missing" ? t("stMissing") : t("stPending")}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* Analyze with NIEL AI */}
      <Link
        href={`/${locale}/app/assistant`}
        className="mt-4 block rounded-2xl bg-brand px-6 py-4 text-center text-[14.5px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(29,78,216,0.8)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep"
      >
        {t("analyzeCta")} →
      </Link>
    </div>
  );
}
