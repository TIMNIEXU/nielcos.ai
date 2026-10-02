"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

/* Compact AD/CVD risk strip shown inside the ImportBox plan, right after
   the compliance section. Runs the same deterministic screening as the
   standalone /ad-cvd-checker page. Evidence scale:
   no_case → possible → potential → high_risk (human review). */

type Mini = {
  ok: boolean;
  risk: "no_case" | "possible" | "potential" | "high_risk";
  human_review_required: boolean;
  matches: { product_keyword: string; case_numbers: string | null; case_type: string }[];
};

const DOT: Record<string, string> = {
  high_risk: "bg-red-500",
  potential: "bg-amber-500",
  possible: "bg-amber-400",
  no_case: "bg-emerald-500",
};

export default function AdCvdRiskCard({
  product,
  origin,
  hts,
  locale,
}: {
  product: string;
  origin?: string;
  hts?: string;
  locale: string;
}) {
  const t = useTranslations("importbox");
  const [mini, setMini] = useState<Mini | null>(null);

  useEffect(() => {
    if (!product.trim()) return;
    const qs = new URLSearchParams({
      product: product.trim(),
      origin: origin ?? "",
      hts: (hts ?? "").replace(/\D/g, ""),
    });
    fetch(`/api/public/ad-cvd-check?${qs}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setMini(j);
      })
      .catch(() => {});
  }, [product, origin, hts]);

  if (!mini) return null;

  const riskKey = {
    high_risk: "adcvdHighRisk",
    potential: "adcvdPotential",
    possible: "adcvdPossible",
    no_case: "adcvdNoCase",
  }[mini.risk] as "adcvdHighRisk" | "adcvdPotential" | "adcvdPossible" | "adcvdNoCase";

  return (
    <div className="mt-6">
      <p className="text-[13px] font-bold tracking-wide text-faint uppercase">{t("adcvdTitle")}</p>
      <div className="mt-3 rounded-2xl border border-line bg-canvas/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[14px] font-bold text-ink">
            <span className={`h-2.5 w-2.5 rounded-full ${DOT[mini.risk]}`} />
            {t("adcvdRisk")}: {t(riskKey)}
          </span>
          <Link
            href={`/${locale}/ad-cvd-checker`}
            className="shrink-0 text-[13px] font-bold text-brand underline"
          >
            {t("adcvdFull")}
          </Link>
        </div>
        {mini.matches.length > 0 && (
          <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
            {t("adcvdMatch")}:{" "}
            {mini.matches.slice(0, 2).map((m, i) => (
              <span key={i} className="font-semibold capitalize text-ink">
                {m.product_keyword}
                {m.case_numbers ? ` (${m.case_numbers})` : ""}{i < Math.min(mini.matches.length, 2) - 1 ? "; " : ""}
              </span>
            ))}
          </p>
        )}
        {mini.human_review_required && (
          <p className="mt-2 text-[12.5px] leading-relaxed text-red-700">{t("adcvdHighNote")}</p>
        )}
      </div>
    </div>
  );
}
