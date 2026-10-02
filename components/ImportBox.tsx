"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

/* GRI-001 V2 — Universal Import Box (full).
   Free-text import description + document upload -> POST /api/ai/import-box
   (server-side LLM + deterministic tools) -> rendered Import Plan card:
   summary, HTS candidates w/ confidence, cost estimate, compliance notes,
   next-step CTAs. Graceful fallbacks when AI is not configured / rate-limited. */

type HtsCandidate = {
  hts_no?: string;
  description?: string;
  confidence?: number;
  why?: string;
};
type CostLine = { label?: string; rate_pct?: number | null; amount_usd?: number };
type NextStep = { label?: string; href?: string; why?: string };
export type ImportPlan = {
  summary?: string;
  product?: {
    name?: string; material?: string; intended_use?: string; origin?: string;
    value_usd?: number; hts_candidates?: HtsCandidate[]; hts_note?: string;
  };
  cost_estimate?: {
    value_usd?: number; lines?: CostLine[]; total_duty_usd?: number;
    fees?: { mpf_usd?: number; hmf_usd?: number }; landed_usd?: number; disclaimer?: string;
  };
  compliance?: { pga_flags?: string[]; ad_cvd_note?: string; regulatory_notes?: string[] };
  next_steps?: NextStep[];
  disclaimer?: string;
};
// Back-compat alias used inside this file.
type Plan = ImportPlan;

const usd = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "—";

export default function ImportBox({ locale, onPlan }: { locale: string; onPlan?: (plan: ImportPlan | null) => void }) {
  const t = useTranslations("importbox");
  const [text, setText] = useState("");
  const [working, setWorking] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [err, setErr] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const chips = [0, 1, 2].map((i) => t(`chips.${i}`));

  const submit = async (q: string, file?: File) => {
    const query = q.trim();
    if ((!query && !file) || working) return;
    setWorking(true);
    setErr("");
    setPlan(null);
    setLastQuery(query);
    try {
      let res: Response;
      if (file) {
        const form = new FormData();
        form.append("file", file);
        form.append("text", query);
        form.append("locale", locale);
        res = await fetch("/api/ai/import-box", { method: "POST", body: form });
      } else {
        res = await fetch("/api/ai/import-box", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: query, locale }),
        });
      }
      const data = await res.json();
      if (data.ok && data.plan) {
        setPlan(data.plan as Plan);
        onPlan?.(data.plan as Plan);
      } else if (data.error === "not_configured") {
        setErr("not_configured");
        onPlan?.(null);
      } else if (data.error === "rate_limited") {
        setErr("rate_limited");
        onPlan?.(null);
      } else {
        setErr("planError");
        onPlan?.(null);
      }
    } catch {
      setErr("planError");
    } finally {
      setWorking(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const errMsg =
    err === "not_configured" ? t("notConfigured")
    : err === "rate_limited" ? t("rateLimited")
    : err ? t("planError") : "";

  const reset = () => {
    setPlan(null);
    setErr("");
    setText("");
    onPlan?.(null);
  };

  const cands = plan?.product?.hts_candidates ?? [];
  const lines = plan?.cost_estimate?.lines ?? [];
  const steps = plan?.next_steps ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-3xl border border-line bg-white p-6 shadow-[0_24px_60px_-24px_rgba(29,78,216,0.35)] sm:p-8">
        <label
          htmlFor="importbox-input"
          className="block text-center text-[19px] font-bold tracking-tight text-ink sm:text-[22px]"
        >
          {t("title")}
        </label>
        <p className="mx-auto mt-2 max-w-xl text-center text-[13.5px] leading-relaxed text-muted">
          {t("sub")}
        </p>
        <textarea
          id="importbox-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("placeholder")}
          rows={2}
          disabled={working}
          className="mt-5 w-full resize-none rounded-2xl border border-line bg-canvas/60 px-5 py-4 text-[15px] text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit(text);
            }
          }}
        />
        <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => submit(text)}
            disabled={(!text.trim() && !plan) || working}
            className="w-full rounded-full bg-brand px-8 py-3 text-[15px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(29,78,216,0.8)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 sm:w-auto"
          >
            {working ? t("working") : `${t("button")} →`}
          </button>
          <span className="text-[13px] font-medium text-faint">{t("uploadLabel")}</span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={working}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-[14px] font-semibold text-ink-soft shadow-card transition-all hover:-translate-y-0.5 hover:border-brand disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" />
            </svg>
            {t("fileTypes")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.docx,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => submit(text, e.target.files?.[0])}
          />
        </div>
        {errMsg && (
          <div className="mt-4 rounded-2xl border border-warn/40 bg-warn-tint/40 p-4 text-center">
            <p className="text-[13.5px] font-semibold text-ink-soft">{errMsg}</p>
            <Link
              href={`/${locale}/landed-cost${lastQuery ? `?q=${encodeURIComponent(lastQuery)}` : ""}`}
              className="mt-2 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-brand"
            >
              {t("openCalculator")} →
            </Link>
          </div>
        )}
        {!plan && !errMsg && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                disabled={working}
                onClick={() => { setText(c); void submit(c); }}
                className="rounded-full bg-brand-tint/60 px-4 py-1.5 text-[12.5px] font-semibold text-brand transition-colors hover:bg-brand-tint disabled:opacity-50"
              >
              {c}
              </button>
            ))}
          </div>
        )}
        <p className="mt-4 text-center text-[12px] font-semibold text-faint">{t("hint")}</p>
      </div>

      {/* ============ Import Plan result ============ */}
      {plan && (
        <div className="mt-6 rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-[18px] font-bold tracking-tight text-ink">{t("planTitle")}</h3>
            <button
              type="button"
              onClick={reset}
              className="shrink-0 rounded-full border border-line px-4 py-1.5 text-[12.5px] font-bold text-ink-soft hover:border-brand hover:text-brand"
            >
              {t("newPlan")}
            </button>
          </div>
          {plan.summary && (
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">{plan.summary}</p>
          )}

          {cands.length > 0 && (
            <div className="mt-6">
              <p className="text-[13px] font-bold tracking-wide text-faint uppercase">{t("htsTitle")}</p>
              <div className="mt-3 space-y-2.5">
                {cands.slice(0, 3).map((c, i) => (
                  <div key={i} className="rounded-2xl border border-line bg-canvas/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[15px] font-bold text-ink">{c.hts_no ?? "—"}</p>
                      {typeof c.confidence === "number" && (
                        <span className="rounded-full bg-brand-tint px-3 py-0.5 text-[12px] font-bold text-brand">
                          {c.confidence}% {t("confidence")}
                        </span>
                      )}
                    </div>
                    {c.description && <p className="mt-1 text-[13px] text-muted">{c.description}</p>}
                    {c.why && <p className="mt-1 text-[12.5px] text-faint italic">{c.why}</p>}
                  </div>
                ))}
              </div>
              {plan.product?.hts_note && (
                <p className="mt-2 text-[12px] leading-relaxed text-faint">{plan.product.hts_note}</p>
              )}
            </div>
          )}

          {lines.length > 0 && (
            <div className="mt-6">
              <p className="text-[13px] font-bold tracking-wide text-faint uppercase">{t("costTitle")}</p>
              <div className="mt-3 overflow-hidden rounded-2xl border border-line">
                {lines.map((l, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-[13.5px] last:border-0">
                    <span className="text-ink-soft">
                      {l.label ?? "—"}
                      {typeof l.rate_pct === "number" && (
                        <span className="ml-2 text-faint">{l.rate_pct}%</span>
                      )}
                    </span>
                    <span className="font-bold text-ink">{usd(l.amount_usd)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 bg-brand-tint/40 px-4 py-2.5 text-[13.5px]">
                  <span className="font-bold text-ink">{t("totalDuty")}</span>
                  <span className="font-bold text-brand">{usd(plan.cost_estimate?.total_duty_usd)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13.5px]">
                  <span className="font-bold text-ink">{t("landedCost")}</span>
                  <span className="font-bold text-ink">{usd(plan.cost_estimate?.landed_usd)}</span>
                </div>
              </div>
              {plan.cost_estimate?.disclaimer && (
                <p className="mt-2 text-[12px] leading-relaxed text-faint">{plan.cost_estimate.disclaimer}</p>
              )}
            </div>
          )}

          {(plan.compliance?.pga_flags?.length || plan.compliance?.ad_cvd_note || plan.compliance?.regulatory_notes?.length) && (
            <div className="mt-6">
              <p className="text-[13px] font-bold tracking-wide text-faint uppercase">{t("complianceTitle")}</p>
              <ul className="mt-3 space-y-1.5 text-[13.5px] leading-relaxed text-ink-soft">
                {(plan.compliance.pga_flags ?? []).map((f, i) => <li key={`p${i}`}>• {f}</li>)}
                {plan.compliance.ad_cvd_note && <li>• {plan.compliance.ad_cvd_note}</li>}
                {(plan.compliance.regulatory_notes ?? []).map((f, i) => <li key={`r${i}`}>• {f}</li>)}
              </ul>
            </div>
          )}

          {steps.length > 0 && (
            <div className="mt-6">
              <p className="text-[13px] font-bold tracking-wide text-faint uppercase">{t("nextTitle")}</p>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {steps.slice(0, 4).map((s, i) => (
                  <Link
                    key={i}
                    href={`/${locale}${s.href ?? "/contact"}`}
                    title={s.why ?? ""}
                    className="rounded-full bg-brand px-5 py-2.5 text-[13.5px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-deep"
                  >
                    {s.label ?? "→"} →
                  </Link>
                ))}
              </div>
            </div>
          )}

          {plan.disclaimer && (
            <p className="mt-6 rounded-xl bg-amber-50 p-4 text-[12px] leading-relaxed text-amber-800">
              {plan.disclaimer}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
