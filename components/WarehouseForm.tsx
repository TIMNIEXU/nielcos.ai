"use client";

import { useState } from "react";

/* Mode B — public warehouse-only intake. Quick Service Order:
   minimum fields first (who + where + what inbound + when). */

export default function WarehouseForm({ messages }: { messages: Record<string, string> }) {
  const t = (k: string) => messages[k] ?? k;
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [warehouseLocation, setWarehouseLocation] = useState("");
  const [inboundType, setInboundType] = useState<"container" | "truck">("container");
  const [inboundRef, setInboundRef] = useState("");
  const [pallets, setPallets] = useState("");
  const [cartons, setCartons] = useState("");
  const [skus, setSkus] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [receivingDate, setReceivingDate] = useState("");
  const [storageReq, setStorageReq] = useState("");
  const [handlingReq, setHandlingReq] = useState("");
  const [outboundInstructions, setOutboundInstructions] = useState("");
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
    if (!name.trim() || !warehouseLocation.trim() || !inboundRef.trim() || !receivingDate.trim()) {
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
          service: "warehouse",
          name: name.trim(), company: company.trim(), email: email.trim(), phone: phone.trim(),
          intake: {
            warehouse_location: warehouseLocation.trim(), inbound_type: inboundType,
            inbound_ref: inboundRef.trim(), pallets: pallets.trim(), cartons: cartons.trim(),
            skus: skus.trim(), weight_lbs: weightLbs.trim(), dimensions: dimensions.trim(),
            receiving_date: receivingDate.trim(), storage_req: storageReq.trim(),
            handling_req: handlingReq.trim(),
            outbound_instructions: outboundInstructions.trim(), notes: notes.trim(),
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
        {field(t("warehouseLocation"), warehouseLocation, setWarehouseLocation, { required: true, ph: t("warehouseLocationPh") })}
        <div>
          <label className={labelCls}>{t("inboundType")}</label>
          <div className="flex gap-2">
            {(["container", "truck"] as const).map((v) => (
              <button key={v} type="button" onClick={() => setInboundType(v)}
                className={`flex-1 rounded-xl border px-4 py-2.5 text-[14px] font-bold transition ${inboundType === v ? "border-brand bg-brand-tint text-brand" : "border-line bg-white text-ink-soft"}`}>
                {t(v === "container" ? "inboundContainer" : "inboundTruck")}
              </button>
            ))}
          </div>
        </div>
        {field(t("inboundRef"), inboundRef, setInboundRef, { required: true, ph: t("inboundRefPh") })}
        {field(t("receivingDate"), receivingDate, setReceivingDate, { required: true, type: "date" })}
        {field(t("pallets"), pallets, setPallets, { type: "number" })}
        {field(t("cartons"), cartons, setCartons, { type: "number" })}
        {field(t("skus"), skus, setSkus, { ph: t("skusPh") })}
        {field(t("weightLbs"), weightLbs, setWeightLbs, { ph: t("weightLbsPh"), type: "number" })}
        {field(t("dimensions"), dimensions, setDimensions, { ph: t("dimensionsPh") })}
        {field(t("storageReq"), storageReq, setStorageReq, { ph: t("storageReqPh") })}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>{t("handlingReq")}</label>
          <textarea value={handlingReq} onChange={(e) => setHandlingReq(e.target.value)} placeholder={t("handlingReqPh")} rows={2} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("outboundInstructions")}</label>
          <textarea value={outboundInstructions} onChange={(e) => setOutboundInstructions(e.target.value)} placeholder={t("outboundInstructionsPh")} rows={2} className={inputCls} />
        </div>
      </div>
      <div className="mt-4">
        <label className={labelCls}>{t("notes")}</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPh")} rows={2} className={inputCls} />
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
