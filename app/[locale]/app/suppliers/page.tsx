import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SuppliersBoard from "./SuppliersBoard";

type Props = { params: Promise<{ locale: string }> };

const KEYS = [
  "title","sub","searchPh","addSupplier","import","thCode","thName","thCountry","thScore",
  "thDocs","thRisk","thActions","empty","statTotal","statAvgScore","statHighRisk","statDocsPending",
  "fCode","fNameEn","fNameZh","fCountry","fContactName","fContactEmail","fContactPhone","fAddress",
  "fPaymentTerms","fCurrency","fStatus","statusActive","statusInactive",
  "scoreQuality","scoreDelivery","scoreCost","scoreService","scoreOverall","noScore","contact",
  "docChecklist","docOk","docPending","docMissing",
  "doc_business_license","doc_iso_cert","doc_bank_info","doc_tax_form","doc_compliance_decl","doc_insurance",
  "riskLevel","riskLow","riskMedium","riskHigh","riskFlags",
  "flag_financial","flag_compliance","flag_delivery","flag_quality","flag_geopolitical",
  "fNotes","save","cancel","edit","delete","editTitle","addTitle","detail",
  "deleteConfirm","importTitle","importHint","chooseFile","importRun","importDone","importFailed",
  "codeRequired","dupCode","saveFailed",
];

const APP_KEYS = ["back"];

export default async function SuppliersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("suppliers");
  const ta = await getTranslations("app");

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16 text-center text-sm text-ink-soft">
        Supabase 未配置 / Supabase not configured.
      </div>
    );
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
          <SuppliersBoard messages={dict} locale={locale} />
        </div>
      </div>
    </section>
  );
}
