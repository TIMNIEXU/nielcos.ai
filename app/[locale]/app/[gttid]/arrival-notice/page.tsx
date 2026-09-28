import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "./PrintButton";

type Props = { params: Promise<{ locale: string; gttid: string }> };

type Charge = { description: string; amount: number };

function Row({ k, v, mono = false }: { k: string; v?: string | null; mono?: boolean }) {
  if (!v) return null;
  return (
    <div>
      <dt className="text-[10px] font-bold tracking-[0.14em] text-slate-500 uppercase">{k}</dt>
      <dd className={`mt-0.5 text-[14px] font-semibold text-slate-900 ${mono ? "font-mono" : ""}`}>{v}</dd>
    </div>
  );
}

export default async function ArrivalNoticePage({ params }: Props) {
  const { locale, gttid } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("app");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect({ href: "/login", locale });
  }
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  const { data: profile } = await sb.from("profiles").select("company_id").eq("id", user!.id).single();
  if (!profile) redirect({ href: "/login", locale });

  const { data: shipment } = await sb
    .from("shipments")
    .select("*")
    .eq("gttid", decodeURIComponent(gttid))
    .single();
  if (!shipment) redirect({ href: "/app", locale });

  // RLS: only issued notices of the customer's own company are readable.
  // Match by shipment, or by container number inside a multi-container notice.
  const { data: noticeRows } = await sb
    .from("arrival_notices")
    .select("*")
    .eq("status", "issued");
  const n =
    (noticeRows ?? []).find(
      (r: { shipment_id: string; containers?: unknown }) =>
        r.shipment_id === shipment.id ||
        (Array.isArray(r.containers) &&
          r.containers.some(
            (c: { container?: string }) =>
              c.container && c.container.toUpperCase() === shipment.container_number.toUpperCase()
          ))
    ) ?? null;
  if (!n) redirect({ href: `/app/${encodeURIComponent(gttid)}`, locale });

  const charges = (Array.isArray(n.charges) ? n.charges : []) as Charge[];
  const total = charges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const cur = n.currency || "USD";
  const money = (v: number) =>
    `${cur} ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  type Cntr = { container?: string; seal?: string; type?: string; packages?: string; weight_kgs?: number | null; cbm?: number | null };
  const cntrs = (Array.isArray(n.containers) ? n.containers : []).filter(
    (c: unknown) => c && (c as Cntr).container
  ) as Cntr[];
  const sumPkgs = cntrs.reduce((s, c) => s + (parseFloat(String(c.packages)) || 0), 0);
  const sumKgs = cntrs.reduce((s, c) => s + (Number(c.weight_kgs) || 0), 0);
  const sumCbm = cntrs.reduce((s, c) => s + (Number(c.cbm) || 0), 0);

  return (
    <section className="min-h-[75vh] bg-slate-200/60">
      <style>{`@media print {
        body > header, body > footer, .no-print { display: none !important; }
        section { background: #fff !important; }
        .print-doc { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; border: none !important; }
      }`}</style>

      <div className="no-print mx-auto flex max-w-4xl items-center justify-between px-5 pt-8 lg:px-8">
        <Link href={`/${locale}/app/${encodeURIComponent(gttid)}`} className="text-sm font-semibold text-brand hover:underline">
          {t("backToShipment")}
        </Link>
        <PrintButton label={t("print")} />
      </div>

      <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
        <article className="print-doc rounded-xl border border-slate-300 bg-white p-8 shadow-sm sm:p-10">
          {/* Letterhead */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
            <div>
              <img src="/joma-logo.png" alt="Joma Logistics Incorporated" className="h-14 w-auto sm:h-16" />
              <p className="mt-2 text-[12px] leading-relaxed text-slate-600">
                70 CARTER DR. EDISON, NJ 08817
                <br />
                Tel: 1-732-338-8098 · Fax: 1-888-302-0636 · Email: tim@jomainc.com
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black tracking-wide text-slate-900">ARRIVAL NOTICE</p>
              <p className="text-lg font-black tracking-wide text-slate-900">/ FREIGHT INVOICE</p>
              <p className="mt-1 font-mono text-sm font-bold text-brand">{n.notice_no}</p>
              {n.invoice_no && (
                <p className="mt-0.5 text-[12px] text-slate-600">{t("an.invoiceNo")}: <span className="font-mono font-semibold text-slate-800">{n.invoice_no}</span></p>
              )}
              {n.prepared_by && (
                <p className="mt-0.5 text-[12px] text-slate-600">{t("an.preparedBy")}: {n.prepared_by}</p>
              )}
            </div>
          </div>

          {/* Parties */}
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">{t("an.shipper")}</p>
              <p className="mt-1 font-bold text-slate-900">{n.shipper_name || "—"}</p>
              {n.shipper_address && <p className="mt-1 text-[13px] whitespace-pre-line text-slate-700">{n.shipper_address}</p>}
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">{t("an.consignee")}</p>
              <p className="mt-1 font-bold text-slate-900">{n.consignee_name || "—"}</p>
              {n.consignee_address && <p className="mt-1 text-[13px] whitespace-pre-line text-slate-700">{n.consignee_address}</p>}
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">{t("an.notify")}</p>
              <p className="mt-1 font-bold text-slate-900">{n.notify_name || n.consignee_name || "—"}</p>
              {(n.notify_address || n.consignee_address) && (
                <p className="mt-1 text-[13px] whitespace-pre-line text-slate-700">{n.notify_address || n.consignee_address}</p>
              )}
            </div>
          </div>

          {/* Transport */}
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-200 pt-6 sm:grid-cols-4">
            <Row k={t("an.mbl")} v={n.mbl_no} mono />
            <Row k={t("an.hbl")} v={n.hbl_no} mono />
            <Row k={t("an.vessel")} v={n.vessel_voyage} />
            {cntrs.length === 0 && <Row k={t("an.cntrSeal")} v={n.container_seal || shipment.container_number} mono />}
            <Row k={t("an.pol")} v={n.port_of_loading} />
            <Row k={t("an.pod")} v={n.port_of_discharge} />
            <Row k={t("an.delivery")} v={n.place_of_delivery} />
            <Row k={t("an.cy")} v={n.cy_location} />
            <Row k={t("an.etd")} v={n.etd} mono />
            <Row k={t("an.eta")} v={n.eta} mono />
            <Row k={t("an.deliveryEta")} v={n.delivery_eta} mono />
            <Row k={t("an.pickup")} v={n.pickup_location} />
          </dl>

          {/* Containers table */}
          {cntrs.length > 0 && (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">{t("an.tblTitle")}</p>
              <table className="mt-2 w-full text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] tracking-wider text-slate-500 uppercase">
                    <th className="py-2">{t("an.colCntr")}</th>
                    <th className="py-2">{t("an.colSeal")}</th>
                    <th className="py-2">{t("an.colType")}</th>
                    <th className="py-2 text-right">{t("an.colPkgs")}</th>
                    <th className="py-2 text-right">{t("an.colKgs")}</th>
                    <th className="py-2 text-right">{t("an.colCbm")}</th>
                  </tr>
                </thead>
                <tbody>
                  {cntrs.map((c, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2 font-mono font-semibold text-slate-900">{c.container}</td>
                      <td className="py-2 font-mono text-slate-700">{c.seal || "—"}</td>
                      <td className="py-2 text-slate-700">{c.type || "—"}</td>
                      <td className="py-2 text-right text-slate-800">{c.packages || "—"}</td>
                      <td className="py-2 text-right font-mono text-slate-800">
                        {c.weight_kgs ? Number(c.weight_kgs).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 text-right font-mono text-slate-800">
                        {c.cbm ? Number(c.cbm).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-2 text-slate-900" colSpan={3}>{t("an.totalRow")} ({cntrs.length})</td>
                    <td className="py-2 text-right text-slate-900">{sumPkgs ? sumPkgs.toLocaleString() : "—"}</td>
                    <td className="py-2 text-right font-mono text-slate-900">{sumKgs ? sumKgs.toLocaleString() : "—"}</td>
                    <td className="py-2 text-right font-mono text-slate-900">{sumCbm ? sumCbm.toLocaleString() : "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Cargo */}
          <div className="mt-6 border-t border-slate-200 pt-6">
            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">{t("an.goods")}</p>
            {n.description_of_goods && <p className="mt-1 text-[14px] whitespace-pre-line text-slate-800">{n.description_of_goods}</p>}
            <div className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-[13px] text-slate-700">
              {n.packages && <span>{t("an.packages")}: <b>{n.packages}</b></span>}
              {n.gross_weight_kg && <span>{t("an.weight")}: <b>{Number(n.gross_weight_kg).toLocaleString()} KGS</b></span>}
              {n.measurement_cbm && <span>{t("an.measure")}: <b>{Number(n.measurement_cbm).toLocaleString()} CBM</b></span>}
            </div>
          </div>

          {/* Charges */}
          {charges.length > 0 && (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">{t("an.charges")}</p>
              <table className="mt-2 w-full text-[14px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] tracking-wider text-slate-500 uppercase">
                    <th className="py-2">{t("an.charges")}</th>
                    <th className="py-2 text-right">{t("an.amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map((c, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2 text-slate-800">{c.description || "—"}</td>
                      <td className="py-2 text-right font-mono text-slate-900">{money(Number(c.amount) || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-900">{t("totalDue")}</p>
                <p className="font-mono text-xl font-black text-slate-900">{money(total)}</p>
              </div>
              {n.due_date && <p className="mt-1 text-right text-[13px] text-slate-600">{t("dueDate")}: {n.due_date}</p>}
            </div>
          )}

          {n.free_time_text && (
            <p className="mt-6 text-[13px] text-slate-700"><b>{t("an.freeTime")}:</b> {n.free_time_text}</p>
          )}
          {n.remarks && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">{t("an.remarks")}</p>
              <p className="mt-1 text-[13px] whitespace-pre-line text-slate-700">{n.remarks}</p>
            </div>
          )}

          <p className="mt-8 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-500">
            GTTID: <span className="font-mono">{shipment.gttid}</span> · Joma Logistics Inc · FMC OTI #033998
          </p>
        </article>
      </div>
    </section>
  );
}
