import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogisticsBoard from "./LogisticsBoard";

export default async function LogisticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/app/logistics`);

  // Pre-translate without params (plain string lookup, no ICU placeholders).
  const t = await getTranslations({ locale, namespace: "app" });
  const keys = [
    "title", "sub",
    "tabMoves", "tabAppts", "tabDemurrage",
    "searchPh", "import", "addMove", "addAppt",
    "statInTransit", "statScheduled", "statCompleted", "statTodayAppts", "statTotalAppts",
    "thContainer", "thType", "thRoute", "thCarrier", "thScheduled", "thStatus", "thActions",
    "thWarehouse", "thApptTime", "thApptType",
    "emptyMoves", "emptyAppts", "emptyDemurrage",
    "move_pickup", "move_delivery", "move_reposition",
    "appt_inbound", "appt_outbound",
    "status_scheduled", "status_in_transit", "status_completed", "status_cancelled",
    "status_confirmed", "status_missed",
    "startMove", "completeMove", "edit", "delete",
    "deleteConfirmMove", "deleteConfirmAppt",
    "editTitleMove", "addTitleMove", "editTitleAppt", "addTitleAppt",
    "fContainer", "fMoveType", "fOrigin", "fDestination", "fMbl", "fGttid",
    "fCarrier", "fDriver", "fTruckPlate", "fScheduledDate", "fStatus",
    "fLastFreeDay", "fDemurrageRate", "fDetentionRate", "fNotes",
    "fWarehouse", "fAddress", "fApptAt", "fApptType", "fReference",
    "containerRequired", "warehouseRequired", "saveFailed", "cancel", "save",
    "importTitle", "importHint", "chooseFile", "importRun", "importDone", "importFailed",
    "demSub", "demContainer", "demMbl", "demLfd", "demDays", "demEstCost", "demCarrier",
    "demHint", "daysOverdue", "daysLeft", "statOverdue", "statDueSoon", "statExposure",
    "perDay",
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
        <LogisticsBoard messages={dict} locale={locale} />
      </div>
    </main>
  );
}
