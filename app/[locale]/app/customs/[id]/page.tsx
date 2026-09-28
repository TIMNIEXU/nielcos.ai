import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import EntryDetail from "./EntryDetail";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function EntryPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("app");

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  const { data: entry } = await sb.from("customs_entries").select("*").eq("id", id).single();
  if (!entry) redirect({ href: `/${locale}/app/customs`, locale });
  const { data: lines } = await sb
    .from("entry_lines")
    .select("*")
    .eq("entry_id", id)
    .order("created_at", { ascending: true });
  const { data: rules } = await sb.from("pga_rules").select("hts_prefix, agency, agency_cn, note");
  const { data: shipments } = await sb
    .from("shipments")
    .select("id, gttid, container_number")
    .order("updated_at", { ascending: false })
    .limit(200);

  const keys = [
    "customs","entryNo","entryNoHint","importer","linkedShipment","noShipment","status",
    "stDraft","stClassifying","stPacketReady","stFiled","stReleased","lines","addLine",
    "lineDesc","qty","valueUsd","suggestHts","suggesting","candidates","useThis",
    "confirmedHts","dutyRate","addlPct","estDuty","totalValue","totalDuty","pgaFlags",
    "noPga","rateNote","milestones","addMilestone","milestoneLabel","milestoneNote",
    "notes","save","delete","back","confirmDeleteEntry","confirmDeleteLine","created",
    "matchScore","noCandidates","ruleBased","cancel",
  ];
  const labels = Object.fromEntries(keys.map((k) => [k, t(k)]));

  return (
    <section className="min-h-[75vh] bg-brand-tint-soft">
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <EntryDetail
          locale={locale}
          initialEntry={entry}
          initialLines={lines ?? []}
          pgaRules={rules ?? []}
          shipments={shipments ?? []}
          labels={labels}
        />
      </div>
    </section>
  );
}
