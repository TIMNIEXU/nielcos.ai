import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import InsuranceBoard from "./InsuranceBoard";

type Props = { params: Promise<{ locale: string }> };

const KEYS = [
  "title","sub","tabQuotes","tabPolicies",
  "statNew","statActive","statCovered","statExpiring",
  "thDate","thContact","thCompany","thCargo","thRoute","thMode","thCoverage","thStatus","thActions",
  "stNew","stQuoted","stDeclined","claim","markQuoted","markDeclined","toPolicy",
  "qTitle","qPremium","qNote","save","cancel","saveFailed",
  "emptyQuotes","emptyPolicies","addPolicy",
  "thPolicyNo","thInsurer","thPremium","thPeriod","thGttid",
  "pPending","pActive","pExpired","pCancelled",
  "fPolicyNo","fInsurer","fCoverage","fCargoValue","fCurrency","fPremium",
  "fEffective","fExpiry","fStatus","fGttid","fNotes",
  "covMarine","covWarehouse","covContingent","covStock","modeOcean","modeAir",
  "edit","delete","deleteConfirm","policyNoRequired","dupPolicyNo",
  "claimedByYou","unclaimed",
];

const APP_KEYS = ["back"];

export default async function InsurancePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("insuranceApp");
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
          ← {adict["back"]}
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-ink-soft">{t("sub")}</p>
        <div className="mt-6">
          <InsuranceBoard messages={dict} />
        </div>
      </div>
    </section>
  );
}
