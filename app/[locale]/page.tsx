import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Reveal from "@/components/Reveal";
import DashboardMock from "@/components/DashboardMock";
import { SectionHead, CtaBand } from "@/components/Section";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const MODULE_ICONS = ["doc", "truck", "shield", "box", "bot", "chart", "globe", "card"] as const;

function ModuleGlyph({ i }: { i: number }) {
  const paths: Record<string, string> = {
    doc: "M6 2h9l5 5v15H6zM14 2v6h6",
    truck: "M1 5h13v11H1zM14 9h4l4 4v3h-8zM5.5 19a1.8 1.8 0 1 0 0 .01M17.5 19a1.8 1.8 0 1 0 0 .01",
    shield: "M12 2 4 5.5V12c0 5 3.4 8.8 8 10 4.6-1.2 8-5 8-10V5.5z",
    box: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
    bot: "M12 2a7 7 0 0 1 7 7v10H5V9a7 7 0 0 1 7-7zM9 12h.01M15 12h.01",
    chart: "M3 3v18h18M8 17v-6M13 17V7M18 17v-3",
    globe: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2c3 3.5 3 16.5 0 20-3-3.5-3-16.5 0-20z",
    card: "M2 5h20v14H2zM2 10h20",
  };
  const tints = [
    "bg-sky-tint text-sky", "bg-brand-tint text-brand", "bg-ok-tint text-ok",
    "bg-warn-tint text-warn", "bg-vio-tint text-vio", "bg-risk-tint text-risk",
    "bg-sky-tint text-sky", "bg-brand-tint text-brand",
  ];
  return (
    <span className={`grid h-11 w-11 place-items-center rounded-xl ${tints[i % tints.length]}`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d={paths[MODULE_ICONS[i % MODULE_ICONS.length]]} />
      </svg>
    </span>
  );
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "home" });
  const tm = await getTranslations({ locale, namespace: "modulesPage" });

  const kpis = [0, 1, 2, 3].map((i) => ({
    value: t(`kpis.${i}.value`),
    label: t(`kpis.${i}.label`),
    delta: t(`kpis.${i}.delta`),
  }));
  const marquee = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => t(`marquee.${i}`));
  const modules = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({
    name: t(`modules.items.${i}.name`),
    desc: t(`modules.items.${i}.desc`),
  }));
  const risks = [0, 1, 2].map((i) => ({
    t: t(`ai.risks.${i}.t`),
    d: t(`ai.risks.${i}.d`),
  }));
  const agencies = [0, 1, 2, 3].map((i) => ({
    n: t(`compliance.items.${i}.n`),
    v: t(`compliance.items.${i}.v`),
  }));
  const cities = [0, 1, 2].map((i) => ({
    n: t(`network.cities.${i}.n`),
    d: t(`network.cities.${i}.d`),
  }));

  const riskTones = ["bg-risk-tint text-risk", "bg-warn-tint text-warn", "bg-vio-tint text-vio"];

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        <div className="dotgrid absolute inset-0 opacity-60" />
        <div className="absolute -top-32 left-1/2 h-80 w-[52rem] -translate-x-1/2 rounded-full bg-brand-tint blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 pt-16 pb-10 text-center lg:px-8 lg:pt-24">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-1.5 text-[12.5px] font-semibold text-ink-soft shadow-card">
              <span className="pulse-dot h-2 w-2 rounded-full bg-ok" />
              {t("hero.badge")}
            </span>
          </Reveal>
          <Reveal delay={90}>
            <p className="eyebrow mt-6 justify-center">{t("hero.eyebrow")}</p>
            <h1 className="mx-auto mt-4 max-w-4xl text-[2.6rem] leading-[1.05] font-bold tracking-tight text-ink sm:text-6xl lg:text-[4.2rem]">
              {t("hero.titleA")}
              <br />
              <span className="text-brand">{t("hero.titleB")}</span>
            </h1>
          </Reveal>
          <Reveal delay={180}>
            <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-muted">
              {t("hero.sub")}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={`/${locale}/contact`}
                className="rounded-full bg-brand px-8 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(29,78,216,0.8)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep"
              >
                {t("hero.cta1")}
              </Link>
              <Link
                href={`/${locale}/platform`}
                className="rounded-full border border-line bg-white px-8 py-3.5 text-[15px] font-semibold text-ink shadow-card transition-all hover:-translate-y-0.5 hover:border-brand"
              >
                {t("hero.cta2")}
              </Link>
            </div>
          </Reveal>
          <Reveal delay={260} className="mt-12 lg:mt-16">
            <DashboardMock />
          </Reveal>
        </div>
      </section>

      {/* ============ KPI STRIP ============ */}
      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k, i) => (
            <Reveal key={k.label} delay={i * 80}>
              <div className="dash-card dash-card-hover p-5">
                <p className="text-[28px] font-bold tracking-tight text-ink">{k.value}</p>
                <p className="mt-1 text-[13.5px] font-medium text-ink-soft">{k.label}</p>
                <p className="mt-2 text-[12px] font-semibold text-ok">{k.delta}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ MARQUEE ============ */}
      <section className="border-y border-line bg-white py-5">
        <div className="overflow-hidden">
          <div className="marquee-track flex w-max items-center gap-10 pr-10">
            {[...marquee, ...marquee].map((m, i) => (
              <span key={i} className="flex items-center gap-10 text-[13px] font-bold tracking-[0.18em] text-faint uppercase whitespace-nowrap">
                {m}
                <span className="h-1.5 w-1.5 rounded-full bg-brand/40" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============ MODULES ============ */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <SectionHead
          eyebrow={t("modules.eyebrow")}
          title={t("modules.title")}
          sub={t("modules.sub")}
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m, i) => (
            <Reveal key={m.name} delay={(i % 4) * 80}>
              <div className="dash-card dash-card-hover h-full p-6">
                <ModuleGlyph i={i} />
                <p className="mt-4 text-[16px] font-bold text-ink">{m.name}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{m.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-10 text-center">
          <Link
            href={`/${locale}/modules`}
            className="inline-flex items-center gap-2 text-[15px] font-bold text-brand hover:gap-3 transition-all"
          >
            {t("modules.cta")} →
          </Link>
        </Reveal>
      </section>

      {/* ============ AI INTELLIGENCE ============ */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <SectionHead
              align="left"
              eyebrow={t("ai.eyebrow")}
              title={t("ai.title")}
              sub={t("ai.sub")}
            />
            <Reveal delay={150} className="mt-8">
              <Link
                href={`/${locale}/platform`}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[14.5px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-deep"
              >
                {t("ai.cta")} →
              </Link>
            </Reveal>
          </div>
          <div className="space-y-3">
            {risks.map((r, i) => (
              <Reveal key={r.t} delay={i * 100}>
                <div className="dash-card flex items-center gap-4 p-5">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[15px] font-bold ${riskTones[i]}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-[15px] font-bold text-ink">{r.t}</p>
                    <p className="text-[13px] text-muted">{r.d}</p>
                  </div>
                  <span className="text-faint">→</span>
                </div>
              </Reveal>
            ))}
            <Reveal delay={320}>
              <div className="rounded-2xl bg-brand px-6 py-4 text-center text-[14.5px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(29,78,216,0.8)]">
                Analyze with NIEL AI →
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ COMPLIANCE ============ */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <div className="dash-card mx-auto flex max-w-sm flex-col items-center p-8">
              <div className="relative h-44 w-44">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#e8eef7" strokeWidth="13" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#16a34a" strokeWidth="13"
                    strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 50 * 0.92} ${2 * Math.PI * 50}`} />
                </svg>
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-3xl font-bold text-ink">92%</p>
                    <p className="text-[12px] font-medium text-muted">{t("compliance.overall")}</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 w-full space-y-3">
                {agencies.map((a) => (
                  <div key={a.n}>
                    <div className="mb-1 flex justify-between text-[12.5px] font-semibold">
                      <span className="text-ink-soft">{a.n}</span>
                      <span className="text-ink">{a.v}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-line-soft">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand to-ok" style={{ width: a.v }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <div>
            <SectionHead
              align="left"
              eyebrow={t("compliance.eyebrow")}
              title={t("compliance.title")}
              sub={t("compliance.sub")}
            />
          </div>
        </div>
      </section>

      {/* ============ NETWORK ============ */}
      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
          <SectionHead
            eyebrow={t("network.eyebrow")}
            title={t("network.title")}
            sub={t("network.sub")}
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {cities.map((c, i) => (
              <Reveal key={c.n} delay={i * 100}>
                <div className="dash-card dash-card-hover relative overflow-hidden p-6">
                  <div className="dotgrid absolute inset-0 opacity-50" />
                  <div className="relative">
                    <span className="inline-flex items-center gap-2 rounded-full bg-brand-tint px-3 py-1 text-[11.5px] font-bold text-brand">
                      <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-brand" />
                      {c.d}
                    </span>
                    <p className="mt-4 text-xl font-bold text-ink">{c.n}</p>
                  </div>
                </div>
              </Reveal>
            ))}
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
          b2Href={`/${locale}/contact`}
        />
      </div>
    </>
  );
}
