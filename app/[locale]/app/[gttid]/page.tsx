import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DocPanel from "./DocPanel";

type Props = { params: Promise<{ locale: string; gttid: string }> };

const TONE: Record<string, string> = {
  pending_pickup: "bg-slate-100 text-slate-600",
  at_port: "bg-blue-50 text-blue-700",
  in_transit: "bg-brand-tint text-brand-deep",
  out_for_delivery: "bg-orange-50 text-orange-700",
  delivered: "bg-emerald-50 text-emerald-700",
  on_hold: "bg-red-50 text-red-700",
};

export default async function ShipmentDetail({ params }: Props) {
  const { locale, gttid } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("app");

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
  const uid = user!.id;

  const { data: profile } = await sb
    .from("profiles")
    .select("company_id")
    .eq("id", uid)
    .single();
  if (!profile) redirect({ href: "/login", locale });
  const companyId = profile!.company_id as string;

  const { data: shipment } = await sb
    .from("shipments")
    .select("*")
    .eq("gttid", decodeURIComponent(gttid))
    .single();

  if (!shipment) {
    return (
      <section className="mx-auto max-w-4xl px-5 py-20 text-center">
        <p className="text-lg text-ink-soft">{t("notFound")}</p>
        <Link href={`/${locale}/app`} className="mt-4 inline-block font-semibold text-brand">
          {t("back")}
        </Link>
      </section>
    );
  }

  const { data: docs } = await sb
    .from("documents")
    .select("*")
    .eq("shipment_id", shipment.id)
    .order("created_at", { ascending: false });

  const { data: arrivalRows } = await sb
    .from("arrival_notices")
    .select("shipment_id, notice_no, eta, charges, currency, containers")
    .eq("status", "issued");

  // A notice covers the shipment directly, or lists its container in a multi-container notice.
  const arrival = (arrivalRows ?? []).find(
    (r) =>
      r.shipment_id === shipment.id ||
      (Array.isArray(r.containers) &&
        r.containers.some(
          (c: { container?: string }) =>
            c.container && c.container.toUpperCase() === shipment.container_number.toUpperCase()
        ))
  ) ?? null;

  const statusName = (() => {
    try {
      return t(`statusNames.${shipment.status}`);
    } catch {
      return shipment.status;
    }
  })();

  const milestones: { at?: string | null; location?: string | null; label?: string | null }[] =
    shipment.milestones ?? [];

  return (
    <section className="min-h-[75vh] bg-brand-tint-soft">
      <div className="mx-auto max-w-4xl px-5 py-10 lg:px-8">
        <Link href={`/${locale}/app`} className="text-sm font-semibold text-brand hover:underline">
          {t("back")}
        </Link>

        <div className="mt-4 rounded-2xl border border-line bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] text-ink-soft/70 uppercase">
                {t("gttid")}
              </p>
              <h1 className="font-mono text-2xl font-bold text-ink sm:text-3xl">
                {shipment.gttid}
              </h1>
              <p className="mt-1 text-ink-soft">
                {t("container")}: <span className="font-semibold text-ink">{shipment.container_number}</span>
              </p>
            </div>
            <span className={`rounded-full px-4 py-1.5 text-sm font-bold ${TONE[shipment.status] ?? "bg-slate-100 text-slate-600"}`}>
              {statusName}
            </span>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line-soft pt-6 sm:grid-cols-4">
            {[
              [t("origin"), shipment.origin],
              [t("destination"), shipment.destination],
              [t("currentLocation"), shipment.current_location],
              [t("eta"), shipment.eta],
            ].map(([k, v]) => (
              <div key={k as string}>
                <dt className="text-[11px] font-bold tracking-[0.14em] text-ink-soft/70 uppercase">{k}</dt>
                <dd className="mt-1 font-semibold text-ink">{(v as string) || "—"}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-ink-soft/70">
            {t("updated")}: {shipment.updated_at ? new Date(shipment.updated_at).toLocaleString() : "—"}
          </p>
        </div>

        {milestones.length > 0 && (
          <div className="mt-6 rounded-2xl border border-line bg-white p-6 sm:p-8">
            <h2 className="text-lg font-bold text-ink">{t("milestones")}</h2>
            <ol className="mt-4">
              {milestones.map((m, i) => (
                <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
                  <span className="flex flex-col items-center">
                    <span className="h-3 w-3 rounded-full bg-brand ring-4 ring-brand-tint" />
                    {i < milestones.length - 1 && <span className="w-px flex-1 bg-line" />}
                  </span>
                  <div>
                    <p className="font-semibold text-ink">{m.label || "—"}</p>
                    <p className="text-sm text-ink-soft">
                      {[m.location, m.at ? new Date(m.at).toLocaleString() : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {arrival && (
          <div className="mt-6 rounded-2xl border border-line bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-ink">{t("arrivalNotice")}</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  <span className="font-mono font-semibold text-ink">{arrival.notice_no}</span>
                  {" · "}{t("arrivalHint")}
                </p>
              </div>
              <Link
                href={`/${locale}/app/${encodeURIComponent(gttid)}/arrival-notice`}
                className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep"
              >
                {t("viewPrint")}
              </Link>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-line bg-white p-6 sm:p-8">
          <h2 className="text-lg font-bold text-ink">{t("documents")}</h2>
          <DocPanel
            companyId={companyId}
            shipmentId={shipment.id}
            docs={docs ?? []}
          />
        </div>
      </div>
    </section>
  );
}
