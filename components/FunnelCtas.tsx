"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

/* GRI-001 V3 — funnel CTAs rendered under duty-estimator / classify results.
   All four lead to the unified public quote form — no invented prices,
   a real person replies with a real quote. */

const SVCS = ["customs", "freight", "insurance", "bond"] as const;

export default function FunnelCtas({
  locale,
  hts,
  description,
}: {
  locale: string;
  hts?: string;
  description?: string;
}) {
  const t = useTranslations("funnel");
  const ctx = [hts, description].filter(Boolean).join(" — ").slice(0, 140);
  const qs = ctx ? `&cargo=${encodeURIComponent(ctx)}` : "";
  const key: Record<string, string> = {
    customs: "qCustoms", freight: "qFreight",
    insurance: "qInsurance", bond: "qBond",
  };
  return (
    <div className="mt-6 rounded-2xl border border-brand/25 bg-brand-tint/40 p-6">
      <p className="text-[16px] font-bold text-ink">{t("title")}</p>
      <p className="mt-1 text-[13px] text-ink-soft">{t("sub")}</p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {SVCS.map((s) => (
          <Link
            key={s}
            href={`/${locale}/quote?service=${s}${qs}`}
            className="rounded-full bg-brand px-5 py-2.5 text-[13.5px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(29,78,216,0.8)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep"
          >
            {t(key[s])} →
          </Link>
        ))}
      </div>
    </div>
  );
}
