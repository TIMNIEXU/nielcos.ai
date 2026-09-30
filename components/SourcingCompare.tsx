"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/* GRI-001 V3 — sourcing-origin comparison.
   Same HTS across candidate origins: MFN + additional duties total,
   from the real /api/public/duty-lookup. Estimates only. */

const ORIGINS = ["China", "Vietnam", "Mexico", "India", "Taiwan"];

type Row = { origin: string; total: number | null; mfn: number | null };

export default function SourcingCompare({
  hts,
  locale: _locale,
}: {
  hts: string;
  locale: string;
}) {
  const t = useTranslations("sourcing");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hts) return;
    let dead = false;
    setLoading(true);
    (async () => {
      const out: Row[] = [];
      for (const origin of ORIGINS) {
        try {
          const r = await fetch(
            `/api/public/duty-lookup?hts=${hts.replace(/[^0-9]/g, "")}&origin=${encodeURIComponent(origin)}`
          );
          const d = await r.json();
          const mfn = d.general_rate ?? null;
          const addl = ((d.duty_suggestions ?? []) as { kind: string; rate?: number | null }[])
            .filter((s) => s.kind === "rate" && s.rate != null)
            .reduce((a, s) => a + (s.rate ?? 0), 0);
          out.push({ origin, mfn, total: mfn != null ? mfn + addl : null });
        } catch {
          out.push({ origin, mfn: null, total: null });
        }
      }
      if (!dead) {
        out.sort((a, b) => (a.total ?? 999) - (b.total ?? 999));
        setRows(out);
        setLoading(false);
      }
    })();
    return () => { dead = true; };
  }, [hts]);

  if (!hts) return null;
  return (
    <div className="mt-6 rounded-2xl border border-line bg-white p-6">
      <p className="text-[16px] font-bold text-ink">{t("title")}</p>
      <p className="mt-1 text-[13px] text-ink-soft">{t("sub")}</p>
      {loading ? (
        <p className="mt-4 text-[13.5px] text-muted">{t("loading")}</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-2.5 font-bold text-ink-soft">{t("originCol")}</th>
                <th className="px-4 py-2.5 text-right font-bold text-ink-soft">{t("totalCol")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.origin} className="border-t border-line">
                  <td className="px-4 py-2.5 font-semibold text-ink">{r.origin}</td>
                  <td className={`px-4 py-2.5 text-right font-bold ${r.total != null && r.total === rows[0]?.total ? "text-ok" : "text-ink"}`}>
                    {r.total != null ? `${r.total.toFixed(2)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[12px] leading-relaxed text-faint">{t("note")}</p>
    </div>
  );
}
