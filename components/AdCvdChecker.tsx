"use client";

import { useState } from "react";
import Link from "next/link";
import { ORIGIN_OPTIONS } from "@/lib/countries";

type Evidence = {
  case_number: string;
  case_type: string;
  country: string;
  product_name: string;
  scope_summary: string | null;
  exclusions: string | null;
  hts_references: string | null;
  status: string;
  commerce_source_url: string | null;
  federal_register_documents: { title: string; url: string; date: string }[] | null;
  last_verified_at: string | null;
  verification_status: string | null;
};

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
  evidence: Evidence[];
};

type Result = {
  ok: boolean;
  risk: "no_case" | "possible" | "potential" | "high_risk";
  human_review_required: boolean;
  origin_missing: boolean;
  product: string;
  origin: string;
  hts: string | null;
  manufacturer: string | null;
  exporter: string | null;
  matches: Match[];
  why: string;
  recommended_action: "human_review" | "scope_review" | "screen_before_quote" | "none";
  evidence_as_of: string | null;
  checked_at: string;
  notice: string;
};

type L = Record<string, string>;

const RISK_STYLE: Record<string, string> = {
  high_risk: "border-red-200 bg-red-50",
  potential: "border-amber-200 bg-amber-50",
  possible: "border-amber-200 bg-amber-50",
  no_case: "border-emerald-200 bg-emerald-50",
};
const RISK_TEXT: Record<string, string> = {
  high_risk: "text-red-700",
  potential: "text-amber-700",
  possible: "text-amber-700",
  no_case: "text-emerald-700",
};
const RISK_KEY: Record<string, string> = {
  high_risk: "riskHighRisk",
  potential: "riskPotential",
  possible: "riskPossible",
  no_case: "riskNoCase",
};
/* Evidence ladder: no_case → possible → potential → high_risk → human review */
const LADDER: { level: string; key: string }[] = [
  { level: "no_case", key: "ladder1" },
  { level: "possible", key: "ladder2" },
  { level: "potential", key: "ladder3" },
  { level: "high_risk", key: "ladder4" },
  { level: "human_review", key: "ladder5" },
];

function splitCases(caseNumbers: string | null): { ad: string[]; cvd: string[] } {
  const ad: string[] = [];
  const cvd: string[] = [];
  for (const p of (caseNumbers ?? "").split("/").map((s) => s.trim()).filter(Boolean)) {
    if (/^a-/i.test(p)) ad.push(p.toUpperCase());
    else if (/^c-/i.test(p)) cvd.push(p.toUpperCase());
  }
  return { ad, cvd };
}

function activeIndex(risk: string, humanReview: boolean): number {
  if (risk === "high_risk" && humanReview) return 4;
  return { no_case: 0, possible: 1, potential: 2, high_risk: 3 }[risk] ?? 0;
}

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
    result?.recommended_action === "human_review"
      ? "recHumanReview"
      : result?.recommended_action === "scope_review"
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
          <p className="text-[13px] font-bold tracking-wide uppercase">{t.exposureTitle}</p>
          <p className={`mt-1 text-[30px] font-black tracking-tight sm:text-[34px] ${RISK_TEXT[result.risk]}`}>
            {t[RISK_KEY[result.risk]]}
          </p>

          {/* Evidence ladder */}
          <ol className="mt-4 flex flex-wrap gap-1.5">
            {LADDER.map((s, i) => {
              const active = i <= activeIndex(result.risk, result.human_review_required);
              return (
                <li
                  key={s.key}
                  className={`rounded-full px-3 py-1 text-[11.5px] font-bold ${
                    active ? "bg-ink text-white" : "bg-white/70 text-faint border border-line"
                  }`}
                >
                  {t[s.key]}
                </li>
              );
            })}
          </ol>

          <dl className="mt-5 space-y-2.5 rounded-2xl border border-line bg-white p-5 text-[13.5px]">
            <div className="flex gap-3"><dt className="w-36 shrink-0 font-bold text-ink-soft">{t.rProduct}</dt><dd className="text-ink">{result.product}</dd></div>
            <div className="flex gap-3"><dt className="w-36 shrink-0 font-bold text-ink-soft">{t.rOrigin}</dt><dd className="text-ink">{result.origin || "—"}</dd></div>
            <div className="flex gap-3"><dt className="w-36 shrink-0 font-bold text-ink-soft">{t.rHts}</dt><dd className="font-mono text-ink">{result.hts || "—"}</dd></div>
            {result.manufacturer && (
              <div className="flex gap-3"><dt className="w-36 shrink-0 font-bold text-ink-soft">{t.rMfr}</dt><dd className="text-ink">{result.manufacturer}</dd></div>
            )}
            {result.exporter && (
              <div className="flex gap-3"><dt className="w-36 shrink-0 font-bold text-ink-soft">{t.rExporter}</dt><dd className="text-ink">{result.exporter}</dd></div>
            )}
          </dl>

          {result.matches.length > 0 ? (
            <div className="mt-4 space-y-3">
              {result.matches.map((m, i) => {
                const { ad, cvd } = splitCases(m.case_numbers);
                return (
                  <div key={i} className="rounded-2xl border border-line bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[15px] font-bold capitalize text-ink">{m.product_keyword}</p>
                      <span className="rounded-full bg-brand-tint px-3 py-0.5 text-[12px] font-bold text-brand">{m.case_type}</span>
                    </div>
                    <dl className="mt-3 space-y-2 text-[13px]">
                      <div className="flex gap-3"><dt className="w-36 shrink-0 font-semibold text-ink-soft">{t.adCase}</dt><dd className="font-mono font-bold text-ink">{ad.join(" / ") || "—"}</dd></div>
                      <div className="flex gap-3"><dt className="w-36 shrink-0 font-semibold text-ink-soft">{t.cvdCase}</dt><dd className="font-mono font-bold text-ink">{cvd.join(" / ") || "—"}</dd></div>
                      <div className="flex gap-3"><dt className="w-36 shrink-0 font-semibold text-ink-soft">{t.scopeMatch}</dt><dd className="font-bold text-ink">{m.scope_match === "potential" ? t.scopePotential : t.scopeReview}</dd></div>
                      <div className="flex gap-3"><dt className="w-36 shrink-0 font-semibold text-ink-soft">{t.exclusionMatch}</dt><dd className="text-ink-soft">{m.exclusions || t.exclusionNotEstablished}</dd></div>
                    </dl>

                    {/* Evidence chain */}
                    {m.evidence.length > 0 && (
                      <div className="mt-4 rounded-xl bg-canvas/60 p-4">
                        <p className="text-[12px] font-bold tracking-wide uppercase text-ink-soft">{t.evidenceTitle}</p>
                        {m.evidence.map((ev, j) => (
                          <div key={j} className="mt-3 border-t border-line pt-3 first:border-0 first:pt-0">
                            <p className="text-[13px] font-bold text-ink">{ev.case_number} · {ev.product_name}</p>
                            {ev.scope_summary && <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{ev.scope_summary}</p>}
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
                              {ev.commerce_source_url && (
                                <a href={ev.commerce_source_url} target="_blank" rel="noreferrer" className="font-semibold text-brand underline">Commerce case →</a>
                              )}
                              {(ev.federal_register_documents ?? []).slice(0, 2).map((d, k) => (
                                <a key={k} href={d.url} target="_blank" rel="noreferrer" className="font-semibold text-brand underline">
                                  Federal Register · {d.date} →
                                </a>
                              ))}
                              {ev.last_verified_at && (
                                <span className="text-faint">{t.verified}: {ev.last_verified_at}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-line bg-white p-5 text-[13.5px] text-ink-soft">{t.noMatchNote}</p>
          )}

          {/* Scope Engine vs Rate Engine — the architectural split, visible in UI */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="text-[12px] font-bold tracking-wide uppercase text-ink-soft">{t.scopeRisk}</p>
              <p className={`mt-1 text-[20px] font-black ${RISK_TEXT[result.risk]}`}>{t[RISK_KEY[result.risk]]}</p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5">
              <p className="text-[12px] font-bold tracking-wide uppercase text-ink-soft">{t.rateStatus}</p>
              <p className="mt-1 text-[20px] font-black text-ink-soft">{t.rateNotVerified}</p>
            </div>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">{t.rateNote}</p>

          <dl className="mt-4 space-y-2.5 rounded-2xl border border-line bg-white p-5 text-[13.5px]">
            <div className="flex gap-3"><dt className="w-36 shrink-0 font-bold text-ink-soft">{t.mfrExporterRate}</dt><dd className="font-bold text-amber-700">{t.requiresVerification}</dd></div>
          </dl>

          <div className="mt-4 rounded-2xl bg-canvas/60 p-5">
            <p className="text-[12px] font-bold tracking-wide uppercase text-ink-soft">{t.whyTitle}</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">{result.why}</p>
          </div>

          <div className="mt-4 rounded-2xl bg-ink p-5 text-white">
            <p className="text-[13px] font-bold tracking-wide uppercase opacity-70">{t.recTitle}</p>
            <p className="mt-1.5 text-[14.5px] font-semibold leading-relaxed">{t[recKey]}</p>
            <p className="mt-2 text-[13px] opacity-80">{t.nextStep}: {t.nextStepReview}</p>
          </div>

          {result.origin_missing && (
            <p className="mt-3 text-[13px] text-amber-700">{t.originMissing}</p>
          )}
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink-soft">⚠️ {t.disclaimer}</p>
          <p className="mt-2 text-[12px] text-faint">
            {t.lastCheck}: {result.evidence_as_of ?? "—"} · {t.checkedAt}: {new Date(result.checked_at).toLocaleString()}
          </p>

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
