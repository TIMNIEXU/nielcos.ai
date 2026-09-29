import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FreightBoard from "./FreightBoard";

type Props = { params: Promise<{ locale: string }> };

export default async function FreightPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("freight");
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

  const { data: shipments } = await sb
    .from("shipments")
    .select(
      "id, gttid, mbl_no, container_number, containers, status, origin, destination, current_location, eta, milestones, updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  const dict: Record<string, string> = {};
  for (const k of [
    "title","sub","tabTrack","tabAlerts","tabExceptions","trackPh","trackBtn","trackHint",
    "noResult","searching","mbl","containers","eta","milestones","viewShipment","createTicket",
    "alertsEmpty","newTicket","ticketShipment","ticketShipmentPh","ticketType","ticketTitle",
    "ticketTitlePh","ticketNote","ticketNotePh","submit","cancel","exceptionsEmpty",
    "statusOpen","statusInProgress","statusResolved","advance","resolve","reopen",
    "type_customs_hold","type_demurrage_risk","type_doc_missing","type_schedule_delay",
    "type_damage_claim","type_other","alert_on_hold","alert_overdue_eta","alert_eta_soon",
    "alert_stale","ticketCreated","filterAll","linkedNone","needTitle",
  ]) {
    dict[k] = t(k);
  }
  const statusNames: Record<string, string> = {};
  for (const s of ["pending_pickup","at_port","in_transit","out_for_delivery","delivered","on_hold"]) {
    try { statusNames[s] = ta(`statusNames.${s}`); } catch { statusNames[s] = s; }
  }

  return (
    <section className="min-h-[75vh] bg-brand-tint-soft">
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <Link href={`/${locale}/app`} className="text-sm font-semibold text-brand hover:underline">
          ← {ta("back")}
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-ink-soft">{t("sub")}</p>
        <div className="mt-6">
          <FreightBoard
            t={dict}
            statusNames={statusNames}
            shipments={(shipments ?? []) as any[]}
            locale={locale}
          />
        </div>
      </div>
    </section>
  );
}
