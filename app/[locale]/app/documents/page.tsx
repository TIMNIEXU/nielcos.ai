import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DocumentsBoard from "./DocumentsBoard";

type Props = { params: Promise<{ locale: string }> };

const KEYS = [
  "title","sub","tabLibrary","tabUpload","tabShares","searchPh","allTypes",
  "thName","thType","thVersion","thShipment","thStatus","thUpdated","thActions",
  "empty","versionsCount","historyTitle","makeCurrent","currentBadge",
  "uploadNewVersion","shareBtn","shareTitle","expiryLabel","expiry7d","expiry30d",
  "expiryNever","createShare","copyLink","copied","revoke","revokeConfirm",
  "shareEmpty","shareNote","uploadTitle","shipmentLabel","shipmentPh","noShipment",
  "chooseFile","uploadDone","uploadHint2","deleteGroup","deleteVersion",
  "openShipment","statusParsed","statusPending","sharedBadge","parseNow","versionLabel",
];

const APP_KEYS = [
  "back","download","delete","uploading","parsing","docTypeArrivalNotice",
  "docTypeBillOfLading","docTypeCommercialInvoice","docTypePackingList",
  "docTypeOther","summaryContainers","summaryPackages",
];

export default async function DocumentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("documents");
  const ta = await getTranslations("app");

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    redirect({ href: "/login", locale });
  }
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  const { data: companyId } = await sb.rpc("own_company_id");
  if (!companyId) redirect({ href: "/login", locale });

  const dict: Record<string, string> = {};
  for (const k of KEYS) dict[k] = t(k);
  const adict: Record<string, string> = {};
  for (const k of APP_KEYS) adict[k] = ta(k);

  return (
    <section className="min-h-[75vh] bg-brand-tint-soft">
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <Link href={`/${locale}/app`} className="text-sm font-semibold text-brand hover:underline">
          ← {ta("back")}
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-ink-soft">{t("sub")}</p>
        <div className="mt-6">
          <DocumentsBoard t={dict} ta={adict} locale={locale} companyId={companyId as string} />
        </div>
      </div>
    </section>
  );
}
