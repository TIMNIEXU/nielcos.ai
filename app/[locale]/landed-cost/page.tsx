import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Reveal from "@/components/Reveal";
import DutyEstimator from "@/components/DutyEstimator";
import { SectionHead, CtaBand } from "@/components/Section";
import { buildEstimatorLabels } from "@/lib/estimator-labels";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const STEP_TINTS = [
  "bg-brand-tint text-brand",
  "bg-ok-tint text-ok",
  "bg-vio-tint text-vio",
];

export default async function LandedCostPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "landedCost" });
  const te = await getTranslations({ locale, namespace: "estimator" });
  const estimatorLabels = buildEstimatorLabels(te);
  const steps = [0, 1, 2].map((i) => t(`steps.${i}`));

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="dotgrid absolute inset-0 opacity-60" />
        <div className="absolute -top-32 left-1/2 h-80 w-[52rem] -translate-x-1/2 rounded-full bg-brand-tint blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 pt-16 pb-4 text-center lg:px-8 lg:pt-24">
          <SectionHead eyebrow={t("eyebrow")} title={t("title")} sub={t("sub")} />
          <Reveal delay={120}>
            <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
              {steps.map((s, i) => (
                <div
                  key={s}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-white/80 px-4 py-3.5 text-left shadow-card"
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-bold ${STEP_TINTS[i % STEP_TINTS.length]}`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[13.5px] font-semibold leading-snug text-ink">
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl scroll-mt-24 px-5 py-14 lg:px-8 lg:py-16">
        <Reveal>
          <DutyEstimator t={estimatorLabels} locale={locale} />
        </Reveal>
      </section>

      <CtaBand
        title={t("ctaTitle")}
        sub={t("ctaSub")}
        b1={t("ctaBtn")}
        b1Href={`/${locale}/contact`}
        b2={t("ctaBtn2")}
        b2Href={`/${locale}/app/customs`}
      />
    </>
  );
}
