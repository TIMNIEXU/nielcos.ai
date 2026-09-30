"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const COVERAGES = ["marine", "warehouse", "contingent", "stock"] as const;

export default function InsuranceQuoteForm() {
  const t = useTranslations("insurance");
  const [state, setState] = useState<"idle" | "sending" | "done" | "fail">(
    "idle"
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending" || state === "done") return;
    setState("sending");
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      company: fd.get("company"),
      email: fd.get("email"),
      phone: fd.get("phone"),
      cargo_value: fd.get("cargo_value"),
      currency: fd.get("currency"),
      origin: fd.get("origin"),
      destination: fd.get("destination"),
      mode: fd.get("mode"),
      coverage: fd.get("coverage"),
      message: fd.get("message"),
    };
    try {
      const res = await fetch("/api/public/insurance-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setState(res.ok ? "done" : "fail");
    } catch {
      setState("fail");
    }
  }

  const inputCls =
    "w-full rounded-xl border border-line bg-white px-4 py-3 text-[14.5px] text-ink placeholder:text-faint outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20";
  const labelCls = "mb-1.5 block text-[12.5px] font-bold text-ink-soft";

  if (state === "done") {
    return (
      <div className="dash-card p-7 text-center sm:p-8">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-ok-tint text-xl text-ok">
          ✓
        </div>
        <p className="text-[15px] font-bold text-ink">{t("done")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="dash-card space-y-4 p-7 sm:p-8">
      <p className="text-xl font-bold tracking-tight text-ink">{t("formTitle")}</p>
      <p className="text-[13.5px] text-muted">{t("formSub")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>{t("fName")} *</span>
          <input name="name" required maxLength={120} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>{t("fCompany")}</span>
          <input name="company" maxLength={160} className={inputCls} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>{t("fEmail")} *</span>
          <input name="email" type="email" required maxLength={200} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>{t("fPhone")}</span>
          <input name="phone" maxLength={40} className={inputCls} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>{t("fCargoValue")}</span>
          <input
            name="cargo_value"
            type="number"
            min="0"
            step="0.01"
            placeholder="10000"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>{t("fCurrency")}</span>
          <select name="currency" defaultValue="USD" className={inputCls}>
            {["USD", "CNY", "EUR", "JPY", "KRW", "VND", "TWD"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>{t("fOrigin")}</span>
          <input name="origin" maxLength={120} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>{t("fDestination")}</span>
          <input name="destination" maxLength={120} className={inputCls} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>{t("fMode")}</span>
          <select name="mode" defaultValue="ocean" className={inputCls}>
            <option value="ocean">{t("modeOcean")}</option>
            <option value="air">{t("modeAir")}</option>
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>{t("fCoverage")}</span>
          <select name="coverage" defaultValue="marine" className={inputCls}>
            {COVERAGES.map((c, i) => (
              <option key={c} value={c}>
                {t(`coverages.${i}.t`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className={labelCls}>{t("fMessage")}</span>
        <textarea name="message" rows={3} maxLength={2000} className={`${inputCls} resize-none`} />
      </label>
      <button
        type="submit"
        disabled={state === "sending"}
        className="w-full rounded-xl bg-brand py-3.5 text-[15px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(29,78,216,0.8)] transition-all hover:-translate-y-px hover:bg-brand-deep disabled:opacity-60"
      >
        {state === "sending" ? t("sending") : t("submit")}
      </button>
      {state === "fail" && (
        <p className="rounded-lg bg-red-50 px-4 py-2.5 text-center text-[13px] font-semibold text-red-600">
          {t("fail")}
        </p>
      )}
    </form>
  );
}
