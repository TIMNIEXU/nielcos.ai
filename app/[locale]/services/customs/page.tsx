import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import CustomsForm from "@/components/CustomsForm";
import { SectionHead } from "@/components/Section";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const KEYS = [
  "quickNote", "secContact", "secShipment", "name", "company", "email", "phone",
  "importerName", "importerNamePh", "entryPort", "entryPortPh", "blAwbNo", "blAwbNoPh",
  "invoiceNo", "invoiceNoPh", "productDesc", "productDescPh", "hts", "htsPh",
  "quantity", "quantityPh", "valueUsd", "valueUsdPh", "arrivalDate",
  "hasBond", "needsBond", "notes", "notesPh",
  "requiredHint", "submit", "sending", "successTitle", "successBody",
  "errRequired", "errEmail", "errFailed",
];

export default async function CustomsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "customs" });
  const dict: Record<string, string> = {};
  for (const k of KEYS) dict[k] = t(k);
  return (
    <main className="mx-auto max-w-3xl px-5 pt-14 pb-20 lg:px-8">
      <SectionHead eyebrow={t("title")} title={t("title")} sub={t("sub")} align="center" />
      <div className="mt-8">
        <CustomsForm messages={dict} />
      </div>
    </main>
  );
}
