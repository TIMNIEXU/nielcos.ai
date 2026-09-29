import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ComplianceBoard from "./ComplianceBoard";

type Props = { params: Promise<{ locale: string }> };

const KEYS = [
  "title","sub","tabScreen","tabLogs","tabUpdates","screenName","screenNamePh","screenCountry",
  "screenCountryPh","screenBtn","screening","resultClear","resultReview","resultHit",
  "resultClearNote","resultReviewNote","resultHitNote","matchedVia","watchlistSize","loggedNote",
  "watchlist","importSeed","importing","importDone","addInternal","intNamePh","intCountryPh",
  "add","added","logsEmpty","logTime","logQuery","logResult","logMatch",
  "updatesEmpty","newUpdate","upTitle","upTitlePh","upBody","upBodyPh","upSource","upSourcePh",
  "upDate","publish","published","effective","seedAsOf",
];

export default async function CompliancePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("compliance");
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

  const dict: Record<string, string> = {};
  for (const k of KEYS) dict[k] = t(k);

  return (
    <section className="min-h-[75vh] bg-brand-tint-soft">
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <Link href={`/${locale}/app`} className="text-sm font-semibold text-brand hover:underline">
          ← {ta("back")}
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-ink-soft">{t("sub")}</p>
        <div className="mt-6">
          <ComplianceBoard t={dict} />
        </div>
      </div>
    </section>
  );
}
