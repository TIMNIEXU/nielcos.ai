import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Reveal from "@/components/Reveal";
import AdCvdList from "@/components/AdCvdList";
import { SectionHead } from "@/components/Section";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function AdCvdPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "adcvd" });

  const labels = {
    searchPh: t("searchPh"),
    originAll: t("originAll"),
    typeAll: t("typeAll"),
    colProduct: t("colProduct"),
    colHts: t("colHts"),
    colOrigin: t("colOrigin"),
    colType: t("colType"),
    colStatus: t("colStatus"),
    empty: t("empty"),
    count: t("count"),
    disclaimer: t("disclaimer"),
    checkRate: t("checkRate"),
  };

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="dotgrid absolute inset-0 opacity-60" />
        <div className="absolute -top-32 left-1/2 h-80 w-[52rem] -translate-x-1/2 rounded-full bg-brand-tint blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 pt-16 pb-4 text-center lg:px-8 lg:pt-24">
          <SectionHead
            eyebrow={t("eyebrow")}
            title={t("title")}
            sub={t("sub")}
            image="/images/heroes/ad-cvd.jpg"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8 lg:pb-24">
        <Reveal>
          <AdCvdList t={labels} locale={locale} />
        </Reveal>
      </section>
    </>
  );
}
