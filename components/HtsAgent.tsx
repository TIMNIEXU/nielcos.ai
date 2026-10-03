"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { htsReason, confidenceBand } from "@/lib/htsReason";
import { isZhLocale } from "@/lib/locale";
import SourcingCompare from "@/components/SourcingCompare";
import FunnelCtas from "@/components/FunnelCtas";

/* GRI-001 V3 — HTS Intelligence agent (public, no login).
   Describe a product -> HTS candidates with confidence + deterministic "why",
   then per-candidate: duty lines (MFN + 232/301), PGA flags, AD/CVD watch hits,
   broker-verification lead form, and regulatory-alert signup.
   Candidates are keyword-matching suggestions — never a legal classification. */

type Candidate = {
  hts_no: string; description: string; rate: number | null;
  rate_text: string | null; score: number;
};
type DutyDetail = {
  found: boolean; hts_no: string; description?: string;
  general_rate?: number | null; rate_text?: string | null;
  duty_suggestions?: { kind: string; duty_type?: string; rate?: number; source?: string; note?: string; note_cn?: string }[];
  pga_flags?: { agency: string; agency_cn: string; note: string }[];
};
type WatchHit = {
  product_keyword: string; hts_prefix: string | null; origin: string;
  case_type: string; status: string; note: string | null;
};

const ORIGINS = [
  "China", "Vietnam", "Mexico", "Canada", "India", "Germany", "Japan",
  "South Korea", "Taiwan", "Thailand", "Malaysia", "Indonesia", "Italy",
  "Cambodia", "Bangladesh", "Turkey",
];

const bandTone = (b: string) =>
  b === "high" ? "bg-ok-tint text-ok"
  : b === "medium" ? "bg-warn-tint text-warn"
  : "bg-card-soft text-faint";

export default function HtsAgent({ locale }: { locale: string }) {
  const t = useTranslations("classify");
  const zh = isZhLocale(locale);
  const [desc, setDesc] = useState("");
  const [origin, setOrigin] = useState("China");
  const [working, setWorking] = useState(false);
  const [searched, setSearched] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<Candidate | null>(null);
  const [detail, setDetail] = useState<DutyDetail | null>(null);
  const [watch, setWatch] = useState<WatchHit[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [vName, setVName] = useState("");
  const [vEmail, setVEmail] = useState("");
  const [vPhone, setVPhone] = useState("");
  const [vSent, setVSent] = useState(false);
  const [vWorking, setVWorking] = useState(false);
  const [aEmail, setAEmail] = useState("");
  const [aSent, setASent] = useState(false);
  const [aWorking, setAWorking] = useState(false);

  const inputCls =
    "w-full rounded-xl border border-line bg-white px-4 py-3 text-[14.5px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

  const check = async () => {
    const q = desc.trim();
    if (!q || working) return;
    setWorking(true); setErr(""); setSel(null); setDetail(null); setWatch([]);
    try {
      const r = await fetch(
        `/api/public/duty-lookup?description=${encodeURIComponent(q)}&origin=${encodeURIComponent(origin)}`
      );
      const d = await r.json();
      setCandidates(((d.candidates ?? []) as Candidate[]).slice(0, 3));
      setSearched(true);
    } catch {
      setErr(t("error"));
    } finally {
      setWorking(false);
    }
  };

  const pick = async (c: Candidate) => {
    setSel(c); setDetail(null); setWatch([]); setLoadingDetail(true);
    try {
      const [dr, wr] = await Promise.all([
        fetch(`/api/public/duty-lookup?hts=${c.hts_no.replace(/[^0-9]/g, "")}&origin=${encodeURIComponent(origin)}`),
        fetch(`/api/public/ad-cvd-watch?keyword=${encodeURIComponent(desc.trim().split(/\s+/).slice(0, 3).join(" "))}&origin=${encodeURIComponent(origin)}`),
      ]);
      setDetail(await dr.json());
      const wd = await wr.json();
      setWatch(wd.matches ?? []);
    } catch {
      setErr(t("error"));
    } finally {
      setLoadingDetail(false);
    }
  };

  const requestVerify = async () => {
    if (!sel || !vEmail.trim() || vWorking) return;
    setVWorking(true);
    try {
      const r = await fetch("/api/public/hts-verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          hts_no: sel.hts_no, product_description: desc.trim(), origin,
          contact_name: vName.trim(), contact_email: vEmail.trim(), contact_phone: vPhone.trim(),
        }),
      });
      if ((await r.json()).ok) setVSent(true);
      else setErr(t("error"));
    } catch {
      setErr(t("error"));
    } finally {
      setVWorking(false);
    }
  };

  const subscribeAlert = async () => {
    if (!aEmail.trim() || aWorking) return;
    setAWorking(true);
    try {
      const r = await fetch("/api/public/alert-subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: aEmail.trim(), keywords: desc.trim(), locale }),
      });
      if ((await r.json()).ok) setASent(true);
      else setErr(t("error"));
    } catch {
      setErr(t("error"));
    } finally {
      setAWorking(false);
    }
  };

  const rateLines = (detail?.duty_suggestions ?? []).filter((s) => s.kind === "rate" && s.rate != null);

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* input card */}
      <div className="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
        <label className="mb-1.5 block text-[13px] font-bold text-ink-soft">{t("inputLabel")}</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={t("inputPh")}
          rows={2}
          className={`${inputCls} resize-none`}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void check(); } }}
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-56">
            <label className="mb-1.5 block text-[13px] font-bold text-ink-soft">{t("originLabel")}</label>
            <select value={origin} onChange={(e) => setOrigin(e.target.value)} className={inputCls}>
              {ORIGINS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <button
            type="button" onClick={() => check()} disabled={!desc.trim() || working}
            className="rounded-full bg-brand px-8 py-3 text-[15px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(29,78,216,0.8)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            {working ? t("working") : `${t("button")} →`}
          </button>
        </div>
        {err && <p className="mt-3 text-[13px] font-semibold text-risk">{err}</p>}
      </div>

      {/* candidates */}
      {searched && (
        <div className="mt-6">
          <p className="text-[13px] font-bold tracking-wide text-faint uppercase">{t("candidatesTitle")}</p>
          {candidates.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-line bg-white p-5 text-[14px] text-muted">{t("noResult")}</p>
          ) : (
            <>
              <p className="mt-1 text-[12.5px] text-faint">{t("pickHint")}</p>
              <div className="mt-3 space-y-2.5">
                {candidates.map((c) => {
                  const band = confidenceBand(c.score);
                  const active = sel?.hts_no === c.hts_no;
                  return (
                    <button
                      key={c.hts_no} type="button" onClick={() => pick(c)}
                      className={`w-full rounded-2xl border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-brand ${active ? "border-brand ring-2 ring-brand/20" : "border-line"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-mono text-[15px] font-bold text-ink">{c.hts_no}</p>
                        <span className={`rounded-full px-3 py-0.5 text-[12px] font-bold ${bandTone(band)}`}>
                          {c.score}% {t("confidence")}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] text-muted">{c.description}</p>
                      <p className="mt-1 text-[12.5px] text-faint italic">{htsReason(c, desc, zh)}</p>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* detail */}
      {sel && (
        <div className="mt-6 rounded-3xl border border-line bg-white p-6 shadow-card sm:p-8">
          {loadingDetail ? (
            <p className="text-[14px] text-muted">{t("working")}</p>
          ) : (
            <>
              <h3 className="text-[17px] font-bold text-ink">
                {t("dutyTitle")} · <span className="font-mono">{sel.hts_no}</span>
              </h3>
              <div className="mt-4 overflow-hidden rounded-2xl border border-line">
                <div className="flex items-center justify-between px-4 py-2.5 text-[13.5px]">
                  <span className="text-ink-soft">{t("mfn")}</span>
                  <span className="font-bold text-ink">
                    {detail?.general_rate != null ? `${detail.general_rate}%` : detail?.rate_text ?? "—"}
                  </span>
                </div>
                {rateLines.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[13.5px]">
                    <span className="text-ink-soft">{s.duty_type ?? "—"}</span>
                    <span className="font-bold text-risk">{s.rate}%</span>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-[13px] font-bold tracking-wide text-faint uppercase">{t("pgaTitle")}</p>
              {(detail?.pga_flags ?? []).length === 0 ? (
                <p className="mt-2 text-[13.5px] text-muted">{t("noPga")}</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {(detail?.pga_flags ?? []).map((p, i) => (
                    <li key={i} className="rounded-xl bg-brand-tint/40 px-4 py-2.5 text-[13.5px] text-ink">
                      <span className="font-bold">{zh ? p.agency_cn : p.agency}</span>
                      {p.note && <span className="text-ink-soft"> — {p.note}</span>}
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-5 text-[13px] font-bold tracking-wide text-faint uppercase">{t("adCvdTitle")}</p>
              {watch.length === 0 ? (
                <p className="mt-2 text-[13.5px] text-muted">{t("adCvdNone")}</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {watch.map((w, i) => (
                    <li key={i} className="rounded-xl bg-risk-tint/50 px-4 py-2.5 text-[13.5px] text-ink">
                      <span className="font-bold">{w.product_keyword}</span>
                      <span className="ml-2 rounded-full bg-risk px-2 py-0.5 text-[11px] font-bold text-white">{w.case_type}</span>
                      <span className="text-ink-soft"> · {w.origin}</span>
                      {w.note && <span className="block text-[12.5px] text-ink-soft">{w.note}</span>}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[12px] leading-relaxed text-faint">{t("adCvdNote")}</p>

              {/* sourcing comparison — same HTS across origins */}
              <SourcingCompare hts={sel.hts_no} locale={locale} />

              {/* broker verification */}
              <div className="mt-6 rounded-2xl border border-brand/30 bg-brand-tint/30 p-5">
                <p className="text-[15px] font-bold text-ink">{t("verifyTitle")}</p>
                <p className="mt-1 text-[13px] text-ink-soft">{t("verifySub")}</p>
                {vSent ? (
                  <p className="mt-3 text-[13.5px] font-bold text-ok">✓ {t("sent")}</p>
                ) : (
                  <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
                    <input value={vName} onChange={(e) => setVName(e.target.value)} placeholder={t("nameLabel")} className={inputCls} />
                    <input value={vEmail} onChange={(e) => setVEmail(e.target.value)} placeholder={t("emailLabel")} type="email" className={inputCls} />
                    <input value={vPhone} onChange={(e) => setVPhone(e.target.value)} placeholder={t("phoneLabel")} className={inputCls} />
                    <button
                      type="button" onClick={() => requestVerify()} disabled={!vEmail.trim() || vWorking}
                      className="rounded-full bg-brand px-6 py-2.5 text-[14px] font-bold text-white hover:bg-brand-deep disabled:opacity-40 sm:col-span-3 sm:justify-self-start"
                    >
                      {vWorking ? t("working") : t("verifyButton")}
                    </button>
                  </div>
                )}
              </div>

              {/* regulatory alerts */}
              <div className="mt-4 rounded-2xl border border-line p-5">
                <p className="text-[15px] font-bold text-ink">{t("alertTitle")}</p>
                <p className="mt-1 text-[13px] text-ink-soft">{t("alertSub")}</p>
                {aSent ? (
                  <p className="mt-3 text-[13.5px] font-bold text-ok">✓ {t("alertSent")}</p>
                ) : (
                  <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                    <input value={aEmail} onChange={(e) => setAEmail(e.target.value)} placeholder={t("emailLabel")} type="email" className={`${inputCls} sm:max-w-xs`} />
                    <button
                      type="button" onClick={() => subscribeAlert()} disabled={!aEmail.trim() || aWorking}
                      className="rounded-full border border-brand px-6 py-2.5 text-[14px] font-bold text-brand hover:bg-brand-tint/50 disabled:opacity-40"
                    >
                      {aWorking ? t("working") : t("alertButton")}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* next best action — free tool → lead → case → service → revenue */}
      {sel && !loadingDetail && (
        <FunnelCtas locale={locale} hts={sel.hts_no} description={desc} />
      )}

      <p className="mt-6 rounded-xl bg-amber-50 p-4 text-[12.5px] leading-relaxed text-amber-800">
        {t("disclaimer")}
      </p>
    </div>
  );
}
