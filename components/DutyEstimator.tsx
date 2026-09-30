"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isZhLocale } from "@/lib/locale";
import FunnelCtas from "./FunnelCtas";

/* Flexport-style US import duty simulator (public, no login).
   Left: calculator — product/HTS search, shipment value, origin, mode,
   entry date, user-declared exclusion codes.
   Right: results — big duty rate, cost breakdown (base + duties + HMF +
   MPF = landed), per-line 9903 items, AD/CVD notice, disclaimer, CTA.
   All math in the browser. Rate data: public /api/public/duty-lookup
   (USITC 2026 Rev 19 MFN + additional_duties suggestions). Figures are
   estimates — the UI always says verify before relying. */

type T = Record<string, string>;

/* CBP Merchandise Processing Fee (formal entry), by entry-date fiscal year. */
function mpfSchedule(entryDate: string) {
  // FY2027 begins 2026-10-01 (CBP notice Jul 2026)
  const fy27 = entryDate >= "2026-10-01";
  return {
    rate: 0.3464,
    min: fy27 ? 34.58 : 33.58,
    max: fy27 ? 670.86 : 651.5,
    fy: fy27 ? "FY2027" : "FY2026",
  };
}
const HMF_RATE = 0.125; // Harbor Maintenance Fee, ocean shipments only

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

type DutyLine = {
  code: string;
  label: string;
  sub?: string;
  rate: number | null;
  rateText?: string;
  amount: number;
};

const ORIGINS = [
  "China", "Vietnam", "Mexico", "Canada", "India", "Germany", "Japan",
  "South Korea", "United Kingdom", "Taiwan", "Thailand", "Brazil",
  "Malaysia", "Indonesia", "Italy", "France", "Cambodia", "Bangladesh",
  "Turkey", "Argentina",
];

/* Pull a chapter-99 code out of a rule's note/source when our data has one
   (e.g. "…List 4A (9903.88.15)"). Never invent one. */
function extract9903(s: Suggestion): string | null {
  const m = /9903\.\d{2}\.\d{2,}/.exec(`${s.note ?? ""} ${s.source ?? ""}`);
  return m ? m[0] : null;
}

function dutyLabel(s: Suggestion, t: T, origin: string): string {
  const dt = s.duty_type ?? "";
  if (dt === "301-FL") return `${t.flName}${origin ? ` — ${origin}` : ""}`;
  if (dt.startsWith("232")) return t.r232Name;
  if (dt === "301" || dt.startsWith("301")) return t.c301Name;
  return dt;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

function DutyEstimatorInner({ t, locale }: { t: T; locale: string }) {
  const [query, setQuery] = useState("");
  const [hts, setHts] = useState("");
  const [htsDesc, setHtsDesc] = useState("");
  const [value, setValue] = useState("");
  const [origin, setOrigin] = useState("China");
  const [mode, setMode] = useState<"ocean" | "air">("ocean");
  const [entryDate, setEntryDate] = useState(todayStr());
  const [exclDonation, setExclDonation] = useState(false);

  const [lookingUp, setLookingUp] = useState(false);
  const [lookupMsg, setLookupMsg] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [mfnRate, setMfnRate] = useState<number | null>(null);
  const [mfnText, setMfnText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const zh = isZhLocale(locale);
  const searchParams = useSearchParams();

  /* GRI-001 V1 — prefill from ?q= (Universal Import Box handoff) and auto-run. */
  const qInit = useRef(false);
  useEffect(() => {
    if (qInit.current) return;
    const q = (searchParams.get("q") ?? "").trim();
    if (!q) return;
    qInit.current = true;
    setQuery(q);
    void lookupWithText(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const sched = mpfSchedule(entryDate || "2000-01-01");

  const rateSuggestions = useMemo(
    () => suggestions.filter((s) => s.kind === "rate" && s.rate != null),
    [suggestions]
  );
  const warnings = useMemo(
    () => suggestions.filter((s) => s.kind === "warning"),
    [suggestions]
  );
  const has301FL = rateSuggestions.some((s) => s.duty_type === "301-FL");

  const calc = useMemo(() => {
    const v = num(value);
    const lines: DutyLine[] = [];
    let totalRate = 0;
    let duties = 0;

    if (hts) {
      const m = mfnRate ?? 0;
      const amt = (v * m) / 100;
      lines.push({
        code: hts,
        label: htsDesc || t.mfnName,
        sub: mfnText || undefined,
        rate: mfnRate,
        rateText: mfnRate == null && mfnText ? mfnText : undefined,
        amount: amt,
      });
      totalRate += m;
      duties += amt;
    }
    for (const s of rateSuggestions) {
      if (s.duty_type === "301-FL" && exclDonation) continue; // user-declared donation exclusion
      const r = Number(s.rate);
      const amt = (v * r) / 100;
      lines.push({
        code: extract9903(s) ?? "—",
        label: dutyLabel(s, t, origin),
        sub: s.source ?? undefined,
        rate: r,
        amount: amt,
      });
      totalRate += r;
      duties += amt;
    }
    const mpfRaw = (v * sched.rate) / 100;
    const mpf = v > 0 ? Math.min(sched.max, Math.max(sched.min, mpfRaw)) : 0;
    const hmf = mode === "ocean" && v > 0 ? (v * HMF_RATE) / 100 : 0;
    const landed = v + duties + mpf + hmf;
    return { v, lines, totalRate, duties, mpf, hmf, landed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, hts, htsDesc, mfnRate, mfnText, rateSuggestions, exclDonation, mode, entryDate, origin]);

  const applyDirectResult = (data: any) => {
    if (data.found) {
      const digits = String(data.hts_no ?? "").replace(/[^0-9]/g, "");
      setHts(
        digits.length >= 8
          ? `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`
          : data.hts_no
      );
      setHtsDesc(data.description ?? "");
      if (data.general_rate != null) {
        setMfnRate(Number(data.general_rate));
        setMfnText("");
      } else {
        setMfnRate(null);
        setMfnText(data.rate_text ?? "");
      }
      setLookupMsg(
        `${data.hts_no}${data.revision ? ` (${data.revision})` : ""}`
      );
    } else {
      setLookupMsg(t.notFound);
    }
    setSuggestions((data.duty_suggestions ?? []) as Suggestion[]);
  };

  const lookupDirect = async (htsDigits: string) => {
    const res = await fetch(
      `/api/public/duty-lookup?hts=${htsDigits}&origin=${encodeURIComponent(origin)}`
    );
    applyDirectResult(await res.json());
  };

  const lookupWithText = async (text: string) => {
    const q = text.trim();
    const code = q.replace(/[^0-9]/g, "");
    setLookingUp(true);
    setLookupMsg("");
    setCandidates([]);
    try {
      if (code.length >= 6) {
        await lookupDirect(code);
        return;
      }
      if (!q) {
        setLookupMsg(t.needInput);
        return;
      }
      const res = await fetch(
        `/api/public/duty-lookup?description=${encodeURIComponent(q)}&origin=${encodeURIComponent(origin)}`
      );
      const data = await res.json();
      const cs: Candidate[] = (data.candidates ?? []).slice(0, 5);
      setCandidates(cs);
      setLookupMsg(cs.length ? t.pickCandidate : t.notFound);
    } catch {
      setLookupMsg(t.lookupFailed);
    } finally {
      setLookingUp(false);
    }
  };

  const doLookup = () => lookupWithText(query);

  const pickCandidate = async (c: Candidate) => {
    setQuery(c.hts_no);
    setCandidates([]);
    setLookingUp(true);
    try {
      await lookupDirect(c.hts_no.replace(/[^0-9]/g, ""));
    } finally {
      setLookingUp(false);
    }
  };

  /* ---- import a commercial document: auto-fill product fields ---- */
  const onImportFile = async (f: File | undefined) => {
    if (!f) return;
    setImporting(true);
    setImportMsg("");
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch("/api/public/extract", { method: "POST", body: form });
      const data = await res.json();
      if (!data.ok) {
        setImportMsg(
          t[data.error === "no_text" ? "importNoText" : data.error === "too_big" ? "importTooBig" : "importFail"]
        );
        return;
      }
      if (data.productName) setQuery(data.productName);
      if (data.origin) setOrigin(data.origin);
      if (data.invValue) setValue(String(data.invValue));
      setImportMsg(t.importOk.replace("%N%", String(data.lineCount ?? 1)));
      if (data.hts) {
        const digits = String(data.hts).replace(/[^0-9]/g, "");
        setQuery(data.hts);
        setLookingUp(true);
        try {
          await lookupDirect(digits);
        } finally {
          setLookingUp(false);
        }
      } else if (data.htsCandidates?.length) {
        setCandidates(
          data.htsCandidates.map((c: any) => ({ ...c, rate_text: null, score: 0 }))
        );
        setLookupMsg(t.pickCandidate);
      }
    } catch {
      setImportMsg(t.importFail);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const resetForm = () => {
    setQuery(""); setHts(""); setHtsDesc(""); setValue("");
    setOrigin("China"); setMode("ocean"); setEntryDate(todayStr());
    setExclDonation(false); setLookupMsg(""); setCandidates([]);
    setSuggestions([]); setMfnRate(null); setMfnText("");
    setImportMsg(""); setCopied(false);
  };

  const sendResults = async () => {
    const linesTxt = calc.lines
      .map((l) => `${l.code} — ${l.label}: ${l.rate ?? l.rateText ?? ""}% = ${usd(l.amount)}`)
      .join("\n");
    const txt =
      `NIEL COS duty estimate (${entryDate})\n` +
      `HTS ${hts || "—"} · origin ${origin} · value ${usd(calc.v)}\n` +
      `${linesTxt}\n` +
      `Total duties ${usd(calc.duties)} (${calc.totalRate.toFixed(2)}%)\n` +
      `HMF ${usd(calc.hmf)} · MPF ${usd(calc.mpf)}\n` +
      `Landed cost ${usd(calc.landed)}\n${t.disclaimerShort}`;
    try {
      await navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const inputCls =
    "w-full rounded-xl border border-line bg-white px-4 py-2.5 text-[15px] text-ink placeholder:text-faint focus:border-brand focus:outline-none";
  const lblCls = "mb-1.5 block text-[13.5px] font-semibold text-ink";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_1fr]">
      {/* ================= Calculator ================= */}
      <div className="rounded-2xl bg-slate-50/80 p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-ink">{t.calcTitle}</h2>
          <button
            onClick={resetForm}
            className="rounded-lg border border-brand/60 px-4 py-1.5 text-[13.5px] font-semibold text-brand hover:bg-brand-tint"
          >
            {t.resetForm}
          </button>
        </div>

        {/* import document */}
        <div className="mb-6">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="rounded-full border-2 border-dashed border-brand/50 px-5 py-2 text-[13.5px] font-bold text-brand hover:border-brand hover:bg-brand-tint/40 disabled:opacity-50"
          >
            {importing ? t.importing : `📄 ${t.importBtn}`}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.docx"
            className="hidden"
            onChange={(e) => onImportFile(e.target.files?.[0])}
          />
          <p className="mt-2 text-[12px] text-faint">{t.importHint}</p>
          {importMsg && <p className="mt-1 text-[12.5px] font-medium text-ink-soft">{importMsg}</p>}
        </div>

        <div className="grid gap-5">
          {/* product / HTS search */}
          <div>
            <label className={lblCls}>{t.searchLabel}</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint">⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doLookup()}
                placeholder={t.searchPh}
                className={`${inputCls} pl-10 pr-10`}
              />
              {query && (
                <button
                  onClick={() => { setQuery(""); setCandidates([]); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink"
                  aria-label={t.clearSearch}
                >
                  ✕
                </button>
              )}
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
                    className="flex w-full items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-left text-[12.5px] shadow-sm hover:bg-brand-tint/60"
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
            {htsDesc && (
              <div className="mt-3 rounded-lg bg-white px-4 py-3 text-[13.5px] text-ink shadow-sm">
                {htsDesc}
              </div>
            )}
            {warnings.map((w, i) => (
              <p key={i} className="mt-2 text-[12.5px] font-medium text-amber-700">
                ⚠️ {zh ? w.note_cn || w.note : w.note || w.note_cn}
              </p>
            ))}
          </div>

          {/* value */}
          <div>
            <label className={lblCls}>{t.valueLabel}</label>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="10000"
              inputMode="decimal"
              className={inputCls}
            />
          </div>

          {/* origin */}
          <div>
            <label className={lblCls}>{t.originLabel}</label>
            <select value={origin} onChange={(e) => setOrigin(e.target.value)} className={inputCls}>
              {ORIGINS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* mode */}
          <div>
            <label className={lblCls}>{t.modeLabel}</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "ocean" | "air")}
              className={inputCls}
            >
              <option value="ocean">🚢 {t.modeOcean}</option>
              <option value="air">✈️ {t.modeAir}</option>
            </select>
          </div>

          {/* entry date */}
          <div>
            <label className={lblCls}>{t.entryDateLabel}</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* exclusions */}
          <div>
            <label className={lblCls}>{t.exclTitle}</label>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${
                exclDonation ? "border-brand bg-brand-tint/50" : "border-line bg-white"
              } ${!has301FL ? "opacity-60" : ""}`}
            >
              <input
                type="checkbox"
                checked={exclDonation}
                disabled={!has301FL}
                onChange={(e) => setExclDonation(e.target.checked)}
                className="mt-1 h-4 w-4 accent-brand"
              />
              <span>
                <span className="flex flex-wrap items-center gap-2 font-mono text-[13px] font-bold text-ink">
                  9903.05.91
                  <span
                    className={`rounded-full px-2 py-0.5 font-sans text-[11px] font-bold ${
                      exclDonation ? "bg-brand text-white" : "bg-red-50 text-red-600"
                    }`}
                  >
                    {exclDonation ? t.applied : t.notApplied}
                  </span>
                </span>
                <span className="mt-0.5 block font-sans text-[12.5px] text-ink-soft">
                  {t.exclDonationDesc}
                </span>
              </span>
            </label>
            <p className="mt-1.5 text-[12px] text-faint">{t.exclNote}</p>
          </div>
        </div>
      </div>

      {/* ================= Results ================= */}
      <div className="rounded-2xl bg-slate-50/80 p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-ink">{t.resultsTitle}</h2>
          <button
            onClick={sendResults}
            disabled={!hts}
            className="rounded-lg bg-brand px-4 py-1.5 text-[13.5px] font-bold text-white hover:bg-brand-dark disabled:opacity-40"
          >
            {copied ? `✓ ${t.copied}` : `➤ ${t.sendResults}`}
          </button>
        </div>

        {/* AD/CVD notice */}
        <div className="mb-5 rounded-xl border border-brand/30 bg-white p-4 text-[13px] leading-relaxed text-ink">
          <p className="font-semibold text-brand">ⓘ {t.adTitle}</p>
          <a href={`/${locale}/contact`} className="mt-1 inline-block font-semibold text-brand underline">
            {t.adCta}
          </a>
        </div>

        {/* big rate */}
        <div className="rounded-2xl border border-line bg-white p-6">
          <p className="text-[13.5px] font-medium text-ink-soft">{t.dutyRateLabel}</p>
          <p className="mt-1 text-[52px] font-bold leading-none tracking-tight text-brand">
            {calc.totalRate.toFixed(2)}
            <span className="text-[28px]">%</span>
          </p>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-3">
            <span className="text-[14px] font-bold text-ink">{t.totalDutiesLabel}</span>
            <span className="text-[18px] font-bold text-brand">{usd(calc.duties)}</span>
          </div>
        </div>

        {/* cost breakdown */}
        <div className="mt-4 rounded-2xl border border-line bg-white p-6">
          <p className="mb-3 text-[13.5px] font-medium text-ink-soft">{t.costTitle}</p>
          <dl className="space-y-2.5 text-[14px]">
            <div className="flex justify-between">
              <dt className="text-ink-soft">{t.baseCost}</dt>
              <dd className="font-semibold text-ink">{usd(calc.v)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">{t.totalDutiesLabel}</dt>
              <dd className="font-semibold text-ink">{usd(calc.duties)}</dd>
            </div>
            {mode === "ocean" && (
              <div className="flex justify-between">
                <dt className="text-ink-soft">{t.hmfRow}</dt>
                <dd className="font-semibold text-ink">{usd(calc.hmf)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-ink-soft">
                {t.mpfRow}
                <span className="ml-1 text-[12px] text-faint">({sched.fy})</span>
              </dt>
              <dd className="font-semibold text-ink">{usd(calc.mpf)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3">
              <dt className="font-bold text-ink">{t.landedCost}</dt>
              <dd className="text-[20px] font-bold text-brand">{usd(calc.landed)}</dd>
            </div>
          </dl>
        </div>

        {/* line items */}
        {calc.lines.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[14px] font-bold text-ink">{t.lineTitle.replace("%N%", "1")}</p>
              <p className="text-[13px] text-ink-soft">{t.lineValue.replace("%V%", usd(calc.v))}</p>
            </div>
            <div className="space-y-2">
              {calc.lines.map((l, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-xl bg-violet-50/70 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[13px] font-bold text-ink underline decoration-dotted">
                      {l.code}
                    </p>
                    <p className="truncate text-[12.5px] text-ink-soft">{l.label}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-5">
                    <span className="text-[13.5px] font-semibold text-ink">
                      {l.rate != null ? `${l.rate}%` : l.rateText ?? t.free}
                    </span>
                    <span className="w-20 text-right text-[13.5px] font-bold text-ink">
                      {usd(l.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 rounded-xl bg-amber-50 p-4 text-[12.5px] leading-relaxed text-amber-800">
          {t.disclaimer}
        </p>
        <FunnelCtas locale={locale} hts={hts} description={query} />
        <a
          href={`/${locale}/contact`}
          className="mt-4 inline-flex rounded-full bg-brand px-6 py-2.5 text-[14px] font-bold text-white hover:bg-brand-dark"
        >
          {t.cta}
        </a>
      </div>
    </div>
  );
}

/* useSearchParams requires a Suspense boundary under the app router. */
export default function DutyEstimator(props: { t: T; locale: string }) {
  return (
    <Suspense>
      <DutyEstimatorInner {...props} />
    </Suspense>
  );
}
