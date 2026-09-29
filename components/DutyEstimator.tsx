"use client";

import { useMemo, useState } from "react";

/* Public US import duty & landed-cost estimator.
   Input order: product name → material → intended use → HTS → origin →
   invoice value → MFN / 301 / 232 → MPF / HMF / total.
   All math runs in the browser. Rate lookups hit the public read-only
   /api/public/duty-lookup (USITC rates + 301/232 suggestions).
   Figures are estimates — the UI always says verify before relying. */

type T = Record<string, string>;

/* CBP Merchandise Processing Fee schedule (formal entry). */
function mpfSchedule(t: T) {
  // FY2027 begins 2026-10-01: min $34.58 / max $670.86 (CBP notice Jul 2026)
  const fy27 = new Date() >= new Date("2026-10-01T00:00:00");
  return {
    rate: 0.3464,
    min: fy27 ? 34.58 : 33.58,
    max: fy27 ? 670.86 : 651.5,
    note: fy27 ? t.mpfFy27 : t.mpfFy26,
  };
}
const HMF_RATE = 0.125; // Harbor Maintenance Fee, ocean shipments

const num = (s: string) => {
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

type Suggestion = {
  kind: string;
  duty_type?: string;
  rate?: number;
  source?: string;
  basis?: string;
  note?: string;
  note_cn?: string;
};

type Candidate = {
  hts_no: string;
  description: string;
  rate: number | null;
  rate_text: string | null;
  score: number;
};

export default function DutyEstimator({ t, locale }: { t: T; locale: string }) {
  const [productName, setProductName] = useState("");
  const [material, setMaterial] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [hts, setHts] = useState("");
  const [origin, setOrigin] = useState("");
  const [invValue, setInvValue] = useState("");
  const [freight, setFreight] = useState("");
  const [insurance, setInsurance] = useState("");
  const [mfn, setMfn] = useState("");
  const [r301, setR301] = useState("");
  const [r232, setR232] = useState("");
  const [ocean, setOcean] = useState(false);

  const [lookingUp, setLookingUp] = useState(false);
  const [lookupMsg, setLookupMsg] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const sched = mpfSchedule(t);

  const calc = useMemo(() => {
    const v = num(invValue);
    const dutyMfn = (v * num(mfn)) / 100;
    const duty301 = (v * num(r301)) / 100;
    const duty232 = (v * num(r232)) / 100;
    const duty = dutyMfn + duty301 + duty232;
    const mpfRaw = (v * sched.rate) / 100;
    const mpf = v > 0 ? Math.min(sched.max, Math.max(sched.min, mpfRaw)) : 0;
    const hmf = ocean ? (v * HMF_RATE) / 100 : 0;
    const total = v + num(freight) + num(insurance) + duty + mpf + hmf;
    return { v, dutyMfn, duty301, duty232, duty, mpf, hmf, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invValue, freight, insurance, mfn, r301, r232, ocean]);

  const applyDirectResult = (data: any) => {
    if (data.general_rate != null) {
      setMfn(String(data.general_rate));
      setLookupMsg(
        `${data.hts_no} · ${t.usitcRate}${data.revision ? ` (${data.revision})` : ""}`
      );
    } else if (data.rate_text) {
      setLookupMsg(`${t.compoundNote}: ${data.rate_text}`);
    } else if (!data.found) {
      setLookupMsg(t.notFound);
    }
    setSuggestions((data.duty_suggestions ?? []) as Suggestion[]);
  };

  const lookupDirect = async (htsDigits: string) => {
    const res = await fetch(
      `/api/public/duty-lookup?hts=${htsDigits}&origin=${encodeURIComponent(origin.trim())}&material=${encodeURIComponent(material.trim())}`
    );
    applyDirectResult(await res.json());
  };

  const doLookup = async () => {
    const code = hts.replace(/[^0-9]/g, "");
    const description = [productName, material, intendedUse]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");
    setLookingUp(true);
    setLookupMsg("");
    setCandidates([]);
    try {
      if (code.length >= 6) {
        await lookupDirect(code);
        return;
      }
      if (!description) {
        setLookupMsg(t.needInput);
        return;
      }
      const res = await fetch(
        `/api/public/duty-lookup?description=${encodeURIComponent(description)}&origin=${encodeURIComponent(origin.trim())}`
      );
      const data = await res.json();
      const cs: Candidate[] = data.candidates ?? [];
      setCandidates(cs.slice(0, 5));
      setLookupMsg(cs.length ? t.pickCandidate : t.notFound);
    } catch {
      setLookupMsg(t.lookupFailed);
    } finally {
      setLookingUp(false);
    }
  };

  const pickCandidate = async (c: Candidate) => {
    const digits = c.hts_no.replace(/[^0-9]/g, "");
    setHts(c.hts_no);
    setCandidates([]);
    setLookingUp(true);
    try {
      await lookupDirect(digits);
    } finally {
      setLookingUp(false);
    }
  };

  const applySuggestion = (s: Suggestion) => {
    if (s.rate == null) return;
    if ((s.duty_type ?? "").startsWith("301")) setR301(String(s.rate));
    else if ((s.duty_type ?? "").startsWith("232")) setR232(String(s.rate));
  };

  const rateSuggestions = suggestions.filter((s) => s.kind === "rate");
  const warnings = suggestions.filter((s) => s.kind === "warning");

  const inputCls =
    "w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[15px] text-ink placeholder:text-faint focus:border-brand focus:outline-none";
  const lblCls = "mb-1.5 block text-[13px] font-semibold text-ink-soft";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* -------- inputs: product → HTS → origin → value → rates -------- */}
      <div className="dash-card p-6 sm:p-8">
        <div className="grid gap-5">
          <div>
            <label className={lblCls}>{t.productName}</label>
            <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder={t.productNamePh} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lblCls}>{t.material}</label>
              <input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder={t.materialPh} className={inputCls} />
            </div>
            <div>
              <label className={lblCls}>{t.intendedUse}</label>
              <input value={intendedUse} onChange={(e) => setIntendedUse(e.target.value)} placeholder={t.intendedUsePh} className={inputCls} />
            </div>
          </div>

          <div className="rounded-xl bg-brand-tint/50 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={lblCls}>{t.hts}</label>
                <input
                  value={hts}
                  onChange={(e) => setHts(e.target.value)}
                  placeholder={t.htsPh}
                  inputMode="numeric"
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className={lblCls}>{t.origin}</label>
                <input
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder={t.originPh}
                  list="estimator-origins"
                  className={inputCls}
                />
                <datalist id="estimator-origins">
                  {["China", "Vietnam", "Mexico", "Canada", "India", "Germany", "Japan", "South Korea", "United Kingdom", "Taiwan", "Thailand", "Brazil"].map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>
            <button
              onClick={doLookup}
              disabled={lookingUp}
              className="mt-3 rounded-full bg-brand px-5 py-2 text-[13.5px] font-bold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {lookingUp ? t.lookingUp : `🔍 ${t.lookup}`}
            </button>
            {lookupMsg && <p className="mt-2 text-[12.5px] font-medium text-ink-soft">{lookupMsg}</p>}
            {candidates.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {candidates.map((c) => (
                  <button
                    key={c.hts_no}
                    onClick={() => pickCandidate(c)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-left text-[12.5px] hover:bg-brand-tint/60"
                  >
                    <span>
                      <span className="font-mono font-bold text-brand">{c.hts_no}</span>
                      <span className="ml-2 text-ink-soft">{c.description}</span>
                    </span>
                    <span className="shrink-0 font-bold text-ink">
                      {c.rate != null ? `${c.rate}%` : c.rate_text ?? ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {rateSuggestions.map((s, i) => (
              <div key={i} className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px]">
                <span className="font-bold text-amber-700">
                  {s.duty_type === "301-FL" ? t.suggestFL : t.suggest232}: {s.rate}% ({s.source})
                  {s.basis === "cap_net_of_mfn" ? ` ${t.capNote}` : ""}
                </span>
                <button
                  onClick={() => applySuggestion(s)}
                  className="rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-800 hover:bg-amber-200"
                >
                  {t.apply}
                </button>
              </div>
            ))}
            {warnings.map((w, i) => (
              <p key={i} className="mt-2 text-[12.5px] font-medium text-amber-700">
                ⚠️ {locale === "zh-CN" ? w.note_cn || w.note : w.note || w.note_cn}
              </p>
            ))}
          </div>

          <div>
            <label className={lblCls}>{t.invValue}</label>
            <input value={invValue} onChange={(e) => setInvValue(e.target.value)} placeholder="0.00" inputMode="decimal" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lblCls}>{t.freight}</label>
              <input value={freight} onChange={(e) => setFreight(e.target.value)} placeholder="0.00" inputMode="decimal" className={inputCls} />
            </div>
            <div>
              <label className={lblCls}>{t.insurance}</label>
              <input value={insurance} onChange={(e) => setInsurance(e.target.value)} placeholder="0.00" inputMode="decimal" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={lblCls}>{t.mfn}</label>
            <input value={mfn} onChange={(e) => setMfn(e.target.value)} placeholder="0.0" inputMode="decimal" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lblCls}>{t.rate301}</label>
              <input value={r301} onChange={(e) => setR301(e.target.value)} placeholder="0.0" inputMode="decimal" className={inputCls} />
            </div>
            <div>
              <label className={lblCls}>{t.rate232}</label>
              <input value={r232} onChange={(e) => setR232(e.target.value)} placeholder="0.0" inputMode="decimal" className={inputCls} />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-[14px] font-medium text-ink">
            <input type="checkbox" checked={ocean} onChange={(e) => setOcean(e.target.checked)} className="h-4 w-4 accent-brand" />
            {t.ocean}
          </label>
        </div>
      </div>

      {/* -------- breakdown: duty → MPF → HMF → total -------- */}
      <div className="dash-card flex flex-col p-6 sm:p-8">
        <h3 className="text-lg font-bold text-ink">{t.breakdown}</h3>
        <dl className="mt-5 space-y-3 text-[14.5px]">
          <div className="flex justify-between">
            <dt className="text-ink-soft">{t.invValue}</dt>
            <dd className="font-semibold text-ink">{usd(calc.v)}</dd>
          </div>
          <div className="border-t border-line pt-3">
            <div className="flex justify-between">
              <dt className="font-semibold text-ink">{t.rowDuty}</dt>
              <dd className="font-bold text-ink">{usd(calc.duty)}</dd>
            </div>
            <div className="mt-1.5 space-y-1 pl-3 text-[13px] text-ink-soft">
              <div className="flex justify-between"><span>{t.rowDutyMfn}</span><span>{usd(calc.dutyMfn)}</span></div>
              {calc.duty301 > 0 && <div className="flex justify-between"><span>{t.rowDuty301}</span><span>{usd(calc.duty301)}</span></div>}
              {calc.duty232 > 0 && <div className="flex justify-between"><span>{t.rowDuty232}</span><span>{usd(calc.duty232)}</span></div>}
            </div>
          </div>
          <div className="flex justify-between border-t border-line pt-3">
            <dt className="text-ink-soft">{t.rowMpf} <span className="text-[12px] text-faint">({sched.note})</span></dt>
            <dd className="font-semibold text-ink">{usd(calc.mpf)}</dd>
          </div>
          {ocean && (
            <div className="flex justify-between">
              <dt className="text-ink-soft">{t.rowHmf}</dt>
              <dd className="font-semibold text-ink">{usd(calc.hmf)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between rounded-xl bg-brand-tint/60 px-4 py-3.5">
            <dt className="text-[15px] font-bold text-ink">{t.rowTotal}</dt>
            <dd className="text-[22px] font-bold text-brand">{usd(calc.total)}</dd>
          </div>
        </dl>
        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-[12.5px] leading-relaxed text-amber-800">
          {t.disclaimer}
        </p>
        <a
          href={`/${locale}/contact`}
          className="mt-4 inline-flex w-fit rounded-full bg-brand px-6 py-2.5 text-[14px] font-bold text-white hover:bg-brand-dark"
        >
          {t.cta}
        </a>
      </div>
    </div>
  );
}
