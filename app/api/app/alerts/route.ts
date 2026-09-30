import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { deriveAlerts, type AlertTemplates } from "@/lib/alerts";
import { routing } from "@/i18n/routing";

/* GET /api/app/alerts?locale=xx — the company's alert list, translated.
   Consumed by the dashboard, the control tower, and the notification bell. */
export async function GET(req: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: cid } = await sb.rpc("own_company_id");
  if (!cid) return NextResponse.json({ error: "no_company" }, { status: 400 });

  const q = new URL(req.url).searchParams.get("locale");
  const locale = (routing.locales as readonly string[]).includes(q ?? "")
    ? (q as string)
    : "en";

  const t = await getTranslations({ locale, namespace: "dash" });
  const tpl: AlertTemplates = {
    tDemurrage: t("alDemurrageT"),
    dDemurrageOverdue: t("alDemurrageOverdueD"),
    dDemurrageSoon: t("alDemurrageSoonD"),
    tPayable: t("alPayableT"),
    dPayableOverdue: t("alPayableOverdueD"),
    tAppt: t("alApptT"),
    dApptMissed: t("alApptMissedD"),
    tHold: t("alHoldT"),
    dHold: t("alHoldD"),
    tStale: t("alStaleT"),
    dStale: t("alStaleD"),
  };

  const alerts = await deriveAlerts(sb, cid as string, tpl, `/${locale}/app`);
  return NextResponse.json({ alerts });
}
