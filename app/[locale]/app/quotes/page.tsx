import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import QuotesBoard from "./QuotesBoard";

/* GRI-001 V4a — unified quote + HTS-verification triage (login required). */

const KEYS = [
  "title","sub","tabQuotes","tabVerify","fAll",
  "statNew","statQuoted","statVerify",
  "thDate","thService","thContact","thRoute","thCargo","thStatus","thActions",
  "stNew","stQuoted","stWon","stLost","stDeclined",
  "vRequested","vQuoted","vVerified","vDeclined",
  "claim","markQuoted","markWon","markLost","markDeclined",
  "vMarkQuoted","vMarkVerified",
  "qAmount","qNote","save","cancel","saveFailed",
  "emptyQuotes","emptyVerify","claimedByYou","unclaimed","thHts","thProduct",
  "svc_customs","svc_freight","svc_drayage","svc_warehouse","svc_insurance","svc_bond",
];

const APP_KEYS = ["back"];

export default async function QuotesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("quotesApp");
  const ta = await getTranslations("app");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16 text-center text-sm text-ink-soft">
        Supabase 未配置 / Supabase not configured.
      </div>
    );
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  const dict: Record<string, string> = {};
  for (const k of KEYS) dict[k] = t(k);
  for (const k of APP_KEYS) dict[`app_${k}`] = ta(k);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <Link href={`/${locale}/app`} className="text-[13px] font-semibold text-brand">
        ← {dict["app_back"]}
      </Link>
      <h1 className="mt-2 text-[24px] font-bold text-ink">{dict["title"]}</h1>
      <p className="mt-1 text-[14px] text-muted">{dict["sub"]}</p>
      <div className="mt-6">
        <QuotesBoard messages={dict} />
      </div>
    </div>
  );
}
