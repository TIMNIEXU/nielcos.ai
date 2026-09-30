import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NewEntryForm from "./NewEntryForm";
import { intlLocale } from "@/lib/locale";

type Props = { params: Promise<{ locale: string }> };

const STATUS_TONE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  classifying: "bg-blue-50 text-blue-700",
  packet_ready: "bg-violet-50 text-violet-700",
  filed: "bg-amber-50 text-amber-700",
  released: "bg-emerald-50 text-emerald-700",
};

export default async function CustomsList({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("app");

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  const { data: entries } = await sb
    .from("customs_entries")
    .select("id, entry_no, importer_name, status, updated_at")
    .order("updated_at", { ascending: false });
  const { data: shipments } = await sb
    .from("shipments")
    .select("id, gttid, container_number")
    .order("updated_at", { ascending: false })
    .limit(200);

  const labels = Object.fromEntries(
    ["newEntry","entryNo","entryNoHint","importer","linkedShipment","noShipment","status","entriesEmpty","cancel","openEntry",
     "stDraft","stClassifying","stPacketReady","stFiled","stReleased"].map((k) => [k, t(k)])
  );
  const statusName = (s: string) =>
    ({ draft: t("stDraft"), classifying: t("stClassifying"), packet_ready: t("stPacketReady"), filed: t("stFiled"), released: t("stReleased") } as Record<string, string>)[s] ?? s;

  return (
    <section className="min-h-[75vh] bg-brand-tint-soft">
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-brand uppercase">
              <Link href={`/${locale}/app`} className="hover:underline">{t("workspace")}</Link>
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">{t("customs")}</h1>
            <p className="mt-1 text-ink-soft">{t("customsSub")}</p>
          </div>
          <NewEntryForm locale={locale} shipments={shipments ?? []} labels={labels} />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {(entries ?? []).length === 0 && (
            <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-ink-soft md:col-span-2">
              {t("entriesEmpty")}
            </div>
          )}
          {(entries ?? []).map((e) => (
            <Link
              key={e.id}
              href={`/${locale}/app/customs/${e.id}`}
              className="group rounded-2xl border border-line bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-24px_rgba(29,78,216,0.5)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-lg font-bold text-ink">
                    {e.entry_no || t("stDraft")}
                  </p>
                  {e.importer_name && <p className="mt-0.5 text-sm text-ink-soft">{e.importer_name}</p>}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONE[e.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {statusName(e.status)}
                </span>
              </div>
              <p className="mt-3 text-xs text-ink-soft">
                {new Date(e.updated_at).toLocaleDateString(intlLocale(locale))}
                <span className="ml-2 font-bold text-brand-deep group-hover:underline">{t("openEntry")} →</span>
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
