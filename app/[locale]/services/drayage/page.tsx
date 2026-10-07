import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import DrayageForm from "@/components/DrayageForm";
import { SectionHead } from "@/components/Section";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function DrayagePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "drayage" });
  // Pre-translate to a plain dict (no ICU placeholders in these messages).
  const dict: Record<string, string> = {};
  for (const k of [
    "quickNote", "secContact", "secShipment", "name", "company", "email", "phone",
    "containerNo", "containerNoPh", "ssl", "sslPh", "blNo", "blNoPh",
    "pickup", "pickupPh", "delivery", "deliveryPh", "containerSize", "containerSizePh",
    "weight", "weightPh", "overweight", "hazmat", "lfd", "neededDate",
    "returnLocation", "returnLocationPh", "notes", "notesPh",
    "requiredHint", "submit", "sending", "successTitle", "successBody",
    "errRequired", "errEmail", "errFailed",
  ]) dict[k] = t(k);
  return (
    <main className="mx-auto max-w-3xl px-5 pt-14 pb-20 lg:px-8">
      <SectionHead eyebrow={t("title")} title={t("title")} sub={t("sub")} align="center" image="/images/modules/logistics.jpg" />
      <div className="mt-8">
        <DrayageForm messages={dict} />
      </div>
    </main>
  );
}
