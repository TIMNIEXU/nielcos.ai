import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Reveal from "@/components/Reveal";
import InsuranceQuoteForm from "@/components/InsuranceQuoteForm";
import { SectionHead, CtaBand } from "@/components/Section";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const COV_TINTS = [
  "bg-brand-tint text-brand",
  "bg-ok-tint text-ok",
  "bg-vio-tint text-vio",
  "bg-amber-50 text-amber-600",
];

export default async function InsurancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "insurance" });
  const coverages = [0, 1, 2, 3].map((i) => ({
    t: t(`coverages.${i}.t`),
    d: t(`coverages.${i}.d`),
  }));
  const steps = [0, 1, 2].map((i) => t(`steps.${i}`));

  return (
    <>
      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="dotgrid absolute inset-0 opacity-60" />
        <div className="absolute -top-32 left-1/2 h-80 w-[52rem] -translate-x-1/2 rounded-full bg-brand-tint blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 pt-16 pb-10 text-center lg:px-8 lg:pt-24">
          <SectionHead eyebrow={t("eyebrow")} title={t("title")} sub={t("sub")} />
        </div>
      </section>

      {/* coverages */}
      <section className="mx-auto max-w-7xl px-5 pb-4 lg:px-8">
        <Reveal>
          <div className="mb-8 text-center">
            <p className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-brand">
              {t("covEyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {t("covTitle")}
            </h2>
          </div>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {coverages.map((c, i) => (
            <Reveal key={c.t} delay={i * 80}>
              <div className="dash-card h-full p-6">
                <div
                  className={`mb-4 grid h-10 w-10 place-items-center rounded-xl ${COV_TINTS[i % COV_TINTS.length]}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4" />
                  </svg>
                </div>
                <p className="text-[15.5px] font-bold text-ink">{c.t}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* customs bond referral */}
        <Reveal delay={120}>
          <div className="mt-4 flex flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-white/80 px-6 py-5 shadow-card sm:flex-row sm:items-center">
            <div>
              <p className="text-[15px] font-bold text-ink">{t("bondTitle")}</p>
              <p className="mt-1 text-[13.5px] text-muted">{t("bondDesc")}</p>
            </div>
            <a
              href="https://www.nielinsurance.com"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-xl border border-brand/30 bg-brand-tint-soft px-5 py-2.5 text-[14px] font-bold text-brand transition-all hover:-translate-y-px"
            >
              {t("bondCta")} ↗
            </a>
          </div>
        </Reveal>
      </section>

      {/* steps */}
      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <Reveal>
          <div className="mb-8 text-center">
            <p className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-brand">
              {t("stepsEyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {t("stepsTitle")}
            </h2>
          </div>
        </Reveal>
        <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s} delay={i * 80}>
              <div className="flex h-full items-start gap-3 rounded-2xl border border-line bg-white/80 px-4 py-4 text-left shadow-card">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-tint text-[14px] font-bold text-brand">
                  {i + 1}
                </span>
                <span className="text-[13.5px] font-medium leading-snug text-ink">{s}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* quote form + credentials */}
      <section id="quote" className="mx-auto max-w-7xl scroll-mt-20 px-5 pb-16 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Reveal>
            <InsuranceQuoteForm />
          </Reveal>
          <Reveal delay={120}>
            <div className="flex h-full flex-col gap-4">
              <div className="dash-card p-6 sm:p-7">
                <p className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-brand">
                  {t("credEyebrow")}
                </p>
                <p className="mt-2 text-[17px] font-bold text-ink">{t("credTitle")}</p>
                <p className="mt-3 text-[13.5px] leading-relaxed text-muted">{t("credBody")}</p>
                <p className="mt-2 text-[13.5px] font-semibold text-ink-soft">{t("credContact")}</p>
              </div>
              <div className="dash-card p-6 sm:p-7">
                <p className="text-[13px] leading-relaxed text-faint">{t("disclaimer")}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand
        title={t("ctaTitle")}
        sub={t("ctaSub")}
        b1={t("ctaB1")}
        b1Href={`/${locale}/insurance#quote`}
        b2={t("ctaB2")}
        b2Href={`/${locale}/landed-cost`}
      />
    </>
  );
}
