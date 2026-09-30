"use client";

/* Bond Intelligence wizard: 3-step assessment → recommendation + amount
   estimate (CBP 10% rule, $50k minimum) → lead capture → DocuSign CTA.
   Real pricing shown only for the $50,000 continuous tier (from our surety
   partner: 1yr $325 intro / $413 renewal, 2yr $563 / $678, 3yr $750 / $921,
   5yr $1,125 / $1,270). Amounts above $50,000 need financials + individual
   underwriting, so no public price is shown for them. */

import { useMemo, useState } from "react";

type Msg = Record<string, string>;
type Rec = "continuous" | "stb" | "none_needed";
type HasBond = "none" | "stb" | "cont";

const inputCls =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const labelCls = "mb-1.5 block text-[13.5px] font-bold text-ink-soft";
const radioCls = (on: boolean) =>
  `flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-[14.5px] font-semibold transition ${
    on
      ? "border-brand bg-brand-tint-soft text-ink shadow-sm"
      : "border-line bg-white text-ink-soft hover:border-brand/50"
  }`;

export default function BondWizard({
  messages: m,
  locale,
  docusignUrl,
}: {
  messages: Msg;
  locale: string;
  docusignUrl: string;
}) {
  const [step, setStep] = useState(0);
  const [importValue, setImportValue] = useState("");
  const [entries, setEntries] = useState("");
  const [entriesUnknown, setEntriesUnknown] = useState(false);
  const [duties, setDuties] = useState("");
  const [useEstimate, setUseEstimate] = useState(false);
  const [avgRate, setAvgRate] = useState("15");
  const [hasBond, setHasBond] = useState<HasBond>("none");

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  const fmtUSD = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    [locale]
  );

  const iv = parseFloat(importValue) || 0;
  const en = entriesUnknown ? NaN : parseInt(entries, 10) || 0;
  const dutiesVal = useEstimate
    ? (iv * (parseFloat(avgRate) || 0)) / 100
    : parseFloat(duties) || 0;

  const rec: Rec =
    iv > 0 && iv <= 2500
      ? "none_needed"
      : !Number.isNaN(en) && en > 0 && en < 4 && dutiesVal * 0.1 < 50000
        ? "stb"
        : "continuous";

  const contAmount = Math.max(50000, Math.ceil((dutiesVal * 0.1) / 10000) * 10000);
  const perShipment = iv / Math.max(Number.isNaN(en) || en === 0 ? 1 : en, 1);
  const stbAmount = Math.max(1000, Math.ceil(perShipment / 1000) * 1000);

  const canNext0 = iv > 0;
  const canNext1 = dutiesVal > 0;

  const why: string[] =
    rec === "continuous"
      ? [
          m.whyCont1,
          ...(hasBond === "cont" ? [m.whyCont3] : []),
          ...(contAmount >= 50000 ? [m.whyCont2] : []),
        ]
      : rec === "stb"
        ? [m.whyStb1, m.whyStb2]
        : [];

  async function submitLead() {
    if (!name.trim() || !email.trim() || sending) return;
    setSending(true);
    setFailed(false);
    const summary =
      `Bond wizard: rec=${rec}` +
      (rec === "continuous" ? `, est ${fmtUSD.format(contAmount)}` : "") +
      (rec === "stb" ? `, est ${fmtUSD.format(stbAmount)}/shipment` : "") +
      `, imports ${fmtUSD.format(iv)}/yr` +
      `, entries ${Number.isNaN(en) ? "unknown" : en}/yr` +
      `, duties ${fmtUSD.format(dutiesVal)}, current bond: ${hasBond}.`;
    try {
      const res = await fetch("/api/public/insurance-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim(),
          email: email.trim(),
          phone: phone.trim(),
          coverage: "bond",
          mode: "bond",
          cargo_value: iv,
          currency: "USD",
          bond_recommendation: rec,
          bond_amount_est:
            rec === "continuous" ? contAmount : rec === "stb" ? stbAmount : null,
          annual_import_value: iv,
          entries_per_year: Number.isNaN(en) ? null : en,
          duties_paid: dutiesVal,
          message: summary,
        }),
      });
      if (!res.ok) throw new Error("bad");
      setSent(true);
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }

  const stepTitles = [m.step1t, m.step2t, m.step3t];

  return (
    <div className="rounded-3xl border border-line bg-white/80 p-6 shadow-xl shadow-brand/5 backdrop-blur sm:p-10">
      {step < 3 ? (
        <>
          {/* progress */}
          <div className="mb-8 flex items-center gap-2">
            {stepTitles.map((t, i) => (
              <div key={t} className="flex flex-1 items-center gap-2">
                <div className="flex-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
                    <div
                      className={`h-full rounded-full transition-all ${i <= step ? "bg-brand" : "bg-transparent"}`}
                    />
                  </div>
                  <p
                    className={`mt-2 text-[12.5px] font-bold ${i === step ? "text-ink" : "text-faint"}`}
                  >
                    {m.stepOf}
                    {i + 1} · {t}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-xl font-black text-ink">{m.step1t}</h2>
              <div>
                <label className={labelCls}>{m.fImportValue}</label>
                <input
                  className={inputCls}
                  inputMode="decimal"
                  placeholder="200000"
                  value={importValue}
                  onChange={(e) => setImportValue(e.target.value.replace(/[^0-9.]/g, ""))}
                />
              </div>
              <div>
                <label className={labelCls}>{m.fEntries}</label>
                <input
                  className={inputCls}
                  inputMode="numeric"
                  placeholder="12"
                  disabled={entriesUnknown}
                  value={entriesUnknown ? "" : entries}
                  onChange={(e) => setEntries(e.target.value.replace(/[^0-9]/g, ""))}
                />
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-[13.5px] text-ink-soft">
                  <input
                    type="checkbox"
                    checked={entriesUnknown}
                    onChange={(e) => setEntriesUnknown(e.target.checked)}
                    className="h-4 w-4 accent-brand"
                  />
                  {m.entriesUnknown}
                </label>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-black text-ink">{m.step2t}</h2>
              {!useEstimate ? (
                <div>
                  <label className={labelCls}>{m.fDuties}</label>
                  <input
                    className={inputCls}
                    inputMode="decimal"
                    placeholder="8000"
                    value={duties}
                    onChange={(e) => setDuties(e.target.value.replace(/[^0-9.]/g, ""))}
                  />
                </div>
              ) : (
                <div>
                  <label className={labelCls}>{m.fAvgRate}</label>
                  <input
                    className={inputCls}
                    inputMode="decimal"
                    placeholder="15"
                    value={avgRate}
                    onChange={(e) => setAvgRate(e.target.value.replace(/[^0-9.]/g, ""))}
                  />
                  <p className="mt-2 text-[13px] text-faint">{m.estimateNote}</p>
                  {iv > 0 && (parseFloat(avgRate) || 0) > 0 && (
                    <p className="mt-1 text-[15px] font-black text-brand">
                      ≈ {fmtUSD.format((iv * (parseFloat(avgRate) || 0)) / 100)}
                    </p>
                  )}
                </div>
              )}
              <button
                onClick={() => setUseEstimate(!useEstimate)}
                className="text-[13.5px] font-bold text-brand hover:underline"
              >
                {m.estimateToggle}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-xl font-black text-ink">{m.step3t}</h2>
              <div className="space-y-3">
                {(
                  [
                    ["none", m.hasNone],
                    ["stb", m.hasStb],
                    ["cont", m.hasCont],
                  ] as [HasBond, string][]
                ).map(([v, label]) => (
                  <label key={v} className={radioCls(hasBond === v)}>
                    <input
                      type="radio"
                      name="hasBond"
                      className="h-4 w-4 accent-brand"
                      checked={hasBond === v}
                      onChange={() => setHasBond(v)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
              className="rounded-xl px-5 py-3 text-[14.5px] font-bold text-faint hover:text-ink disabled:opacity-0"
            >
              {m.back}
            </button>
            <button
              onClick={() => setStep(step + 1)}
              disabled={(step === 0 && !canNext0) || (step === 1 && !canNext1)}
              className="rounded-xl bg-brand px-8 py-3 text-[15px] font-black text-white shadow-lg shadow-brand/25 transition hover:brightness-110 disabled:opacity-40"
            >
              {m.next}
            </button>
          </div>
        </>
      ) : (
        <div>
          {/* result */}
          <p className="text-[12.5px] font-black uppercase tracking-widest text-brand">{m.resEyebrow}</p>
          <h2 className="mt-2 text-2xl font-black text-ink sm:text-3xl">
            {rec === "continuous" ? m.recContinuous : rec === "stb" ? m.recStb : m.recNone}
          </h2>
          <p className="mt-2 text-[15px] text-ink-soft">
            {rec === "continuous" ? m.recContinuousD : rec === "stb" ? m.recStbD : m.recNoneD}
          </p>

          {why.length > 0 && (
            <div className="mt-6 rounded-2xl border border-line-soft bg-brand-tint-soft/50 p-5">
              <p className="text-[13.5px] font-black text-ink">{m.whyTitle}</p>
              <ul className="mt-2 space-y-1.5">
                {why.map((w) => (
                  <li key={w} className="flex gap-2 text-[14px] text-ink-soft">
                    <span className="text-brand">✓</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rec === "continuous" && (
            <div className="mt-6 rounded-2xl border border-line bg-white p-6">
              <p className="text-[13.5px] font-black text-ink">{m.amtTitle}</p>
              <p className="mt-1 text-4xl font-black text-brand">{fmtUSD.format(contAmount)}</p>
              <p className="mt-2 text-[13px] text-faint">{m.amtNote}</p>
              <p className="mt-3 text-[13.5px] font-semibold text-ink-soft">{m.contPriceNote}</p>

              {contAmount > 50000 && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-[14px] font-black text-amber-900">{m.finTitle}</p>
                  <p className="mt-1 text-[13.5px] text-amber-800">{m.finBody}</p>
                </div>
              )}
            </div>
          )}

          {rec === "stb" && (
            <div className="mt-6 rounded-2xl border border-line bg-white p-6">
              <p className="text-[13.5px] font-black text-ink">{m.amtTitle}</p>
              <p className="mt-1 text-4xl font-black text-brand">
                {fmtUSD.format(stbAmount)}
                <span className="ml-2 text-[15px] font-bold text-faint">/ {m.perShipment}</span>
              </p>
              <p className="mt-2 text-[13px] text-faint">{m.amtNote}</p>
              <p className="mt-3 text-[13.5px] text-ink-soft">{m.stbPriceNote}</p>
            </div>
          )}

          {/* attribution notice — must always be visible on the result */}
          <div className="mt-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
            <p className="text-[14.5px] font-black text-amber-900">⚠ {m.attnTitle}</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-amber-900">{m.docusignNote}</p>
            <a
              href={docusignUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block rounded-xl bg-brand px-6 py-2.5 text-[14px] font-black text-white shadow transition hover:brightness-110"
            >
              {m.docusignCta} ↗
            </a>
          </div>

          {/* lead capture */}
          <div className="mt-8 rounded-2xl border border-line bg-white p-6">
            <p className="text-lg font-black text-ink">{m.saveTitle}</p>
            <p className="mt-1 text-[14px] text-ink-soft">{m.saveSub}</p>
            {sent ? (
              <div className="mt-5 rounded-xl bg-emerald-50 p-5 text-center">
                <p className="text-[16px] font-black text-emerald-800">{m.done}</p>
                <a
                  href={docusignUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block rounded-xl bg-brand px-8 py-3.5 text-[15px] font-black text-white shadow-lg shadow-brand/25 transition hover:brightness-110"
                >
                  {m.docusignCta} ↗
                </a>
                <p className="mx-auto mt-3 max-w-md text-[12.5px] text-faint">{m.docusignNote}</p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>{m.sName} *</label>
                  <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>{m.sCompany}</label>
                  <input className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>{m.sEmail} *</label>
                  <input
                    className={inputCls}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>{m.sPhone}</label>
                  <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <button
                    onClick={submitLead}
                    disabled={sending || !name.trim() || !email.trim()}
                    className="w-full rounded-xl bg-brand px-8 py-3.5 text-[15px] font-black text-white shadow-lg shadow-brand/25 transition hover:brightness-110 disabled:opacity-40"
                  >
                    {sending ? m.sending : m.submit}
                  </button>
                  {failed && <p className="mt-2 text-center text-[13.5px] font-bold text-red-600">{m.fail}</p>}
                </div>
              </div>
            )}
          </div>

          <p className="mt-6 text-[12.5px] leading-relaxed text-faint">{m.disclaimer}</p>
          <button onClick={() => setStep(0)} className="mt-4 text-[13.5px] font-bold text-brand hover:underline">
            ← {m.restart}
          </button>
        </div>
      )}
    </div>
  );
}
