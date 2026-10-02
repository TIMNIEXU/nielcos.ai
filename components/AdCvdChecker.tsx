"use client";

import { useState } from "react";
import Link from "next/link";
import { ORIGIN_OPTIONS } from "@/lib/countries";

type Match = {
  product_keyword: string;
  case_numbers: string | null;
  case_type: string;
  origin: string;
  hts_prefix: string | null;
  status: string;
  scope_match: "potential" | "review" | "none";
  scope_summary: string | null;
  exclusions: string | null;
  last_verified: string | null;
};

type Result = {
  ok: boolean;
  risk: "high" | "medium" | "low";
  origin_missing: boolean;
  product: string;
  origin: string;
  hts: string | null;
  manufacturer: string | null;
  exporter: string | null;
  matches: Match[];
  recommended_action: "scope_review" | "screen_before_quote" | "no_match";
  notice: string;
};

type L = Record<string, string>;

const RISK_STYLE: Record<string, string> = {
  high: "border-red-200 bg-red-50",
  medium: "border-amber-200 bg-amber-50",
  low: "border-emerald-200 bg-emerald-50",
};
const RISK_TEXT: Record<string, string> = {
  high: "text-red-700",
  medium: "text-amber-700",
  low: "text-emerald-700",
};

export default function AdCvdChecker({ t, locale }: { t: L; locale: string }) {
  const [product, setProduct] = useState("");
  const [origin, setOrigin] = useState("");
  const [hts, setHts] = useState("");
  const [mfr, setMfr] = useState("");
  const [exporter, setExporter] = useState("");
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState(false);

  const submit = async () => {
    if (!product.trim() || working) return;
    setWorking(true);
    setErr(false);
    try {
      const qs = new URLSearchParams({
        product: product.trim(),
        origin,
        hts: hts.trim(),
        manufacturer: mfr.trim(),
        exporter: exporter.trim(),
      });
      const r = await fetch(`/api/public/ad-cvd-check?${qs}`);
      const j = await r.json();
      if (j.ok) setResult(j as Result);
      else setErr(true);
    } catch {
      setErr(true);
    } finally {
      setWorking(false);
    }
  };

  const recKey =
    result?.recommended_action === "scope_review"
      ? "recScopeReview"
      : result?.recommended_action === "screen_before_quote"
        ? "recScreen"
        : "recNoMatch";

  return (
    <div className="mx-auto mt-10 max-w-3xl">
      <div className="dash-card p-6 sm:p-8">
        <label className="block text-[13px] font-bold text-ink">{t.fProduct}</label>
        <input
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          placeholder={t.fProductPh}
          className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[14px] text-ink placeholder:text-faint focus:border-brand focus:outline-none"
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[13px] font-bold text-ink">{t.fOrigin}</label>
            <select
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[14px] text-ink focus:border-brand focus:outline-none"
            >
              <option value="">{t.fOriginPh}</option>
              {ORIGIN_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-ink">{t.fHts}</label>
            <input
              value={hts}
              onChange={(e) => setHts(e.target.value)}
              placeholder={t.fHtsPh}
              className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[14px] text-ink placeholder:text-faint focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-ink">{t.fMfr}</label>
            <input
              value={mfr}
              onChange={(e) => setMfr(e.target.value)}
              placeholder={t.fMfrPh}
              className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[14px] text-ink placeholder:text-faint focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-ink">{t.fExporter}</label>
            <input
              value={exporter}
              onChange={(e) => setExporter(e.target.value)}
              placeholder={t.fExporterPh}
              className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[14px] text-ink placeholder:text-faint focus:border-brand focus:outline-none"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!product.trim() || working}
          className="mt-6 w-full rounded-xl bg-brand px-6 py-3 text-[15px] font-bold text-white transition-all hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40"
        >
          {working ? t.checking : t.submit}
        </button>
        {err && <p className="mt-3 text-center text-[13px] text-red-600">{t.error}</p>}
      </div>

      {result && (
        <div className={`mt-6 rounded-3xl border p-6 shadow-card sm:p-8 ${RISK_STYLE[result.risk]}`}>
          <p className={`text-[13px] font-bold tracking-wide uppercase`}>{t.riskTitle}</p>
          <p className={`mt-1 text-[34px] font-black tracking-tight ${RISK_TEXT[result.risk]}`}>
            {t[`risk${result.risk[0].toUpperCase()}${result.risk.slice(1)}`]}
          </p>

          <dl className="mt-5 space-y-2.5 rounded-2xl border border-line bg-white p-5 text-[13.5px]">
            <div className="flex gap-3"><dt className="w-32 shrink-0 font-bold text-ink-soft">{t.rProduct}</dt><dd className="text-ink">{result.product}</dd></div>
            <div className="flex gap-3"><dt className="w-32 shrink-0 font-bold text-ink-soft">{t.rOrigin}</dt><dd className="text-ink">{result.origin || "—"}</dd></div>
            <div className="flex gap-3"><dt className="w-32 shrink-0 font-bold text-ink-soft">{t.rHts}</dt><dd className="font-mono text-ink">{result.hts || "—"}</dd></div>
            {result.manufacturer && (
              <div className="flex gap-3"><dt className="w-32 shrink-0 font-bold text-ink-soft">{t.rMfr}</dt><dd className="text-ink">{result.manufacturer}</dd></div>
            )}
            {result.exporter && (
              <div className="flex gap-3"><dt className="w-32 shrink-0 font-bold text-ink-soft">{t.rExporter}</dt><dd className="text-ink">{result.exporter}</dd></div>
            )}
          </dl>

          {result.matches.length > 0 ? (
            <div className="mt-4 space-y-3">
              {result.matches.map((m, i) => (
                <div key={i} className="rounded-2xl border border-line bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[15px] font-bold capitalize text-ink">{m.product_keyword}</p>
                    <span className="rounded-full bg-brand-tint px-3 py-0.5 text-[12px] font-bold text-brand">{m.case_type}</span>
                  </div>
                  <dl className="mt-3 space-y-2 text-[13px]">
                    <div className="flex gap-3"><dt className="w-32 shrink-0 font-semibold text-ink-soft">{t.potentialCase}</dt><dd className="font-mono font-bold text-ink">{m.case_numbers || t.casePending}</dd></div>
                    <div className="flex gap-3"><dt className="w-32 shrink-0 font-semibold text-ink-soft">{t.scopeMatch}</dt><dd className="font-bold text-ink">{m.scope_match === "potential" ? t.scopePotential : t.scopeReview}</dd></div>
                    {m.scope_summary && (
                      <div className="flex gap-3"><dt className="w-32 shrink-0 font-semibold text-ink-soft">{t.scope}</dt><dd className="text-ink-soft">{m.scope_summary}</dd></div>
                    )}
                    <div className="flex gap-3"><dt className="w-32 shrink-0 font-semibold text-ink-soft">{t.exclusion}</dt><dd className="text-ink-soft">{m.exclusions || t.exclusionReview}</dd></div>
                    {m.last_verified && (
                      <div className="flex gap-3"><dt className="w-32 shrink-0 font-semibold text-ink-soft">{t.verified}</dt><dd className="text-faint">{m.last_verified}</dd></div>
                    )}
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-line bg-white p-5 text-[13.5px] text-ink-soft">{t.noMatchNote}</p>
          )}

          <dl className="mt-4 space-y-2.5 rounded-2xl border border-line bg-white p-5 text-[13.5px]">
            <div className="flex gap-3"><dt className="w-32 shrink-0 font-bold text-ink-soft">{t.exporterRate}</dt><dd className="font-bold text-amber-700">{t.verify}</dd></div>
            <div className="flex gap-3"><dt className="w-32 shrink-0 font-bold text-ink-soft">{t.cashDeposit}</dt><dd className="font-bold text-amber-700">{t.cashDepositVerify}</dd></div>
          </dl>

          <div className="mt-4 rounded-2xl bg-ink p-5 text-white">
            <p className="text-[13px] font-bold tracking-wide uppercase opacity-70">{t.recTitle}</p>
            <p className="mt-1.5 text-[14.5px] font-semibold leading-relaxed">{t[recKey]}</p>
          </div>

          {result.origin_missing && (
            <p className="mt-3 text-[13px] text-amber-700">{t.originMissing}</p>
          )}
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-soft">⚠️ {t.disclaimer}</p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/${locale}/quote?service=customs`}
              className="rounded-full bg-brand px-6 py-2.5 text-[14px] font-bold text-white hover:bg-brand-deep"
            >
              {t.ctaQuote}
            </Link>
            <Link
              href={`/${locale}/ad-cvd`}
              className="rounded-full border border-line bg-white px-6 py-2.5 text-[14px] font-bold text-ink-soft hover:border-brand hover:text-brand"
            >
              {t.ctaWatchlist}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
