import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FinanceBoard from "./FinanceBoard";

export default async function FinancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/app/finance`);

  // Pre-translate without params (plain string lookup, no ICU placeholders).
  // Namespace "finance" at message root, same convention as suppliers/products/logistics.
  const t = await getTranslations({ locale, namespace: "finance" });
  const keys = [
    "title", "sub",
    "tabCost", "tabForecast", "tabPayables",
    "searchPh", "addSheet", "addPayable",
    "statSheets", "statLandedTotal", "statDraft",
    "statOverdue", "statDue7", "statDue30",
    "thTitle", "thEta", "thItems", "thTotal", "thActions",
    "thPayee", "thCategory", "thAmount", "thDue", "thStatus",
    "emptySheets", "emptyItems", "emptyPayables", "emptyForecast",
    "status_draft", "status_final",
    "pay_pending", "pay_paid", "pay_cancelled", "pay_overdue",
    "cat_goods", "cat_freight", "cat_insurance", "cat_duty", "cat_drayage",
    "cat_warehouse", "cat_demurrage", "cat_supplier", "cat_other",
    "markPaid", "edit", "delete", "cancel", "save",
    "deleteConfirmSheet", "deleteConfirmPayable", "deleteConfirmItem",
    "editTitleSheet", "addTitleSheet", "editTitlePayable", "addTitlePayable",
    "fTitle", "fGttid", "fCurrency", "fEta", "fStatus", "fNotes",
    "fPayee", "fCategory", "fAmount", "fDueDate",
    "titleRequired", "payeeRequired", "amountInvalid", "saveFailed",
    "sheetItems", "addItem", "fItemLabel", "fItemAmount",
    "grandTotal", "finalize", "reopen",
    "dutyEstimator", "fHts", "fOrigin", "fCargoValue",
    "estimateDuty", "dutyNotFound", "dutyHint", "estimatorInputErr",
    "dutyMfn", "dutyAmount", "addDutyItem", "dutyItemLabel", "estimating",
    "forecastSub", "forecastHint",
    "paySub", "filterAll", "perCurrencyNote",
  ];
  const dict: Record<string, string> = {};
  for (const k of keys) dict[k] = t(k);

  return (
    <main className="min-h-screen bg-page pb-16 pt-8">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link href={`/${locale}/app`}
            className="rounded-full border border-line bg-white px-4 py-1.5 text-sm font-bold text-ink-soft transition-colors hover:border-brand hover:text-brand-deep">
            ← {locale === "zh-CN" ? "工作台" : "Workspace"}
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-ink md:text-3xl">{dict.title}</h1>
            <p className="mt-1 text-sm text-ink-soft">{dict.sub}</p>
          </div>
        </div>
        <FinanceBoard messages={dict} locale={locale} />
      </div>
    </main>
  );
}
