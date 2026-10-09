import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Reveal from "@/components/Reveal";
import DashboardMock from "@/components/DashboardMock";
import DutyEstimator from "@/components/DutyEstimator";
import ImportBox from "@/components/ImportBox";
import AiDemo from "@/components/AiDemo";
import { SectionHead, CtaBand } from "@/components/Section";
import RegulatoryFeed from "@/components/RegulatoryFeed";
import { buildFxestLabels } from "@/lib/estimator-labels";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const MODULE_ICONS = ["doc", "truck", "shield", "box", "bot", "chart", "globe", "card"] as const;

const CITY_IMGS = ["new-york-nj", "los-angeles", "chicago"];

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
  const tf = await getTranslations({ locale, namespace: "fxest" });
  const tl = await getTranslations({ locale, namespace: "landedCost" });
  const t2 = await getTranslations({ locale, namespace: "mkt2" });
  const estimatorLabels = buildFxestLabels(tf);

  const kpis = [0, 1, 2, 3].map((i) => ({
    value: t(`kpis.${i}.value`),
    label: t(`kpis.${i}.label`),
    delta: t(`kpis.${i}.delta`),
  }));
  const marquee = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => t(`marquee.${i}`));
  const entries = [0, 1, 2, 3, 4].map((i) => ({
    name: t(`entries.items.${i}.name`),
    desc: t(`entries.items.${i}.desc`),
    cta: t(`entries.items.${i}.cta`),
  }));
  // GRI-001 V1: five customer entries. Check -> public /classify (V3 HTS Intelligence).
  const ENTRY_APPS = [
    `/${locale}/landed-cost`,
    `/${locale}/classify`,
    `/${locale}/app/logistics`,
    `/${locale}/bond`,
    `/${locale}/insurance`,
  ];
  const risks = [0, 1, 2].map((i) => ({
    t: t(`ai.risks.${i}.t`),
    d: t(`ai.risks.${i}.d`),
  }));
  const agencies = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({
    n: t(`compliance.items.${i}.n`),
  }));
  const cities = [0, 1, 2].map((i) => ({
    n: t(`network.cities.${i}.n`),
    d: t(`network.cities.${i}.d`),
  }));
  const wfSteps = [0, 1, 2, 3, 4, 5].map((i) => ({
    t: t2(`wf.${i}.t`),
    d: t2(`wf.${i}.d`),
  }));
  const demoChips = [0, 1, 2].map((i) => ({
    q: t2(`chips.${i}.q`),
    a: t2(`chips.${i}.a`),
  }));
  const resCards = [
    { t: t2("resRegT"), d: t2("resRegD"), href: `/${locale}/regulatory` },
    { t: t2("resLcT"), d: t2("resLcD"), href: `/${locale}/landed-cost` },
    { t: t2("resDevT"), d: t2("resDevD"), href: `/${locale}/developers` },
  ];
  const devPoints = [
    { t: t2("devApiT"), d: t2("devApiD") },
    { t: t2("devWhT"), d: t2("devWhD") },
    { t: t2("devEdiT"), d: t2("devEdiD") },
  ];

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
          {/* ============ DUTY ESTIMATOR LINK CARD (standalone, top) ============ */}
          <Reveal delay={45}>
            <Link
              href={`/${locale}/landed-cost`}
              className="group mx-auto mt-6 flex max-w-2xl items-center gap-4 rounded-2xl border border-brand/25 bg-white p-5 text-left shadow-card transition-all hover:-translate-y-1 hover:border-brand/50 hover:shadow-lg"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand text-white">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18M8 17v-6M13 17V7M18 17v-3" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-brand">
                  <span className="h-px w-4 bg-brand" />
                  {tl("eyebrow")}
                </span>
                <span className="mt-1 block text-[17px] font-bold text-ink">
                  {t("dutyCard.title")}
                </span>
                <span className="mt-0.5 block text-[13.5px] leading-snug text-muted">
                  {t("dutyCard.sub")}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-[14px] font-bold whitespace-nowrap text-white transition-all group-hover:bg-brand-deep">
                {t("dutyCard.cta")}
              </span>
            </Link>
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
                href={`/${locale}/import`}
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
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12.5px] font-semibold text-faint">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="inline-flex items-center gap-1.5">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-ok" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8.5l3.2 3.2L13 5" />
                  </svg>
                  {t(`hero.trust.${i}`)}
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal delay={260} className="mt-12 lg:mt-16">
            <DashboardMock />
          </Reveal>
        </div>
      </section>

      {/* ============ UNIVERSAL IMPORT BOX (GRI-001 V1) ============ */}
      <section id="import-box" className="relative scroll-mt-24 overflow-hidden border-y border-line bg-gradient-to-b from-brand-tint/50 via-white to-white">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
          <Reveal>
            <ImportBox locale={locale} />
          </Reveal>
        </div>
      </section>

      {/* ============ WHAT DO YOU NEED TODAY (Mode B service entry) ============ */}
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
        <SectionHead
          eyebrow={t("services.eyebrow")}
          title={t("services.title")}
          sub={t("services.sub")}
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { k: "c1", href: `/${locale}/import`, live: false, path: "M6 2h9l5 5v15H6zM14 2v6h6" },
            { k: "c2", href: `/${locale}/services/drayage`, live: true, path: "M1 5h13v11H1zM14 9h4l4 4v3h-8zM5.5 19a1.8 1.8 0 1 0 0 .01M17.5 19a1.8 1.8 0 1 0 0 .01" },
            { k: "c3", href: `/${locale}/services/customs`, live: true, path: "M12 2 4 5.5V12c0 5 3.4 8.8 8 10 4.6-1.2 8-5 8-10V5.5z" },
            { k: "c4", href: `/${locale}/landed-cost`, live: false, path: "M3 3v18h18M8 17v-6M13 17V7M18 17v-3" },
            { k: "c5", href: `/${locale}/ad-cvd-checker`, live: false, path: "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4" },
            { k: "c6", href: `/${locale}/login`, live: false, path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2c3 3.5 3 16.5 0 20-3-3.5-3-16.5 0-20z" },
          ].map((c) => (
            <Reveal key={c.k}>
              <Link href={c.href} className="dash-card dash-card-hover group flex h-full items-start gap-4 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-tint text-brand">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d={c.path} />
                  </svg>
                </span>
                <span>
                  <span className="flex items-center gap-2 text-[15px] font-bold text-ink">
                    {t(`services.${c.k}t`)}
                    {c.live && (
                      <span className="rounded-full bg-ok-tint px-2 py-0.5 text-[11px] font-bold text-ok">{t("services.live")}</span>
                    )}
                  </span>
                  <span className="mt-1 block text-[13px] text-ink-soft">{t(`services.${c.k}d`)}</span>
                </span>
              </Link>
            </Reveal>
          ))}
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

      {/* ============ DUTY ESTIMATOR ============ */}
      <section id="duty-estimator" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 lg:px-8 lg:py-24">
        <SectionHead
          eyebrow={tf("eyebrow")}
          title={tf("title")}
          sub={tf("sub")}
        />
        <Reveal className="mt-12">
          <DutyEstimator t={estimatorLabels} locale={locale} />
        </Reveal>
        <Reveal className="mt-6 text-center">
          <Link
            href={`/${locale}/landed-cost`}
            className="inline-flex items-center gap-2 text-[15px] font-bold text-brand transition-all hover:gap-3"
          >
            {tl("openFull")} →
          </Link>
        </Reveal>
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

      {/* ============ FIVE ENTRIES (GRI-001 V1) ============ */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <SectionHead
          eyebrow={t("entries.eyebrow")}
          title={t("entries.title")}
          sub={t("entries.sub")}
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {entries.map((m, i) => (
            <Reveal key={m.name} delay={(i % 5) * 80}>
              <Link href={ENTRY_APPS[i]} className="dash-card dash-card-hover block h-full p-6">
                <ModuleGlyph i={i} />
                <p className="mt-4 text-[16px] font-bold text-ink">{m.name}</p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{m.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-brand">
                  {m.cta}
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ WORKFLOW ============ */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
          <SectionHead
            eyebrow={t2("workflowEyebrow")}
            title={t2("workflowTitle")}
            sub={t2("workflowSub")}
          />
          <div className="mt-12">
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {wfSteps.map((s, i) => (
                <Reveal key={s.t} delay={i * 70}>
                  <li className="dash-card dash-card-hover relative h-full p-5">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-tint text-[14px] font-bold text-brand">
                      {i + 1}
                    </span>
                    <p className="mt-4 text-[15px] font-bold text-ink">{s.t}</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted">{s.d}</p>
                    {i < wfSteps.length - 1 && (
                      <span aria-hidden="true" className="absolute top-1/2 -right-3 hidden text-faint lg:block">
                        →
                      </span>
                    )}
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
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
            <Reveal delay={100} className="mt-8">
              <div className="overflow-hidden rounded-2xl border border-line shadow-card">
                <img
                  src="/images/ai-risks.jpg"
                  alt={t("ai.title")}
                  loading="lazy"
                  className="aspect-[16/10] w-full object-cover"
                />
              </div>
            </Reveal>
            <Reveal delay={150} className="mt-8">
              <Link
                href={`/${locale}/app/executive`}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[14.5px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-deep"
              >
                {t("ai.cta")} →
              </Link>
            </Reveal>
          </div>
          <div className="space-y-3">
            {risks.map((r, i) => (
              <Reveal key={r.t} delay={i * 100}>
                <Link
                  href={`/${locale}/app/executive`}
                  className="dash-card dash-card-hover flex items-center gap-4 p-5"
                >
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[15px] font-bold ${riskTones[i]}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-[15px] font-bold text-ink">{r.t}</p>
                    <p className="text-[13px] text-muted">{r.d}</p>
                  </div>
                  <span className="text-faint">→</span>
                </Link>
              </Reveal>
            ))}
            <Reveal delay={320}>
              <Link
                href={`/${locale}/app/assistant`}
                className="block rounded-2xl bg-brand px-6 py-4 text-center text-[14.5px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(29,78,216,0.8)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep"
              >
                Analyze with NIEL AI →
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ AI DEMO ============ */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
        <SectionHead
          eyebrow={t2("demoEyebrow")}
          title={t2("demoTitle")}
          sub={t2("demoSub")}
        />
        <Reveal className="mx-auto mt-12 max-w-3xl">
          <AiDemo
            messages={{ chips: demoChips }}
            ctaLabel={t2("demoCta")}
            ctaHref={`/${locale}/landed-cost`}
            note={t2("demoNote")}
          />
        </Reveal>
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
                    strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 50} ${2 * Math.PI * 50}`} />
                </svg>
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-3xl font-bold text-ink">{agencies.length}</p>
                    <p className="text-[12px] font-medium text-muted">{t("compliance.overall")}</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 grid w-full grid-cols-3 gap-2">
                {agencies.map((a) => (
                  <div key={a.n} className="flex items-center gap-1.5 rounded-lg border border-line-soft bg-white/70 px-2.5 py-2">
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-ok" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8.5l3.2 3.2L13 5" />
                    </svg>
                    <div className="leading-tight">
                      <p className="text-[12px] font-bold text-ink">{a.n}</p>
                      <p className="text-[10.5px] text-muted">{t("compliance.autoChecked")}</p>
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

      {/* ============ DEVELOPERS BANNER ============ */}
      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8 lg:pb-24">
        <Reveal>
          <div className="dash-card p-8 sm:p-10 lg:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="eyebrow">{t2("devEyebrow")}</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                  {t2("devTitle")}
                </h2>
                <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
                  {t2("devSub")}
                </p>
                <Link
                  href={`/${locale}/developers`}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-7 py-3 text-[14.5px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(29,78,216,0.8)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep"
                >
                  {t2("devCta")} →
                </Link>
              </div>
              <ul className="space-y-3">
                {devPoints.map((p) => (
                  <li key={p.t} className="flex items-start gap-3 rounded-2xl border border-line-soft bg-white/70 p-4">
                    <svg viewBox="0 0 16 16" className="mt-0.5 h-4 w-4 shrink-0 text-ok" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8.5l3.2 3.2L13 5" />
                    </svg>
                    <div>
                      <p className="text-[14.5px] font-bold text-ink">{p.t}</p>
                      <p className="mt-0.5 text-[13px] text-muted">{p.d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============ REGULATORY FEED ============ */}
      <RegulatoryFeed
        locale={locale}
        t={{
          eyebrow: t("regFeed.eyebrow"),
          title: t("regFeed.title"),
          sub: t("regFeed.sub"),
          viewAll: t("regFeed.viewAll"),
          empty: t("regFeed.empty"),
        }}
      />

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
                <div className="dash-card dash-card-hover relative h-full overflow-hidden">
                  <div className="relative h-44 overflow-hidden bg-brand-tint/40">
                    <img
                      src={`/images/network/${CITY_IMGS[i]}.jpg`}
                      alt={c.n}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="relative p-6">
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

      {/* ============ CERTIFICATION ============ */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
          <SectionHead
            eyebrow={t("certification.eyebrow")}
            title={t("certification.title")}
            sub={t("certification.desc")}
          />
          <Reveal className="mt-12">
            <div className="dash-card mx-auto flex max-w-3xl flex-col items-center gap-6 p-8 sm:flex-row">
              <img
                src="/images/cscp-badge.png"
                alt="APICS CSCP Certified"
                loading="lazy"
                className="h-24 w-24 shrink-0 rounded-2xl bg-white object-contain p-1 shadow-sm"
              />
              <div className="text-center sm:text-left">
                <span className="inline-block rounded-full bg-ink px-4 py-1.5 text-[12px] font-bold tracking-wide text-white">
                  {t("certification.badge")}
                </span>
                <a
                  href="/images/cscp-certificate.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="group mt-5 flex flex-col items-center gap-2 sm:items-start"
                >
                  <img
                    src="/images/cscp-certificate.jpg"
                    alt={t("certification.alt")}
                    loading="lazy"
                    className="h-44 w-auto rounded-xl border border-line bg-white shadow-sm transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <span className="text-[13px] font-semibold text-brand underline-offset-2 group-hover:underline">
                    {t("certification.hint")}
                  </span>
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ RESOURCES ============ */}
      <section id="resources" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 lg:px-8 lg:py-24">
        <SectionHead
          eyebrow={t2("resEyebrow")}
          title={t2("resTitle")}
          sub={t2("resSub")}
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {resCards.map((c, i) => (
            <Reveal key={c.t} delay={i * 90}>
              <Link
                href={c.href}
                className="dash-card dash-card-hover flex h-full flex-col p-6"
              >
                <p className="text-[16px] font-bold text-ink">{c.t}</p>
                <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-muted">{c.d}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-brand">
                  {t2("resOpen")} →
                </span>
              </Link>
            </Reveal>
          ))}
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
