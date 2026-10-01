import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Reveal from "@/components/Reveal";
import { SectionHead, CtaBand } from "@/components/Section";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "china" });
  return { title: t("metaTitle"), description: t("metaDesc") };
}

// Every step links to a real, live tool. No dead ends.
function stepLinks(locale: string): string[] {
  return [
    `/${locale}/#import-box`,
    `/${locale}/classify`,
    `/${locale}/landed-cost`,
    `/${locale}/landed-cost`,
    `/${locale}/landed-cost`,
    `/${locale}/classify`,
    `/${locale}/classify`,
    `/${locale}/regulatory`,
    `/${locale}/quote?service=freight`,
    `/${locale}/insurance#quote`,
    `/${locale}/bond`,
    `/${locale}/quote?service=drayage`,
    `/${locale}/quote?service=warehouse`,
    `/${locale}/landed-cost`,
  ];
}

export default async function ImportFromChinaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "china" });
  const links = stepLinks(locale);
  const steps = Array.from({ length: 14 }, (_, i) => ({
    n: i + 1,
    title: t(`steps.${i}.t`),
    desc: t(`steps.${i}.d`),
    cta: t(`steps.${i}.c`),
    href: links[i],
  }));

  return (
    <>
      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="dotgrid absolute inset-0 opacity-60" />
        <div className="absolute -top-32 left-1/2 h-80 w-[52rem] -translate-x-1/2 rounded-full bg-brand-tint blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 pt-16 pb-10 text-center lg:px-8 lg:pt-24">
          <SectionHead
            eyebrow={t("eyebrow")}
            title={t("title")}
            sub={t("sub")}
          />
          <Reveal delay={120}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="#steps"
                className="rounded-xl bg-brand px-6 py-3 text-[15px] font-bold text-white shadow-card transition-all hover:-translate-y-px hover:shadow-lift"
              >
                {t("heroSteps")}
              </Link>
              <Link
                href={`/${locale}/signup`}
                className="rounded-xl border border-brand/30 bg-white/80 px-6 py-3 text-[15px] font-bold text-brand transition-all hover:-translate-y-px"
              >
                {t("heroBook")}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* checklist */}
      <section id="steps" className="mx-auto max-w-7xl scroll-mt-20 px-5 pb-6 lg:px-8">
        <Reveal>
          <div className="mb-8 text-center">
            <p className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-brand">
              {t("stepsEyebrow")}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {t("stepsTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[14.5px] leading-relaxed text-ink-soft">
              {t("stepsSub")}
            </p>
          </div>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-2">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={(i % 2) * 80}>
              <div className="dash-card flex h-full gap-4 p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-[16px] font-extrabold text-brand">
                  {s.n}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[16px] font-bold text-ink">{s.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
                    {s.desc}
                  </p>
                  <Link
                    href={s.href}
                    className="mt-3 inline-flex items-center gap-1 text-[13.5px] font-bold text-brand hover:underline"
                  >
                    {s.cta} <span aria-hidden>→</span>
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-[12.5px] leading-relaxed text-ink-soft/80">
          {t("stepsNote")}
        </p>
      </section>

      {/* final CTA */}
      <CtaBand
        title={t("ctaTitle")}
        sub={t("ctaSub")}
        b1={t("ctaB1")}
        b1Href={`/${locale}/signup`}
        b2={t("ctaB2")}
        b2Href={`/${locale}/contact`}
      />
      <p className="-mt-14 mb-16 text-center text-[12.5px] text-ink-soft/70">
        {t("ctaNote")}
      </p>
    </>
  );
}
