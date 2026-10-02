"use client";

import { useEffect, useMemo, useState } from "react";

type Entry = {
  product_keyword: string;
  hts_prefix: string | null;
  origin: string;
  case_type: string;
  status: string;
  note: string | null;
};

type Labels = {
  searchPh: string;
  originAll: string;
  typeAll: string;
  colProduct: string;
  colHts: string;
  colOrigin: string;
  colType: string;
  colStatus: string;
  empty: string;
  count: string;
  disclaimer: string;
  checkRate: string;
};

export default function AdCvdList({ t, locale }: { t: Labels; locale: string }) {
  const [items, setItems] = useState<Entry[] | null>(null);
  const [q, setQ] = useState("");
  const [origin, setOrigin] = useState("");
  const [ctype, setCtype] = useState("");

  useEffect(() => {
    fetch("/api/public/ad-cvd-watch?limit=100")
      .then((r) => r.json())
      .then((j) => setItems(j.matches ?? []))
      .catch(() => setItems([]));
  }, []);

  const origins = useMemo(
    () => [...new Set((items ?? []).map((i) => i.origin))].sort(),
    [items]
  );
  const ctypes = useMemo(
    () => [...new Set((items ?? []).map((i) => i.case_type))].sort(),
    [items]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (items ?? []).filter(
      (i) =>
        (!needle ||
          i.product_keyword.toLowerCase().includes(needle) ||
          (i.hts_prefix ?? "").includes(needle.replace(/\./g, ""))) &&
        (!origin || i.origin === origin) &&
        (!ctype || i.case_type === ctype)
    );
  }, [items, q, origin, ctype]);

  if (items === null) {
    return (
      <div className="mx-auto mt-12 max-w-5xl space-y-4" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="dash-card animate-pulse p-6">
            <div className="h-4 w-2/3 rounded bg-line-soft" />
            <div className="mt-3 h-3 w-full rounded bg-line-soft" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-5xl">
      {/* filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.searchPh}
          className="flex-1 rounded-xl border border-line bg-white px-4 py-2.5 text-[14px] text-ink placeholder:text-faint focus:border-brand focus:outline-none"
        />
        <select
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-[14px] text-ink focus:border-brand focus:outline-none"
        >
          <option value="">{t.originAll}</option>
          {origins.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <select
          value={ctype}
          onChange={(e) => setCtype(e.target.value)}
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-[14px] text-ink focus:border-brand focus:outline-none"
        >
          <option value="">{t.typeAll}</option>
          {ctypes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <p className="mt-4 text-[13px] font-medium text-ink-soft">
        {t.count.replace("%N%", String(filtered.length))}
      </p>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-[15px] text-muted">{t.empty}</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-slate-50/80 text-[12px] uppercase tracking-wide text-ink-soft">
                <th className="px-5 py-3 font-semibold">{t.colProduct}</th>
                <th className="px-5 py-3 font-semibold">{t.colHts}</th>
                <th className="px-5 py-3 font-semibold">{t.colOrigin}</th>
                <th className="px-5 py-3 font-semibold">{t.colType}</th>
                <th className="px-5 py-3 font-semibold">{t.colStatus}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i, idx) => (
                <tr key={idx} className="border-b border-line-soft last:border-0 hover:bg-slate-50/60">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold capitalize text-ink">{i.product_keyword}</p>
                    {i.note && (
                      <p className="mt-0.5 text-[12.5px] text-ink-soft">{i.note}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono text-ink">
                    {i.hts_prefix || "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-ink">{i.origin}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[12px] font-bold text-brand">
                      {i.case_type}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-ink-soft">
                    {i.status.replace(/_/g, " ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] leading-relaxed text-amber-800">
        ⚠️ {t.disclaimer}
      </p>
      <p className="mt-4 text-center">
        <a
          href={`/${locale}/landed-cost`}
          className="font-semibold text-brand underline"
        >
          {t.checkRate}
        </a>
      </p>
    </div>
  );
}
