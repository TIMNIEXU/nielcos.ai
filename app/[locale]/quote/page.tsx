import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import QuoteForm from "@/components/QuoteForm";
import { SectionHead } from "@/components/Section";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const SERVICES = ["customs", "freight", "drayage", "warehouse", "insurance", "bond"];

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ service?: string; cargo?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "quotes" });
  const service = SERVICES.includes(sp.service ?? "") ? sp.service : undefined;
  return (
    <main className="mx-auto max-w-3xl px-5 pt-14 pb-20 lg:px-8">
      <SectionHead eyebrow={t("title")} title={t("title")} sub={t("sub")} align="center" />
      <div className="mt-8">
        <QuoteForm locale={locale} defaultService={service} defaultCargo={sp.cargo} />
      </div>
    </main>
  );
}
