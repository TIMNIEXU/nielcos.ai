import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Reveal from "@/components/Reveal";
import { SectionHead } from "@/components/Section";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-line bg-ink px-5 py-4 text-[13px] leading-relaxed text-white/90">
      <code>{children}</code>
    </pre>
  );
}

export default async function DevelopersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "devdocs" });

  const endpoints = [1, 2, 3].map((i) => ({
    m: t(`ep${i}m`),
    p: t(`ep${i}p`),
    d: t(`ep${i}d`),
  }));
  const events = [1, 2, 3].map((i) => ({
    n: t(`ev${i}`),
    d: t(`ev${i}d`),
  }));

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="dotgrid absolute inset-0 opacity-60" />
        <div className="absolute -top-32 left-1/2 h-80 w-[52rem] -translate-x-1/2 rounded-full bg-brand-tint blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 pt-16 pb-10 text-center lg:px-8 lg:pt-24">
          <Reveal>
            <p className="eyebrow justify-center">{t("eyebrow")}</p>
            <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-muted">
              {t("sub")}
            </p>
          </Reveal>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-16 px-5 pb-10 lg:px-8">
        {/* AUTH */}
        <section>
          <SectionHead align="left" eyebrow="01" title={t("authTitle")} sub={t("authSub")} image="/images/heroes/developers.jpg" />
          <Reveal className="mt-8">
            <div className="dash-card space-y-3 p-6 sm:p-8">
              {[1, 2, 3].map((i) => (
                <p key={i} className="text-[14.5px] leading-relaxed text-ink-soft">
                  {t(`authP${i}`)}
                </p>
              ))}
              <p className="rounded-xl bg-warn-tint px-4 py-3 text-[13.5px] font-medium text-ink">
                {t("authNote")}
              </p>
            </div>
          </Reveal>
          <Reveal delay={80} className="mt-4">
            <Code>{`curl https://www.nielcos.ai/api/v1/shipments \\
  -H "Authorization: Bearer niel_sk_..."`}</Code>
          </Reveal>
        </section>

        {/* REST */}
        <section>
          <SectionHead align="left" eyebrow="02" title={t("restTitle")} sub={t("restSub")} />
          <div className="mt-8 space-y-4">
            {endpoints.map((e, i) => (
              <Reveal key={e.p} delay={i * 70}>
                <div className="dash-card p-6 sm:p-7">
                  <p className="flex flex-wrap items-center gap-3">
                    <span className="rounded-lg bg-ok-tint px-2.5 py-1 font-mono text-[12.5px] font-bold text-ok">
                      {e.m}
                    </span>
                    <code className="font-mono text-[14px] font-semibold text-ink">{e.p}</code>
                  </p>
                  <p className="mt-3 text-[14px] leading-relaxed text-muted">{e.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={80} className="mt-4">
            <Code>{`curl https://www.nielcos.ai/api/v1/shipments/NIEL-2026-000123 \\
  -H "Authorization: Bearer niel_sk_..."
# { "shipment": { "gttid": "NIEL-2026-000123", ... } }
# 404 -> { "error": "not_found" }`}</Code>
          </Reveal>
          <Reveal className="mt-4">
            <p className="text-[13.5px] leading-relaxed text-faint">{t("respNote")}</p>
          </Reveal>
        </section>

        {/* WEBHOOKS */}
        <section>
          <SectionHead align="left" eyebrow="03" title={t("whTitle")} sub={t("whSub")} />
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {events.map((e, i) => (
              <Reveal key={e.n} delay={i * 70}>
                <div className="dash-card h-full p-5">
                  <code className="font-mono text-[13px] font-bold text-brand">{e.n}</code>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted">{e.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-8">
            <div className="dash-card p-6 sm:p-8">
              <h3 className="text-[17px] font-bold text-ink">{t("sigTitle")}</h3>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{t("sigP1")}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{t("sigP2")}</p>
            </div>
          </Reveal>
          <Reveal delay={80} className="mt-4">
            <Code>{`import { createHmac, timingSafeEqual } from "crypto";

const sig = req.headers["x-niel-signature"]; // "sha256=<hex>"
const expected =
  "sha256=" +
  createHmac("sha256", process.env.NIEL_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

const ok =
  sig.length === expected.length &&
  timingSafeEqual(Buffer.from(sig), Buffer.from(expected));`}</Code>
          </Reveal>
        </section>

        {/* EDI */}
        <section>
          <SectionHead align="left" eyebrow="04" title={t("ediTitle")} sub={t("ediSub")} />
          <Reveal className="mt-8">
            <div className="dash-card space-y-3 p-6 sm:p-8">
              <p className="text-[14.5px] leading-relaxed text-ink-soft">{t("ediP1")}</p>
              <p className="text-[14.5px] leading-relaxed text-ink-soft">{t("ediP2")}</p>
            </div>
          </Reveal>
        </section>

        {/* RATE LIMITS */}
        <section>
          <SectionHead align="left" eyebrow="05" title={t("rateTitle")} />
          <Reveal className="mt-8">
            <div className="dash-card p-6 sm:p-8">
              <p className="text-[14.5px] leading-relaxed text-ink-soft">{t("rateP1")}</p>
            </div>
          </Reveal>
        </section>

        {/* CTA */}
        <section>
          <Reveal>
            <div className="dash-card p-8 text-center sm:p-10">
              <h2 className="text-2xl font-bold tracking-tight text-ink">{t("ctaTitle")}</h2>
              <p className="mx-auto mt-3 max-w-md text-[14.5px] text-muted">{t("ctaSub")}</p>
              <Link
                href={`/${locale}/app/integrations`}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-8 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(29,78,216,0.8)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep"
              >
                {t("ctaBtn")} →
              </Link>
            </div>
          </Reveal>
        </section>
      </div>
    </>
  );
}
