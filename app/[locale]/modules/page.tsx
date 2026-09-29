import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { routing } from "@/i18n/routing";
import Reveal from "@/components/Reveal";
import { SectionHead, CtaBand } from "@/components/Section";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const TINTS = [
  "bg-brand-tint text-brand", "bg-sky-tint text-sky", "bg-ok-tint text-ok",
  "bg-warn-tint text-warn", "bg-vio-tint text-vio", "bg-risk-tint text-risk",
];

const IMGS = [
  "customs", "shipments", "compliance", "documents", "products",
  "suppliers", "logistics", "finance", "ai-assistant", "tower",
];

export default async function ModulesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "modulesPage" });

  const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => ({
    n: t(`items.${i}.n`),
    d: t(`items.${i}.d`),
    points: [0, 1, 2].map((j) => t(`items.${i}.points.${j}`)),
  }));

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
              <span className="text-brand">{t("hero.titleB")}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-muted">
              {t("hero.sub")}
            </p>
          </Reveal>
        </div>
      </section>

      {/* MODULE GRID */}
      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((m, i) => (
            <Reveal key={m.n} delay={(i % 3) * 90}>
              <div className="dash-card dash-card-hover flex h-full flex-col overflow-hidden">
                <div className="relative h-44 shrink-0 overflow-hidden bg-brand-tint/40">
                  <img
                    src={`/images/modules/${IMGS[i]}.png`}
                    alt={m.n}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col p-7">
                <div className="flex items-center justify-between">
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl text-[16px] font-bold ${TINTS[i % TINTS.length]}`}>
                    {m.n.charAt(0)}
                  </span>
                  <span className="rounded-full bg-card-soft px-2.5 py-1 font-mono text-[10.5px] font-semibold text-faint ring-1 ring-line">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-5 text-[19px] font-bold tracking-tight text-ink">{m.n}</p>
                <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{m.d}</p>
                <ul className="mt-5 space-y-2 border-t border-line-soft pt-5">
                  {m.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-[13.5px] font-medium text-ink-soft">
                      <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-ok" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {p}
                    </li>
                  ))}
                </ul>
                {(i <= 9) && (
                  <div className="mt-auto pt-5">
                    <Link
                      href={`/${locale}/app/${["customs", "freight", "compliance", "documents", "products", "suppliers", "logistics", "finance", "assistant", "tower"][i]}`}
                      className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-brand hover:gap-2.5 transition-all"
                    >
                      {t("tryIt")} →
                    </Link>
                  </div>
                )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="pt-4 pb-0">
        <CtaBand
          title={t("cta.title")}
          sub={t("cta.sub")}
          b1={t("cta.b1")}
          b1Href={`/${locale}/contact`}
          b2={t("cta.b2")}
          b2Href={`/${locale}/contact`}
        />
      </div>
    </>
  );
}
