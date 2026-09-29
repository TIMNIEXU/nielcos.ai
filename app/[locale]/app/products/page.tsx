import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProductsBoard from "./ProductsBoard";

type Props = { params: Promise<{ locale: string }> };

const KEYS = [
  "title","sub","searchPh","addProduct","import","thSku","thName","thHts","thMfn",
  "thDuties","thPga","thActions","empty","fSku","fNameEn","fNameZh","fHts","fOrigin",
  "fMaterial","fPgaManual","fNotes","save","cancel","edit","delete","editTitle",
  "addTitle","htsSearch","htsSearchPh","htsSearching","officialDesc","htsNoMatch",
  "dutyDetail","pgaManualLabel","noPga","noHts","copyHts","deleteConfirm",
  "importTitle","importHint","chooseFile","importRun","importDone","importFailed",
  "skuRequired","dupSku","saveFailed",
];

const APP_KEYS = ["back"];

export default async function ProductsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("products");
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
          <ProductsBoard t={(k) => dict[k] ?? k} locale={locale} />
        </div>
      </div>
    </section>
  );
}
