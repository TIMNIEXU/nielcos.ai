"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import ImportBox, { type ImportPlan } from "./ImportBox";
import Reveal from "./Reveal";

/* GRI-001 Golden Path v1 — the importer funnel:
   Describe/Upload -> AI Import Plan -> Duties -> Services -> Quote -> Book.
   Duty figures are real (deterministic tools). Service prices are NEVER
   invented: "Get quote" files RFQs into the unified triage; a human replies.
   "Book" (login) creates a Trade in the workspace and files the chosen
   services as execution requests. */

const SERVICES = ["freight", "customs", "drayage", "warehouse", "insurance", "bond"] as const;
const LS_KEY = "nielcos-import-funnel-v1";

const usd = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "—";
const pct = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n) ? `${Number(n.toFixed(2))}%` : "—";

type Contact = { name: string; email: string; company: string };

export default function ImportFunnel({ locale }: { locale: string }) {
  const t = useTranslations("golden");
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [services, setServices] = useState<string[]>([...SERVICES]);
  const [contact, setContact] = useState<Contact>({ name: "", email: "", company: "" });
  const [quoting, setQuoting] = useState(false);
  const [quoted, setQuoted] = useState<number | null>(null);
  const [quoteErr, setQuoteErr] = useState("");
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookErr, setBookErr] = useState("");

  // restore funnel state after login redirect
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.plan) setPlan(s.plan);
        if (Array.isArray(s.services)) setServices(s.services);
        if (s.contact) setContact(s.contact);
      }
    } catch { /* ignore */ }
    // lightweight auth probe
    fetch("/api/app/products?q=__none__")
      .then((r) => setLoggedIn(r.status !== 401))
      .catch(() => setLoggedIn(false));
  }, []);

  // persist so "log in to book" doesn't lose the plan
  useEffect(() => {
    try {
      if (plan) localStorage.setItem(LS_KEY, JSON.stringify({ plan, services, contact }));
      else localStorage.removeItem(LS_KEY);
    } catch { /* ignore */ }
  }, [plan, services, contact]);

  const onPlan = (p: ImportPlan | null) => {
    setPlan(p);
    setQuoted(null);
    setQuoteErr("");
  };

  const toggleService = (s: string) =>
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const planSummary = plan
    ? [
        plan.product?.name,
        plan.product?.hts_candidates?.[0]?.hts_no
          ? `HTS ${plan.product.hts_candidates[0].hts_no}`
          : null,
        plan.product?.origin ? `Origin: ${plan.product.origin}` : null,
        plan.cost_estimate?.landed_usd != null ? `Landed ${usd(plan.cost_estimate.landed_usd)}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  const submitQuote = async () => {
    if (!plan || quoting || !services.length) return;
    if (!contact.email.trim()) { setQuoteErr(t("emailRequired")); return; }
    setQuoting(true);
    setQuoteErr("");
    let ok = 0;
    for (const service of services) {
      try {
        const r = await fetch("/api/public/service-quote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            service,
            name: contact.name.trim(),
            company: contact.company.trim(),
            email: contact.email.trim(),
            origin: plan.product?.origin ?? "",
            cargo: planSummary.slice(0, 900),
            value_usd: plan.cost_estimate?.value_usd ?? plan.product?.value_usd ?? null,
            message: `Via /import funnel. ${plan.summary ?? ""}`.slice(0, 1500),
          }),
        });
        const d = await r.json().catch(() => ({}));
        if (d.ok) ok++;
      } catch { /* count failures below */ }
    }
    setQuoting(false);
    if (ok === services.length) setQuoted(ok);
    else setQuoteErr(t("quotePartial").replace("%OK%", String(ok)).replace("%N%", String(services.length)));
  };

  const book = async () => {
    if (!plan || booking) return;
    if (loggedIn === false) {
      window.location.href = `/${locale}/login?next=/${locale}/import`;
      return;
    }
    setBooking(true);
    setBookErr("");
    try {
      const r = await fetch("/api/app/import-book", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plan: {
            product_name: plan.product?.name ?? "Import",
            origin: plan.product?.origin ?? "",
            value_usd: plan.cost_estimate?.value_usd ?? plan.product?.value_usd ?? null,
            hts: plan.product?.hts_candidates?.[0]?.hts_no ?? "",
            total_duty_usd: plan.cost_estimate?.total_duty_usd ?? null,
            landed_usd: plan.cost_estimate?.landed_usd ?? null,
            summary: plan.summary ?? "",
          },
          services: quoted ? services : [],
          contact,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 401) {
        window.location.href = `/${locale}/login?next=/${locale}/import`;
        return;
      }
      if (!d.ok || !d.trade_id) throw new Error("book_failed");
      try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
      window.location.href = `/${locale}/app/trades/${d.trade_id}`;
    } catch {
      setBookErr(t("bookError"));
    } finally {
      setBooking(false);
    }
  };

  const topHts = plan?.product?.hts_candidates?.[0];
  const costLines = plan?.cost_estimate?.lines ?? [];
  const step = !plan ? 1 : quoted == null ? 2 : 3;

  return (
    <div>
      {/* stepper */}
      <Reveal>
        <ol className="mx-auto mb-10 flex max-w-3xl items-center justify-center gap-2 sm:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex items-center gap-2 sm:gap-4">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-extrabold ${
                  step > i + 1 || (i === 0 && plan)
                    ? "bg-brand text-white"
                    : step === i + 1
                      ? "bg-brand-tint text-brand ring-2 ring-brand/40"
                      : "bg-slate-100 text-ink-soft"
                }`}
              >
                {i + 1}
              </span>
              <span className={`hidden text-[13px] font-bold sm:block ${step === i + 1 ? "text-ink" : "text-ink-soft"}`}>
                {t(`steps.${i}`)}
              </span>
              {i < 3 && <span className="h-px w-6 bg-line sm:w-10" aria-hidden />}
            </li>
          ))}
        </ol>
      </Reveal>

      {/* step 1: describe / upload */}
      <ImportBox locale={locale} onPlan={onPlan} />

      {plan && (
        <div className="mx-auto mt-10 w-full max-w-3xl space-y-6">
          {/* step 2: plan summary */}
          <Reveal>
            <div className="dash-card p-6 sm:p-8">
              <p className="text-[12px] font-bold tracking-widest text-brand uppercase">{t("planEyebrow")}</p>
              <h2 className="mt-1 text-xl font-extrabold text-ink">{plan.product?.name || t("planTitle")}</h2>
              {plan.summary && <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{plan.summary}</p>}

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-[11px] font-bold tracking-wider text-ink-soft uppercase">{t("htsLabel")}</p>
                  <p className="mt-1 font-mono text-[15px] font-extrabold text-ink">{topHts?.hts_no ?? "—"}</p>
                  {topHts?.confidence != null && (
                    <p className="mt-0.5 text-[12px] text-ink-soft">{t("confidence")}: {Math.round(topHts.confidence * 100)}%</p>
                  )}
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-[11px] font-bold tracking-wider text-ink-soft uppercase">{t("dutyLabel")}</p>
                  <p className="mt-1 text-[15px] font-extrabold text-ink">{usd(plan.cost_estimate?.total_duty_usd)}</p>
                  <p className="mt-0.5 text-[12px] text-ink-soft">{t("dutyNote")}</p>
                </div>
                <div className="rounded-xl bg-brand-tint p-4">
                  <p className="text-[11px] font-bold tracking-wider text-brand uppercase">{t("landedLabel")}</p>
                  <p className="mt-1 text-[15px] font-extrabold text-brand-deep">{usd(plan.cost_estimate?.landed_usd)}</p>
                  <p className="mt-0.5 text-[12px] text-ink-soft">{t("landedNote")}</p>
                </div>
              </div>

              {costLines.length > 0 && (
                <div className="mt-4 overflow-hidden rounded-xl border border-line-soft">
                  {costLines.map((l, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-line-soft px-4 py-2.5 text-[13.5px] last:border-0">
                      <span className="text-ink-soft">{l.label}{l.rate_pct != null && <span className="ml-2 font-mono text-[12px]">{pct(l.rate_pct)}</span>}</span>
                      <span className="font-bold text-ink">{usd(l.amount_usd)}</span>
                    </div>
                  ))}
                </div>
              )}

              {((plan.compliance?.pga_flags?.length ?? 0) > 0 || plan.compliance?.ad_cvd_note) && (
                <div className="mt-4 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
                  {(plan.compliance?.pga_flags ?? []).length > 0 && (
                    <p className="text-[13px] font-bold text-amber-800">⚠ PGA: {(plan.compliance?.pga_flags ?? []).join(", ")}</p>
                  )}
                  {plan.compliance?.ad_cvd_note && (
                    <p className="mt-1 text-[13px] text-amber-800">{plan.compliance.ad_cvd_note}</p>
                  )}
                </div>
              )}
              {plan.disclaimer && <p className="mt-3 text-[12px] leading-relaxed text-ink-soft/80">{plan.disclaimer}</p>}
            </div>
          </Reveal>

          {/* step 3: quote */}
          <Reveal>
            <div className="dash-card p-6 sm:p-8" id="quote">
              <p className="text-[12px] font-bold tracking-widest text-brand uppercase">{t("quoteEyebrow")}</p>
              <h2 className="mt-1 text-xl font-extrabold text-ink">{t("quoteTitle")}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{t("quoteSub")}</p>

              {quoted == null ? (
                <>
                  <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                    {SERVICES.map((s) => (
                      <label key={s} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-all ${services.includes(s) ? "border-brand bg-brand-tint/50" : "border-line-soft bg-white"}`}>
                        <input
                          type="checkbox"
                          checked={services.includes(s)}
                          onChange={() => toggleService(s)}
                          className="h-4 w-4 accent-[#1d4ed8]"
                        />
                        <span>
                          <span className="block text-[14px] font-bold text-ink">{t(`svc_${s}`)}</span>
                          <span className="block text-[12px] text-ink-soft">{t("svcHint")}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} placeholder={t("namePh")} className="rounded-xl border border-line bg-white px-4 py-3 text-[14px]" />
                    <input value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })} placeholder={t("companyPh")} className="rounded-xl border border-line bg-white px-4 py-3 text-[14px]" />
                    <input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} placeholder={t("emailPh")} type="email" className="rounded-xl border border-line bg-white px-4 py-3 text-[14px]" />
                  </div>
                  {quoteErr && <p className="mt-3 text-[13px] font-bold text-red-600">{quoteErr}</p>}
                  <button
                    onClick={submitQuote}
                    disabled={quoting || !services.length}
                    className="mt-5 w-full rounded-xl bg-brand px-6 py-3.5 text-[15px] font-bold text-white shadow-card transition-all hover:-translate-y-px disabled:opacity-50 sm:w-auto"
                  >
                    {quoting ? t("quoting") : t("quoteBtn")}
                  </button>
                </>
              ) : (
                <div className="mt-5 rounded-xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
                  <p className="text-[15px] font-extrabold text-emerald-800">✓ {t("quoteDoneTitle")}</p>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-emerald-900">
                    {t("quoteDoneBody").replace("%N%", String(quoted))}
                  </p>
                </div>
              )}
            </div>
          </Reveal>

          {/* step 4: book */}
          <Reveal>
            <div className="dash-card p-6 sm:p-8">
              <p className="text-[12px] font-bold tracking-widest text-brand uppercase">{t("bookEyebrow")}</p>
              <h2 className="mt-1 text-xl font-extrabold text-ink">{t("bookTitle")}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{t("bookSub")}</p>
              {bookErr && <p className="mt-3 text-[13px] font-bold text-red-600">{bookErr}</p>}
              <button
                onClick={book}
                disabled={booking}
                className="mt-5 w-full rounded-xl bg-ink px-6 py-3.5 text-[15px] font-bold text-white transition-all hover:-translate-y-px disabled:opacity-50 sm:w-auto"
              >
                {booking ? t("booking") : loggedIn === false ? t("loginToBook") : t("bookBtn")}
              </button>
              {loggedIn === false && (
                <p className="mt-3 text-[12.5px] text-ink-soft">{t("loginNote")}</p>
              )}
            </div>
          </Reveal>
        </div>
      )}

      {/* entry ③ teaser */}
      <Reveal>
        <p className="mx-auto mt-12 max-w-3xl text-center text-[13.5px] text-ink-soft">
          {t("enterpriseNote")}{" "}
          <Link href={`/${locale}/developers`} className="font-bold text-brand hover:underline">{t("enterpriseLink")}</Link>
        </p>
      </Reveal>
    </div>
  );
}
