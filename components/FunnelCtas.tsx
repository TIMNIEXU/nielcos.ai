"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

/* Next Best Action — rendered under free-tool results (landed-cost,
   HTS intelligence). Free Tool → Lead → Case → Service → Revenue,
   not Result → Goodbye.
   Conversion actions go to the unified quote form / public customs intake
   with the HTS + description carried as context. No invented prices —
   a real person replies with a real quote. */

const primaryCls =
  "rounded-full bg-brand px-5 py-2.5 text-[13.5px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(29,78,216,0.8)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep";
const secondaryCls =
  "rounded-full border border-brand/40 bg-white px-5 py-2.5 text-[13.5px] font-bold text-brand transition-all hover:-translate-y-0.5 hover:bg-brand-tint/50";

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
  const cargo = ctx ? `&cargo=${encodeURIComponent(ctx)}` : "";
  const quote = (service: string) => `/${locale}/quote?service=${service}${cargo}`;

  const primary = [
    { key: "brokerReview", href: quote("customs") },
    { key: "startClearance", href: `/${locale}/services/customs` },
    { key: "qBond", href: quote("bond") },
    { key: "qFreight", href: quote("freight") },
  ];
  const secondary = [
    { key: "askAi", href: `/${locale}/app/assistant` },
    { key: "saveNiel", href: `/${locale}/app` },
  ];

  return (
    <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-card">
      <div className="border-t-2 border-brand/15 pt-1">
        <p className="text-[16px] font-bold text-ink">{t("title")}</p>
        <p className="mt-1 text-[13px] text-ink-soft">{t("sub")}</p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {primary.map((a) => (
            <Link key={a.key} href={a.href} className={primaryCls}>
              {t(a.key)} →
            </Link>
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          {secondary.map((a) => (
            <Link key={a.key} href={a.href} className={secondaryCls}>
              {t(a.key)} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
