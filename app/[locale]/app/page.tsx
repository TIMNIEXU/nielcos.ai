import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";
import ShipmentCards from "./ShipmentCards";

type Props = { params: Promise<{ locale: string }> };

export default async function AppHome({ params }: Props) {
  const { locale } = await params;
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
    .select("company_id, companies ( name )")
    .eq("id", uid)
    .single();

  const { data: shipments } = await sb
    .from("shipments")
    .select("gttid, container_number, mbl_no, containers, status, origin, destination, eta, updated_at")
    .order("updated_at", { ascending: false });

  const list = shipments ?? [];
  const inTransit = list.filter((s) =>
    ["in_transit", "at_port", "out_for_delivery", "pending_pickup"].includes(s.status)
  ).length;
  const delivered = list.filter((s) => s.status === "delivered").length;
  const attention = list.filter((s) => s.status === "on_hold").length;
  const companyName =
    (profile?.companies as { name?: string } | null)?.name ?? "";

  return (
    <section className="min-h-[75vh] bg-brand-tint-soft">
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-brand uppercase">
              {t("workspace")}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">
              {companyName || t("myShipments")}
            </h1>
            <p className="mt-1 text-ink-soft">{t("sub")}</p>
          </div>
          <SignOutButton label={t("signOut")} />
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { n: inTransit, label: t("inTransit"), tone: "text-brand" },
            { n: delivered, label: t("delivered"), tone: "text-emerald-600" },
            { n: attention, label: t("attention"), tone: "text-red-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-white p-5">
              <p className={`text-4xl font-bold ${s.tone}`}>{s.n}</p>
              <p className="mt-1 text-sm font-medium text-ink-soft">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink">{t("myShipments")}</h2>
          <Link
            href={`/${locale}/app/customs`}
            className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-tint"
          >
            {t("customs")} →
          </Link>
          <Link
            href={`/${locale}/app/freight`}
            className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-tint"
          >
            {t("freightNav")} →
          </Link>
          <Link
            href={`/${locale}/app/compliance`}
            className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-tint"
          >
            {t("complianceNav")} →
          </Link>
          <Link
            href={`/${locale}/app/documents`}
            className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-tint"
          >
            {t("documentsNav")} →
          </Link>
          <Link
            href={`/${locale}/app/products`}
            className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-tint"
          >
            {t("productsNav")} →
          </Link>
          <Link
            href={`/${locale}/app/suppliers`}
            className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-tint"
          >
            {t("suppliersNav")} →
          </Link>
          <Link
            href={`/${locale}/app/logistics`}
            className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-tint"
          >
            {t("logisticsNav")} →
          </Link>
          <Link
            href={`/${locale}/app/finance`}
            className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-tint"
          >
            {t("financeNav")} →
          </Link>
          <Link
            href={`/${locale}/app/assistant`}
            className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-tint"
          >
            {t("assistantNav")} →
          </Link>
          <Link
            href={`/${locale}/app/tower`}
            className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-tint"
          >
            {t("towerNav")} →
          </Link>
          <Link
            href={`/${locale}/app/executive`}
            className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-tint"
          >
            {t("executiveNav")} →
          </Link>
          <Link
            href={`/${locale}/app/integrations`}
            className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-tint"
          >
            {t("integrationsNav")} →
          </Link>
        </div>
        <div className="mt-4">
          {list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-ink-soft">
              {t("empty")}
            </div>
          ) : (
            <ShipmentCards shipments={list} locale={locale} />
          )}
        </div>
      </div>
    </section>
  );
}
