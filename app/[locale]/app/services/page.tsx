import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ServicesBoard from "./ServicesBoard";

/* Mode B — "My Services" workspace: the customer's Service Orders.
   Any-point entry: each SO has its own status; several can hang under
   one Trade Transaction (GTTID). Login required. */

const KEYS = [
  "title", "sub", "addTitle",
  "drayageName", "drayageDesc", "customsName", "customsDesc",
  "warehouseName", "warehouseDesc", "orderNow", "requestQuote",
  "empty", "setupRequired",
  "thSo", "thService", "thStatus", "thGttid", "thCreated",
  "st_quote_requested", "st_quoted", "st_confirmed", "st_in_progress",
  "st_completed", "st_invoiced", "st_closed", "st_cancelled",
  "svc_drayage", "svc_customs", "svc_warehouse",
  "svc_freight", "svc_insurance", "svc_bond",
  "detailTitle", "close",
  "dContainer", "dPickup", "dDelivery", "dLfd", "dContact", "dQuoted",
  "dGttid", "dNoGttid", "loadFailed",
];

const APP_KEYS = ["back"];

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("servicesApp");
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
      <p className="mt-1 max-w-2xl text-[14px] text-muted">{dict["sub"]}</p>
      <div className="mt-6">
        <ServicesBoard messages={dict} locale={locale} />
      </div>
    </div>
  );
}
