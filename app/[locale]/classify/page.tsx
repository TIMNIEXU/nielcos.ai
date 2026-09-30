import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import HtsAgent from "@/components/HtsAgent";
import { SectionHead } from "@/components/Section";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "classify" });
  return { title: t("title") };
}

export default async function ClassifyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "classify" });
  return (
    <main className="mx-auto max-w-5xl px-5 pt-14 pb-20 lg:px-8">
      <SectionHead eyebrow={t("eyebrow")} title={t("title")} sub={t("sub")} align="center" />
      <div className="mt-8">
        <HtsAgent locale={locale} />
      </div>
    </main>
  );
}
