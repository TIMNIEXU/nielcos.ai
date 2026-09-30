"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTrade } from "../actions";

const INCOTERMS = ["EXW", "FCA", "FOB", "CIF", "DAP", "DDP"];
const CURRENCIES = ["USD", "CNY", "EUR"];

export default function Wizard({ messages, locale }: { messages: Record<string, string>; locale: string }) {
  const t = (k: string) => messages[k] ?? k;
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    incoterm: "FOB",
    origin_country: "",
    destination_country: "",
    buyer_name: "",
    supplier_name: "",
    currency: "USD",
    total_value: "",
    description: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const steps = [t("stepBasics"), t("stepParties"), t("stepReview")];

  async function submit() {
    if (!form.title.trim()) {
      setError(t("errTitle"));
      setStep(0);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const id = await createTrade(form);
      router.push(`/${locale}/app/trades/${id}`);
    } catch (e: any) {
      setError(e.message || "error");
      setSaving(false);
    }
  }

  const input =
    "w-full rounded-control border border-slate-200 bg-white px-3 py-2 text-sm text-ink";
  const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft";

  return (
    <div className="mx-auto max-w-2xl">
      <ol className="flex items-center gap-2">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                i <= step ? "bg-brand text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-sm font-medium ${i <= step ? "text-ink" : "text-slate-400"}`}>{s}</span>
            {i < steps.length - 1 && <span className="mx-1 h-px flex-1 bg-slate-200" />}
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-card bg-white p-6 shadow-card">
        {step === 0 && (
          <div className="grid gap-4">
            <div>
              <label className={label}>{t("fTitle")} *</label>
              <input className={input} value={form.title} onChange={set("title")} placeholder={t("fTitlePh")} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={label}>{t("fIncoterm")}</label>
                <select className={input} value={form.incoterm} onChange={set("incoterm")}>
                  {INCOTERMS.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>{t("fCurrency")}</label>
                <select className={input} value={form.currency} onChange={set("currency")}>
                  {CURRENCIES.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>{t("fValue")}</label>
                <input className={input} inputMode="decimal" value={form.total_value} onChange={set("total_value")} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={label}>{t("fOrigin")}</label>
                <input className={input} value={form.origin_country} onChange={set("origin_country")} placeholder="CN" />
              </div>
              <div>
                <label className={label}>{t("fDest")}</label>
                <input className={input} value={form.destination_country} onChange={set("destination_country")} placeholder="US" />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4">
            <div>
              <label className={label}>{t("fBuyer")}</label>
              <input className={input} value={form.buyer_name} onChange={set("buyer_name")} />
            </div>
            <div>
              <label className={label}>{t("fSupplier")}</label>
              <input className={input} value={form.supplier_name} onChange={set("supplier_name")} />
            </div>
            <div>
              <label className={label}>{t("fDesc")}</label>
              <textarea className={input} rows={4} value={form.description} onChange={set("description")} placeholder={t("fDescPh")} />
            </div>
            <p className="text-xs text-ink-soft">{t("commercialNote")}</p>
          </div>
        )}

        {step === 2 && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {(
              [
                ["fTitle", form.title],
                ["fIncoterm", form.incoterm],
                ["fOrigin", form.origin_country || "—"],
                ["fDest", form.destination_country || "—"],
                ["fBuyer", form.buyer_name || "—"],
                ["fSupplier", form.supplier_name || "—"],
                ["fCurrency", form.currency],
                ["fValue", form.total_value || "—"],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <dt className={label}>{t(k)}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
            <div className="col-span-2">
              <dt className={label}>{t("fDesc")}</dt>
              <dd className="text-ink">{form.description || "—"}</dd>
            </div>
          </dl>
        )}

        {error && (
          <p className="mt-4 rounded-control bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-6 flex justify-between">
          <button
            type="button"
            disabled={step === 0 || saving}
            onClick={() => setStep((s) => s - 1)}
            className="rounded-control border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            {t("back")}
          </button>
          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
            >
              {t("next")}
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={submit}
              className="rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
            >
              {saving ? t("creating") : t("create")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
