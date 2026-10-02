"use client";

import { useState } from "react";

/* Mode B — public customs-clearance-only intake. Quick Service Order:
   minimum fields first (who + port + B/L + what), documents follow. */

export default function CustomsForm({ messages }: { messages: Record<string, string> }) {
  const t = (k: string) => messages[k] ?? k;
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [importerName, setImporterName] = useState("");
  const [entryPort, setEntryPort] = useState("");
  const [blAwbNo, setBlAwbNo] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [hts, setHts] = useState("");
  const [quantity, setQuantity] = useState("");
  const [valueUsd, setValueUsd] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [hasBond, setHasBond] = useState(false);
  const [needsBond, setNeedsBond] = useState(false);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [soNo, setSoNo] = useState("");
  const [err, setErr] = useState("");

  const inputCls =
    "w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
  const labelCls = "mb-1 block text-[12.5px] font-bold text-ink-soft";
  const req = <span className="text-brand"> *</span>;

  const field = (
    label: string, value: string, set: (v: string) => void,
    opts?: { required?: boolean; ph?: string; type?: string }
  ) => (
    <div>
      <label className={labelCls}>{label}{opts?.required ? req : null}</label>
      <input value={value} onChange={(e) => set(e.target.value)} placeholder={opts?.ph} type={opts?.type ?? "text"} className={inputCls} />
    </div>
  );

  const submit = async () => {
    if (sending || soNo) return;
    setErr("");
    if (!name.trim() || !entryPort.trim() || !blAwbNo.trim() || !productDesc.trim()) {
      setErr(t("errRequired")); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErr(t("errEmail")); return;
    }
    setSending(true);
    try {
      const r = await fetch("/api/public/service-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          service: "customs",
          name: name.trim(), company: company.trim(), email: email.trim(), phone: phone.trim(),
          intake: {
            importer_name: importerName.trim(), entry_port: entryPort.trim(),
            bl_awb_no: blAwbNo.trim(), invoice_no: invoiceNo.trim(),
            product_desc: productDesc.trim(), hts: hts.trim(),
            quantity: quantity.trim(), value_usd: valueUsd.trim(),
            arrival_date: arrivalDate.trim(), has_bond: hasBond, needs_bond: needsBond,
            notes: notes.trim(),
          },
        }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error);
      setSoNo(d.so_no);
    } catch {
      setErr(t("errFailed"));
    } finally {
      setSending(false);
    }
  };

  if (soNo) {
    return (
      <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ok-tint">
          <svg viewBox="0 0 16 16" className="h-6 w-6 text-ok" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3.2 3.2L13 5" /></svg>
        </div>
        <h3 className="text-[18px] font-bold text-ink">{t("successTitle")}</h3>
        <p className="mx-auto mt-2 max-w-md text-[14px] text-ink-soft">{t("successBody").replace("%SO%", soNo)}</p>
        <p className="mt-4 inline-block rounded-lg bg-brand-tint px-4 py-2 font-mono text-[15px] font-bold text-brand">{soNo}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-card lg:p-8">
      <p className="mb-6 rounded-xl bg-brand-tint/60 px-4 py-3 text-[13px] font-medium text-ink-soft">{t("quickNote")}</p>
      <h3 className="mb-4 text-[15px] font-bold text-ink">{t("secContact")}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {field(t("name"), name, setName, { required: true })}
        {field(t("company"), company, setCompany)}
        {field(t("email"), email, setEmail, { required: true, type: "email" })}
        {field(t("phone"), phone, setPhone)}
      </div>
      <h3 className="mb-4 mt-8 text-[15px] font-bold text-ink">{t("secShipment")}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {field(t("importerName"), importerName, setImporterName, { ph: t("importerNamePh") })}
        {field(t("entryPort"), entryPort, setEntryPort, { required: true, ph: t("entryPortPh") })}
        {field(t("blAwbNo"), blAwbNo, setBlAwbNo, { required: true, ph: t("blAwbNoPh") })}
        {field(t("invoiceNo"), invoiceNo, setInvoiceNo, { ph: t("invoiceNoPh") })}
        <div className="sm:col-span-2">
          <label className={labelCls}>{t("productDesc")}{req}</label>
          <textarea value={productDesc} onChange={(e) => setProductDesc(e.target.value)} placeholder={t("productDescPh")} rows={2} className={inputCls} />
        </div>
        {field(t("hts"), hts, setHts, { ph: t("htsPh") })}
        {field(t("quantity"), quantity, setQuantity, { ph: t("quantityPh") })}
        {field(t("valueUsd"), valueUsd, setValueUsd, { ph: t("valueUsdPh"), type: "number" })}
        {field(t("arrivalDate"), arrivalDate, setArrivalDate, { type: "date" })}
      </div>
      <div className="mt-4 flex flex-wrap gap-6">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[14px] font-medium text-ink-soft">
          <input type="checkbox" checked={hasBond} onChange={(e) => { setHasBond(e.target.checked); if (e.target.checked) setNeedsBond(false); }} className="h-4 w-4 accent-brand" />
          {t("hasBond")}
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[14px] font-medium text-ink-soft">
          <input type="checkbox" checked={needsBond} onChange={(e) => { setNeedsBond(e.target.checked); if (e.target.checked) setHasBond(false); }} className="h-4 w-4 accent-brand" />
          {t("needsBond")}
        </label>
      </div>
      <div className="mt-4">
        <label className={labelCls}>{t("notes")}</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPh")} rows={3} className={inputCls} />
      </div>
      <p className="mt-6 text-[12.5px] text-faint">{t("requiredHint")}</p>
      {err && <p className="mt-3 text-[13.5px] font-semibold text-err">{err}</p>}
      <button onClick={submit} disabled={sending}
        className="mt-4 w-full rounded-xl bg-brand px-6 py-3 text-[15px] font-bold text-white transition hover:brightness-110 disabled:opacity-60 sm:w-auto sm:px-10">
        {sending ? t("sending") : t("submit")}
      </button>
    </div>
  );
}
