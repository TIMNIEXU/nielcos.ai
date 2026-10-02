"use client";

import { useState } from "react";

/* Mode B — public drayage intake form. Quick Service Order: minimum fields
   first (who + what box + where + when), enrich later. Posts to
   /api/public/service-order, which creates the SO immediately (quote_requested)
   plus a triage row. Messages arrive as a plain object (never a function). */

export default function DrayageForm({ messages }: { messages: Record<string, string> }) {
  const t = (k: string) => messages[k] ?? k;
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [containerNo, setContainerNo] = useState("");
  const [ssl, setSsl] = useState("");
  const [blNo, setBlNo] = useState("");
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [containerSize, setContainerSize] = useState("");
  const [weight, setWeight] = useState("");
  const [overweight, setOverweight] = useState(false);
  const [hazmat, setHazmat] = useState(false);
  const [lfd, setLfd] = useState("");
  const [neededDate, setNeededDate] = useState("");
  const [returnLocation, setReturnLocation] = useState("");
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
      <input
        value={value} onChange={(e) => set(e.target.value)}
        placeholder={opts?.ph} type={opts?.type ?? "text"}
        className={inputCls}
      />
    </div>
  );

  const submit = async () => {
    if (sending || soNo) return;
    setErr("");
    if (!name.trim() || !containerNo.trim() || !pickup.trim() || !delivery.trim()) {
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
          service: "drayage",
          name: name.trim(), company: company.trim(),
          email: email.trim(), phone: phone.trim(),
          intake: {
            container_no: containerNo.trim(), ssl: ssl.trim(), bl_no: blNo.trim(),
            pickup: pickup.trim(), delivery: delivery.trim(),
            container_size: containerSize.trim(), weight_lbs: weight.trim(),
            overweight, hazmat, lfd: lfd.trim(), needed_date: neededDate.trim(),
            return_location: returnLocation.trim(), notes: notes.trim(),
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
        <p className="mx-auto mt-2 max-w-md text-[14px] text-ink-soft">
          {t("successBody").replace("%SO%", soNo)}
        </p>
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
        {field(t("containerNo"), containerNo, setContainerNo, { required: true, ph: t("containerNoPh") })}
        {field(t("containerSize"), containerSize, setContainerSize, { ph: t("containerSizePh") })}
        {field(t("pickup"), pickup, setPickup, { required: true, ph: t("pickupPh") })}
        {field(t("delivery"), delivery, setDelivery, { required: true, ph: t("deliveryPh") })}
        {field(t("ssl"), ssl, setSsl, { ph: t("sslPh") })}
        {field(t("blNo"), blNo, setBlNo, { ph: t("blNoPh") })}
        {field(t("weight"), weight, setWeight, { ph: t("weightPh"), type: "number" })}
        {field(t("returnLocation"), returnLocation, setReturnLocation, { ph: t("returnLocationPh") })}
        {field(t("lfd"), lfd, setLfd, { type: "date" })}
        {field(t("neededDate"), neededDate, setNeededDate, { type: "date" })}
      </div>
      <div className="mt-4 flex flex-wrap gap-6">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[14px] font-medium text-ink-soft">
          <input type="checkbox" checked={overweight} onChange={(e) => setOverweight(e.target.checked)} className="h-4 w-4 accent-brand" />
          {t("overweight")}
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[14px] font-medium text-ink-soft">
          <input type="checkbox" checked={hazmat} onChange={(e) => setHazmat(e.target.checked)} className="h-4 w-4 accent-brand" />
          {t("hazmat")}
        </label>
      </div>
      <div className="mt-4">
        <label className={labelCls}>{t("notes")}</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPh")} rows={3} className={inputCls} />
      </div>

      <p className="mt-6 text-[12.5px] text-faint">{t("requiredHint")}</p>
      {err && <p className="mt-3 text-[13.5px] font-semibold text-err">{err}</p>}
      <button
        onClick={submit} disabled={sending}
        className="mt-4 w-full rounded-xl bg-brand px-6 py-3 text-[15px] font-bold text-white transition hover:brightness-110 disabled:opacity-60 sm:w-auto sm:px-10"
      >
        {sending ? t("sending") : t("submit")}
      </button>
    </div>
  );
}
