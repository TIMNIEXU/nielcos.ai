import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Reveal from "@/components/Reveal";
import AdCvdChecker from "@/components/AdCvdChecker";
import { SectionHead } from "@/components/Section";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const KEYS = [
  "fProduct", "fProductPh", "fOrigin", "fOriginPh", "fHts", "fHtsPh",
  "fMfr", "fMfrPh", "fExporter", "fExporterPh", "submit", "checking", "error",
  "riskTitle", "riskHigh", "riskMedium", "riskLow",
  "rProduct", "rOrigin", "rHts", "rMfr", "rExporter",
  "potentialCase", "casePending", "scopeMatch", "scopePotential", "scopeReview",
  "scope", "exclusion", "exclusionReview", "verified",
  "exporterRate", "verify", "cashDeposit", "cashDepositVerify",
  "recTitle", "recScopeReview", "recScreen", "recNoMatch",
  "noMatchNote", "originMissing", "disclaimer",
  "ctaQuote", "ctaWatchlist",
] as const;

export default async function AdCvdCheckerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "adcvdchecker" });

  const labels: Record<string, string> = {};
  for (const k of KEYS) labels[k] = t(k);

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
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8 lg:pb-24">
        <Reveal>
          <AdCvdChecker t={labels} locale={locale} />
        </Reveal>
      </section>
    </>
  );
}
