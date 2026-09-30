"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/* GRI-001 V4a — unified public RFQ form.
   One form for customs / freight / drayage / warehouse / insurance / bond.
   POSTs to /api/public/service-quote (triage lead). No invented prices —
   a real person replies with a real quote. */

const SERVICES = ["customs", "freight", "drayage", "warehouse", "insurance", "bond"] as const;

export default function QuoteForm({
  locale,
  defaultService,
  defaultCargo,
}: {
  locale: string;
  defaultService?: string;
  defaultCargo?: string;
}) {
  const t = useTranslations("quotes");
  const [service, setService] = useState(
    SERVICES.includes(defaultService as any) ? defaultService! : "customs"
  );
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [cargo, setCargo] = useState(defaultCargo ?? "");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const inputCls =
    "w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
  const labelCls = "mb-1 block text-[12.5px] font-bold text-ink-soft";

  const submit = async () => {
    if (sending || sent) return;
    setErr("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErr(t("error"));
      return;
    }
    setSending(true);
    try {
      const v = parseFloat(value.replace(/[^0-9.\-]/g, ""));
      const r = await fetch("/api/public/service-quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          service, name: name.trim(), company: company.trim(), email: email.trim(),
          phone: phone.trim(), origin: origin.trim(), destination: destination.trim(),
          cargo: cargo.trim(), value_usd: Number.isFinite(v) && v >= 0 ? v : null,
          message: message.trim(),
        }),
      });
      if ((await r.json()).ok) setSent(true);
      else setErr(t("error"));
    } catch {
      setErr(t("error"));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-card sm:p-10">
        <p className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ok-tint text-2xl text-ok">✓</p>
        <h3 className="mt-4 text-[20px] font-bold text-ink">{t("sentTitle")}</h3>
        <p className="mx-auto mt-2 max-w-md text-[14px] text-muted">{t("sentSub")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>{t("serviceLabel")}</label>
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((s) => (
              <button
                key={s} type="button" onClick={() => setService(s)}
                className={`rounded-full px-4 py-2 text-[13px] font-bold transition-all ${service === s ? "bg-brand text-white" : "border border-line text-ink-soft hover:border-brand"}`}
              >
                {t(`svc_${s}`)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>{t("nameLabel")}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("companyLabel")}</label>
          <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("emailLabel")} *</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("phoneLabel")}</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("originLabel")}</label>
          <input value={origin} onChange={(e) => setOrigin(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("destLabel")}</label>
          <input value={destination} onChange={(e) => setDestination(e.target.value)} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>{t("cargoLabel")}</label>
          <input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder={t("cargoPh")} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("valueLabel")}</label>
          <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("messageLabel")}</label>
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("messagePh")} className={inputCls} />
        </div>
      </div>
      {err && <p className="mt-4 text-[13px] font-semibold text-risk">{err}</p>}
      <button
        type="button" onClick={() => submit()} disabled={sending}
        className="mt-6 w-full rounded-full bg-brand px-8 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(29,78,216,0.8)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep disabled:opacity-40 sm:w-auto"
      >
        {sending ? t("sending") : `${t("submit")} →`}
      </button>
    </div>
  );
}
