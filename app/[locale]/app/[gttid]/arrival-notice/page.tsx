import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "./PrintButton";

type Props = { params: Promise<{ locale: string; gttid: string }> };

type Charge = { description: string; amount: number };

type Cntr = {
  container?: string;
  seal?: string;
  type?: string;
  packages?: string;
  weight_kgs?: number | null;
  cbm?: number | null;
  po_no?: string;
  pickup_no?: string;
};

/* ---------- forwarder-style boxed cells (AGI layout) ---------- */

function PartyBox({ label, name, addr }: { label: string; name?: string; addr?: string }) {
  return (
    <div className="border-b border-slate-900 px-2 py-1.5">
      <p className="text-[9px] font-bold tracking-wider text-slate-500 uppercase">{label}</p>
      <p className="mt-0.5 text-[12px] leading-snug font-bold text-slate-900">
        {name || <span className="text-slate-300">—</span>}
      </p>
      {addr && (
        <p className="mt-0.5 text-[11px] leading-snug whitespace-pre-line text-slate-800">{addr}</p>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
  red = false,
  className = "",
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  red?: boolean;
  className?: string;
}) {
  return (
    <div className={`px-2 py-1.5 ${className}`}>
      <p className="text-[9px] font-bold tracking-wider text-slate-500 uppercase">{label}</p>
      <p
        className={`mt-0.5 text-[12px] leading-snug font-bold ${
          red ? "text-[#c00]" : "text-slate-900"
        } ${mono ? "font-mono" : ""}`}
      >
        {value || <span className="font-normal text-slate-300">—</span>}
      </p>
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
    v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const cntrs = (Array.isArray(n.containers) ? n.containers : []).filter(
    (c: unknown) => c && (c as Cntr).container
  ) as Cntr[];
  const sumPkgs = cntrs.reduce((s, c) => s + (parseFloat(String(c.packages)) || 0), 0);
  const sumKgs = cntrs.reduce((s, c) => s + (Number(c.weight_kgs) || 0), 0);
  const sumCbm = cntrs.reduce((s, c) => s + (Number(c.cbm) || 0), 0);
  const lbs = (kgs: number) => (kgs * 2.20462).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const cft = (cbm: number) => (cbm * 35.3147).toLocaleString("en-US", { maximumFractionDigits: 2 });

  return (
    <section className="min-h-[75vh] bg-slate-200/60">
      <style>{`@media print {
        body > header, body > footer, .no-print { display: none !important; }
        section { background: #fff !important; padding: 0 !important; }
        .print-doc { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
      }`}</style>

      <div className="no-print mx-auto flex max-w-4xl items-center justify-between px-5 pt-8 lg:px-8">
        <Link href={`/${locale}/app/${encodeURIComponent(gttid)}`} className="text-sm font-semibold text-brand hover:underline">
          {t("backToShipment")}
        </Link>
        <PrintButton label={t("print")} />
      </div>

      <div className="mx-auto max-w-4xl px-5 py-8 lg:px-8">
        <article className="print-doc bg-white text-slate-900">
          {/* ===== Header ===== */}
          <div className="flex items-stretch justify-between border-2 border-slate-900">
            <div className="px-3 py-2">
              <img src="/joma-logo.png" alt="Joma Logistics Incorporated" className="h-11 w-auto" />
              <p className="mt-1 text-[11px] leading-snug font-semibold text-slate-800">
                70 CARTER DR. EDISON, NJ 08817
                <br />
                TEL: 1-732-338-8098&nbsp;&nbsp;FAX: 1-888-302-0636
                <br />
                EMAIL: tim@jomainc.com
              </p>
              {n.prepared_by && (
                <p className="mt-1 text-[10px] text-slate-600">Prepared by {n.prepared_by}</p>
              )}
            </div>
            <div className="flex items-center border-l-2 border-slate-900 px-8">
              <p className="text-center text-[22px] leading-tight font-black tracking-wide text-[#1d4ed8]">
                ARRIVAL NOTICE /<br />
                FREIGHT INVOICE
              </p>
            </div>
          </div>

          {/* ===== Body: parties (left) + transport (right) ===== */}
          <div className="grid grid-cols-12 border-2 border-t-0 border-slate-900">
            {/* Left column */}
            <div className="col-span-5 border-r-2 border-slate-900">
              <PartyBox label="Shipper" name={n.shipper_name} addr={n.shipper_address} />
              <PartyBox label="Consignee" name={n.consignee_name} addr={n.consignee_address} />
              <PartyBox
                label="Notify Party"
                name={n.notify_name || n.consignee_name}
                addr={n.notify_address || n.consignee_address}
              />
              <PartyBox
                label="Customs Broker"
                name={n.customs_broker_name}
                addr={n.customs_broker_address}
              />
              <div className="grid grid-cols-3 border-b border-slate-900">
                <Field label="I.T. No." value={n.it_no} mono className="border-r border-slate-900" />
                <Field label="I.T. Place" value={n.it_place} className="border-r border-slate-900" />
                <Field label="I.T. Date" value={n.it_date} mono />
              </div>
              <div className="grid grid-cols-3">
                <Field
                  label="Available Date"
                  value={n.available_date}
                  mono
                  className="border-r border-slate-900"
                />
                <Field
                  label="Last Free Date"
                  value={n.last_free_date}
                  mono
                  className="border-r border-slate-900"
                />
                <Field label="G.O. Date" value={n.go_date} mono />
              </div>
            </div>

            {/* Right column */}
            <div className="col-span-7">
              <div className="grid grid-cols-2 border-b border-slate-900">
                <Field label="Master B/L No." value={n.mbl_no} mono className="border-r border-slate-900" />
                <Field label="House B/L No." value={n.hbl_no} mono />
              </div>
              <div className="grid grid-cols-2 border-b border-slate-900">
                <Field label="File No." value={n.file_no} mono className="border-r border-slate-900" />
                <Field label="P.O. No." value={n.po_no} mono />
              </div>
              <div className="grid grid-cols-2 border-b border-slate-900">
                <Field label="AMS B/L No." value={n.ams_bl_no} mono className="border-r border-slate-900" />
                <Field label="ISF No." value={n.isf_no} mono />
              </div>
              <div className="grid grid-cols-2 border-b border-slate-900">
                <Field label="Vessel Info." value={n.vessel_voyage} className="border-r border-slate-900" />
                <Field label="Sub B/L No." value={n.sub_bl_no} mono />
              </div>
              <div className="grid grid-cols-2 border-b border-slate-900">
                <Field label="Place of Receipt" value={n.place_of_receipt} className="border-r border-slate-900" />
                <Field label="ETD" value={n.etd} mono />
              </div>
              <div className="grid grid-cols-2 border-b border-slate-900">
                <Field label="Port of Loading" value={n.port_of_loading} className="border-r border-slate-900" />
                <Field label="ETD" value={n.etd} mono />
              </div>
              <div className="grid grid-cols-2 border-b border-slate-900">
                <Field label="Port of Discharge" value={n.port_of_discharge} className="border-r border-slate-900" />
                <Field label="ETA" value={n.eta} mono />
              </div>
              <div className="grid grid-cols-2 border-b border-slate-900">
                <Field label="Place of Delivery" value={n.place_of_delivery} className="border-r border-slate-900" />
                <Field label="Delivery ETA" value={n.delivery_eta} mono />
              </div>
              <div className="grid grid-cols-2 border-b border-slate-900">
                <Field label="Final Destination" value={n.place_of_delivery} className="border-r border-slate-900" />
                <Field label="F.Dest ETA" value={n.delivery_eta} mono />
              </div>
              <div className="grid grid-cols-2 border-b border-slate-900">
                <Field label="CY Location" value={n.cy_location} className="border-r border-slate-900" />
                <Field label="FIRMS Code" value={n.cy_firms_code} mono />
              </div>
              <div className="grid grid-cols-2 border-b border-slate-900">
                <Field label="Freight Pickup Location" value={n.pickup_location} className="border-r border-slate-900" />
                <Field label="FIRMS Code" value={n.pickup_firms_code} mono />
              </div>
              <div className="grid grid-cols-2">
                <Field label="Cntr Return Location" value={n.cntr_return_location} className="border-r border-slate-900" />
                <Field label="FIRMS Code" value="" mono />
              </div>
            </div>
          </div>

          {/* ===== Cargo table ===== */}
          <table className="w-full border-2 border-t-0 border-slate-900 text-[11px]">
            <thead>
              <tr className="border-b border-slate-900 text-left">
                <th className="border-r border-slate-900 px-2 py-1.5 align-top text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                  Container No./Seal No./P.O. No./Pick-up No.
                  <br />
                  Marks &amp; Numbers
                </th>
                <th className="border-r border-slate-900 px-2 py-1.5 align-top text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                  No. of Packages
                  <br />
                  No. of Containers
                </th>
                <th className="border-r border-slate-900 px-2 py-1.5 align-top text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                  Description of Goods
                </th>
                <th className="border-r border-slate-900 px-2 py-1.5 align-top text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                  Weight
                </th>
                <th className="px-2 py-1.5 align-top text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                  Measurement
                </th>
              </tr>
            </thead>
            <tbody>
              {cntrs.map((c, i) => (
                <tr key={i} className="border-b border-slate-900 align-top">
                  <td className="border-r border-slate-900 px-2 py-1.5 font-mono text-[12px] font-bold">
                    {c.container}
                    {c.seal && <span className="text-slate-700"> / {c.seal}</span>}
                    {c.po_no && <span className="text-slate-700"> / {c.po_no}</span>}
                    {c.pickup_no && <span className="text-slate-700"> / {c.pickup_no}</span>}
                  </td>
                  <td className="border-r border-slate-900 px-2 py-1.5 text-center font-bold">
                    {c.packages ? `${c.packages} PACKAGE(S)` : "—"}
                    <br />
                    <span className="font-mono">{c.type || ""}</span>
                  </td>
                  <td className="border-r border-slate-900 px-2 py-1.5">
                    {n.marks_numbers && <p className="font-bold">{n.marks_numbers}</p>}
                    <p className="whitespace-pre-line">{n.description_of_goods || "—"}</p>
                    {n.release_terms && <p className="mt-1 font-bold">{n.release_terms}</p>}
                  </td>
                  <td className="border-r border-slate-900 px-2 py-1.5 text-right font-mono">
                    {c.weight_kgs ? (
                      <>
                        {Number(c.weight_kgs).toLocaleString()} KGS
                        <br />
                        {lbs(Number(c.weight_kgs))} LBS
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {c.cbm ? (
                      <>
                        {Number(c.cbm).toLocaleString()} CBM
                        <br />
                        {cft(Number(c.cbm))} CFT
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {cntrs.length > 0 && (
                <tr className="border-b border-slate-900 align-top font-bold">
                  <td className="border-r border-slate-900 px-2 py-1.5">Total ({cntrs.length})</td>
                  <td className="border-r border-slate-900 px-2 py-1.5 text-center">
                    {sumPkgs ? sumPkgs.toLocaleString() : "—"}
                  </td>
                  <td className="border-r border-slate-900 px-2 py-1.5"></td>
                  <td className="border-r border-slate-900 px-2 py-1.5 text-right font-mono">
                    {sumKgs ? (
                      <>
                        {sumKgs.toLocaleString()} KGS
                        <br />
                        {lbs(sumKgs)} LBS
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {sumCbm ? (
                      <>
                        {sumCbm.toLocaleString()} CBM
                        <br />
                        {cft(sumCbm)} CFT
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ===== Bottom: remark + invoice ===== */}
          <div className="grid grid-cols-12 border-2 border-t-0 border-slate-900">
            <div className="col-span-7 border-r-2 border-slate-900 px-2 py-1.5">
              <p className="text-[9px] font-bold tracking-wider text-slate-500 uppercase">Remark</p>
              <p className="mt-1 text-[11px] leading-relaxed whitespace-pre-line text-slate-800">
                {n.remarks || "Please make check payable to JOMA LOGISTICS INCORPORATED."}
              </p>
            </div>
            <div className="col-span-5">
              <div className="flex items-center justify-between border-b border-slate-900 px-2 py-1.5">
                <p className="text-[12px] font-black text-[#c00]">
                  INVOICE NO.: <span className="font-mono">{n.invoice_no || n.notice_no}</span>
                </p>
                <p className="text-[12px] font-black text-[#c00]">
                  DUE DATE: <span className="font-mono">{n.due_date || "—"}</span>
                </p>
              </div>
              <div className="grid grid-cols-2 border-b border-slate-900 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                <p className="border-r border-slate-900 px-2 py-1">Description of Charges</p>
                <p className="px-2 py-1 text-right">Amount</p>
              </div>
              {charges.map((c, i) => (
                <div
                  key={i}
                  className="grid grid-cols-2 border-b border-slate-200 text-[12px] font-semibold"
                >
                  <p className="border-r border-slate-200 px-2 py-1">{c.description || "—"}</p>
                  <p className="px-2 py-1 text-right font-mono">{money(Number(c.amount) || 0)}</p>
                </div>
              ))}
              <div className="grid grid-cols-2 border-b border-slate-900 text-[12px] font-black">
                <p className="border-r border-slate-900 px-2 py-1.5">TOTAL DUE</p>
                <p className="px-2 py-1.5 text-right font-mono">{money(total)}</p>
              </div>
              <div className="grid grid-cols-2 text-[12px] font-black">
                <p className="border-r border-slate-900 px-2 py-1.5">PLEASE PAY THIS AMOUNT {cur}</p>
                <p className="px-2 py-1.5 text-right font-mono">{money(total)}</p>
              </div>
            </div>
          </div>

          <p className="mt-2 text-[10px] text-slate-500">
            GTTID: <span className="font-mono">{shipment.gttid}</span> · Joma Logistics Inc · FMC OTI
            #033998 · {n.notice_no}
            {n.free_time_text ? ` · Free time: ${n.free_time_text}` : ""}
          </p>
        </article>
      </div>
    </section>
  );
}
