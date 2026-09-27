import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Reveal from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "contact" });

  const cards = [
    {
      label: "Phone",
      value: t("info.phone"),
      sub: t("info.phoneNote"),
      href: "tel:+17323388098",
    },
    {
      label: "Email",
      value: t("info.email"),
      sub: t("info.hours"),
      href: "mailto:info@nielcustoms.ai",
    },
    {
      label: "Locations",
      value: t("info.locations"),
      sub: "Trade Further Together",
      href: undefined,
    },
  ];

  return (
    <>
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

      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <Reveal>
            <ContactForm />
          </Reveal>
          <div className="space-y-4">
            <Reveal delay={100}>
              <p className="text-[12px] font-bold tracking-[0.14em] text-faint uppercase">
                {t("info.title")}
              </p>
            </Reveal>
            {cards.map((c, i) => (
              <Reveal key={c.label} delay={140 + i * 80}>
                <div className="dash-card dash-card-hover p-6">
                  <p className="text-[11.5px] font-bold tracking-widest text-faint uppercase">
                    {c.label}
                  </p>
                  {c.href ? (
                    <a
                      href={c.href}
                      className="mt-2 block text-[17px] font-bold text-ink transition-colors hover:text-brand"
                    >
                      {c.value}
                    </a>
                  ) : (
                    <p className="mt-2 text-[17px] font-bold text-ink">{c.value}</p>
                  )}
                  <p className="mt-1 text-[13px] text-muted">{c.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
