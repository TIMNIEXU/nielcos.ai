import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Reveal from "@/components/Reveal";
import InsuranceQuoteForm from "@/components/InsuranceQuoteForm";
import { SectionHead, CtaBand } from "@/components/Section";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const DOCUSIGN_BOND_URL =
  "https://apps.docusign.com/webforms/us/568609ffad07efa4d840df45e8bef8a3";

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
  const bondPoints = [0, 1, 2].map((i) => t(`bondPoints.${i}`));

  return (
    <>
      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="dotgrid absolute inset-0 opacity-60" />
        <div className="absolute -top-32 left-1/2 h-80 w-[52rem] -translate-x-1/2 rounded-full bg-brand-tint blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 pt-16 pb-10 text-center lg:px-8 lg:pt-24">
          <SectionHead eyebrow={t("eyebrow")} title={t("title")} sub={t("sub")} image="/images/heroes/insurance.jpg" />
          <Reveal delay={120}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="#quote"
                className="rounded-xl bg-brand px-6 py-3 text-[15px] font-bold text-white shadow-card transition-all hover:-translate-y-px hover:shadow-lift"
              >
                {t("heroQuoteCta")}
              </Link>
              <Link
                href="#bond"
                className="rounded-xl border border-brand/30 bg-white/80 px-6 py-3 text-[15px] font-bold text-brand transition-all hover:-translate-y-px"
              >
                {t("heroBondCta")}
              </Link>
            </div>
          </Reveal>
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
      </section>

      {/* customs bond — featured lead-gen section */}
      <section id="bond" className="mx-auto max-w-7xl scroll-mt-20 px-5 pt-10 pb-4 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-brand/20 bg-gradient-to-br from-brand-tint via-white to-brand-tint-soft p-8 shadow-card sm:p-10 lg:p-12">
            <div className="dotgrid absolute inset-0 opacity-40" />
            <div className="relative grid items-center gap-8 lg:grid-cols-[1.5fr_1fr]">
              <div>
                <p className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-brand">
                  {t("bondEyebrow")}
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  {t("bondTitle")}
                </h2>
                <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-muted">
                  {t("bondBody")}
                </p>
                <ul className="mt-6 space-y-2.5">
                  {bondPoints.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-[14px] font-medium text-ink-soft">
                      <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-ok" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-line bg-white/90 p-6 text-center shadow-card sm:p-8">
                <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-tint text-brand">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                    <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
                    <path d="M14 3v5h5M9 13l2 2 4-4" />
                  </svg>
                </div>
                <a
                  href={DOCUSIGN_BOND_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl bg-brand px-6 py-3.5 text-[15.5px] font-bold text-white shadow-card transition-all hover:-translate-y-px hover:shadow-lift"
                >
                  {t("bondCta")} ↗
                </a>
                <Link
                  href={`/${locale}/bond`}
                  className="mt-3 block rounded-xl border-2 border-brand bg-white px-6 py-3.5 text-[15.5px] font-bold text-brand transition-all hover:-translate-y-px hover:bg-brand-tint-soft"
                >
                  {t("bondWizardCta")}
                </Link>
                <p className="mt-3 text-[12.5px] text-faint">{t("bondWizardSub")}</p>
                <p className="mt-4 text-[12.5px] leading-relaxed text-faint">
                  {t("bondNote")}
                </p>
              </div>
            </div>
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
