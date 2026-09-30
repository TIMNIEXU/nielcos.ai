"use client";

import { useCallback, useEffect, useState } from "react";

/* HTS suggestion review card (CUS-04).
   Confidence is a fixed rule, never invented:
     10-digit exact -> 95% · 8-digit schedule -> 70% · keyword -> 45% */

type Candidate = { hts_no: string; description?: string; rate?: number | null };

type Props = {
  hts: string;
  origin: string;
  candidates: Candidate[];
  rev: Record<string, string>;
};

type Decision = {
  hts: string;
  origin_country: string;
  decision: "adopted" | "rejected";
  note: string | null;
  reviewer: string;
  created_at: string;
};

function confidenceOf(hts: string): { pct: number; ruleKey: string } {
  const bare = hts.replace(/[^0-9]/g, "");
  if (bare.length >= 10) return { pct: 95, ruleKey: "ruleExact10" };
  if (bare.length >= 8) return { pct: 70, ruleKey: "ruleExact8" };
  return { pct: 45, ruleKey: "ruleKeyword" };
}

export default function HtsReviewCard({ hts, origin, candidates, rev }: Props) {
  const t = (k: string) => rev[k] ?? k;
  const [neighbors, setNeighbors] = useState<Candidate[]>([]);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState("");
  const [choice, setChoice] = useState<"adopted" | "rejected" | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const { pct, ruleKey } = confidenceOf(hts);
  const confTone =
    pct >= 90 ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : pct >= 60 ? "bg-amber-50 text-amber-700 ring-amber-200"
    : "bg-slate-100 text-slate-600 ring-slate-200";

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/app/customs/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hts, origin }),
      });
      const d = await r.json();
      if (r.ok) setNeighbors(d.neighbors ?? []);
    } catch { /* neighbors optional */ }
    try {
      const r = await fetch(
        `/api/app/customs/hts-reviews?hts=${encodeURIComponent(hts)}&origin=${encodeURIComponent(origin)}`
      );
      const d = await r.json();
      if (r.ok) {
        setDecision(d.decision ?? null);
        setPending(!!d.pending);
      }
    } catch { /* review optional */ }
  }, [hts, origin]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!choice || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/app/customs/hts-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hts, origin_country: origin, decision: choice, note }),
      });
      const d = await r.json();
      if (r.status === 503 || d.error === "migration_pending") {
        setPending(true);
        return;
      }
      if (!r.ok) throw new Error(d.error ?? "");
      setMsg(t("reviewSaved"));
      setChoice(null);
      setNote("");
      load();
    } catch {
      setMsg(t("reviewFailed"));
    } finally {
      setBusy(false);
    }
  };

  const alternatives = [
    ...candidates.filter((c) => c.hts_no !== hts).slice(0, 3),
    ...neighbors.filter((n) => n.hts_no !== hts && !candidates.some((c) => c.hts_no === n.hts_no)),
  ].slice(0, 6);

  return (
    <div className="mt-3 rounded-xl border border-brand/25 bg-brand-tint-soft/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-ink">
          📋 {t("cardTitle")}: <span className="font-mono">{hts}</span>
        </p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${confTone}`}>
          {t("confidence")} {pct}%
        </span>
      </div>

      <p className="mt-2 text-xs text-ink-soft">
        <span className="font-bold">{t("rationale")}:</span>{" "}
        {t("rationaleRule").split("%RULE%").join(t(ruleKey))}
      </p>

      {alternatives.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-bold text-ink-soft">{t("alternatives")}:</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {alternatives.map((a) => (
              <span key={a.hts_no} className="rounded-full bg-white px-2.5 py-1 font-mono text-[11px] font-bold text-ink ring-1 ring-line" title={a.description ?? ""}>
                {a.hts_no}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* review state */}
      <div className="mt-3 border-t border-line-soft pt-3">
        {pending ? (
          <p className="text-xs text-ink-soft">⏳ {t("pendingMigration")}</p>
        ) : decision ? (
          <p className="text-xs">
            <span className={`rounded-full px-2.5 py-0.5 font-bold ${
              decision.decision === "adopted" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
            }`}>
              {decision.decision === "adopted" ? `✓ ${t("adopted")}` : `✕ ${t("rejected")}`}
            </span>
            <span className="ml-2 text-ink-soft">
              {t("reviewerLabel")}: {decision.reviewer || "—"}
              {decision.note ? ` · ${decision.note}` : ""}
            </span>
          </p>
        ) : (
          <p className="text-xs font-bold text-warn">● {t("needsReview")}</p>
        )}

        {!pending && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setChoice("adopted")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 transition-colors ${
                choice === "adopted" ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white text-emerald-700 ring-emerald-200 hover:bg-emerald-50"
              }`}
            >
              ✓ {t("adopt")}
            </button>
            <button
              onClick={() => setChoice("rejected")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 transition-colors ${
                choice === "rejected" ? "bg-slate-600 text-white ring-slate-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              ✕ {t("reject")}
            </button>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("notePh")}
              className="min-w-[140px] flex-1 rounded-full border border-line bg-white px-3 py-1.5 text-xs text-ink outline-none focus:border-brand"
            />
            <button
              onClick={submit}
              disabled={!choice || busy}
              className="rounded-full bg-brand px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40"
            >
              {t("submit")}
            </button>
          </div>
        )}
        {msg && <p className="mt-1.5 text-xs font-bold text-ink-soft">{msg}</p>}
      </div>
    </div>
  );
}
