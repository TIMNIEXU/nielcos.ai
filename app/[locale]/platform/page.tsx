import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Reveal from "@/components/Reveal";
import { SectionHead, CtaBand } from "@/components/Section";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const TINTS = [
  "bg-brand-tint text-brand",
  "bg-vio-tint text-vio",
  "bg-ok-tint text-ok",
  "bg-warn-tint text-warn",
  "bg-sky-tint text-sky",
  "bg-risk-tint text-risk",
];

const IMGS = [
  "gttid", "classification", "compliance-automation",
  "visibility", "landed-cost", "integrations",
];

export default async function PlatformPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "platform" });

  const features = [0, 1, 2, 3, 4, 5].map((i) => ({
    t: t(`features.${i}.t`),
    d: t(`features.${i}.d`),
  }));
  const points = [0, 1, 2, 3].map((i) => t(`integration.points.${i}`));

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="dotgrid absolute inset-0 opacity-60" />
        <div className="absolute -top-32 left-1/2 h-80 w-[52rem] -translate-x-1/2 rounded-full bg-brand-tint blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 pt-16 pb-14 text-center lg:px-8 lg:pt-24">
          <Reveal>
            <p className="eyebrow justify-center">{t("hero.eyebrow")}</p>
            <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
              {t("hero.titleA")}
              <br />
              <span className="text-brand">{t("hero.titleB")}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-muted">
              {t("hero.sub")}
            </p>
          </Reveal>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.t} delay={(i % 3) * 90}>
              <div className="dash-card dash-card-hover h-full overflow-hidden">
                <div className="relative h-44 overflow-hidden bg-brand-tint/40">
                  <img
                    src={`/images/platform/${IMGS[i]}.png`}
                    alt={f.t}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-7">
                <div className="flex items-center justify-between">
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl text-[17px] font-bold ${TINTS[i % TINTS.length]}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-5 text-[18px] font-bold tracking-tight text-ink">{f.t}</p>
                <p className="mt-3 text-[14px] leading-relaxed text-muted">{f.d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* INTEGRATION */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <SectionHead
              align="left"
              eyebrow="Integrations"
              title={t("integration.title")}
              sub={t("integration.sub")}
            />
            <div className="grid grid-cols-2 gap-3">
              {points.map((p, i) => (
                <Reveal key={p} delay={i * 80}>
                  <div className="dash-card flex items-center gap-3 p-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-tint text-brand">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2}>
                        <path d="M13 2 4.5 13.5H11L9.5 22 19 9.5h-6.5z" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <p className="text-[13.5px] font-bold text-ink">{p}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="pt-20">
        <CtaBand
          title={t("cta.title")}
          sub={t("cta.sub")}
          b1={t("cta.b1")}
          b1Href={`/${locale}/contact`}
          b2={t("cta.b2")}
          b2Href={`/${locale}/modules`}
        />
      </div>
    </>
  );
}
