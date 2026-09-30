import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import Wizard from "./Wizard";

type Props = { params: Promise<{ locale: string }> };

const KEYS = [
  "wTitle", "wSub", "stepBasics", "stepParties", "stepReview",
  "fTitle", "fTitlePh", "fIncoterm", "fOrigin", "fDest", "fBuyer", "fSupplier",
  "fCurrency", "fValue", "fDesc", "fDescPh", "commercialNote",
  "back", "next", "create", "creating", "errTitle",
];

export default async function NewTrade({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "trades" });

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  const messages = Object.fromEntries(KEYS.map((k) => [k, t(k)]));

  return (
    <section className="min-h-[75vh] bg-brand-tint-soft">
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <p className="text-xs font-bold tracking-[0.22em] text-brand uppercase">{t("new")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">{t("wTitle")}</h1>
        <p className="mt-1 text-ink-soft">{t("wSub")}</p>
        <div className="mt-6">
          <Wizard messages={messages} locale={locale} />
        </div>
      </div>
    </section>
  );
}
