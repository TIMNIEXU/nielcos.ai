"use client";

/**
 * KpiCard — label + big number + delta, optional drill-down.
 *
 * Drill-down is an `href` (string), NOT an onClick: a Server Component must
 * not pass functions to a Client Component. Hover/lift styling applies ONLY
 * when href is present (non-clickable cards stay flat).
 */
import Link from "next/link";
import type { ReactNode } from "react";

export type KpiDeltaTone = "ok" | "warn" | "risk" | "neutral";

const deltaColor: Record<KpiDeltaTone, string> = {
  ok: "text-ok",
  warn: "text-warn",
  risk: "text-risk",
  neutral: "text-faint",
};

type KpiCardProps = {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: KpiDeltaTone;
  hint?: string;
  /** Drill-down target. When set, the whole card is a link with hover state. */
  href?: string;
  icon?: ReactNode;
};

export function KpiCard({ label, value, delta, deltaTone = "neutral", hint, href, icon }: KpiCardProps) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="type-caption font-semibold tracking-wide text-muted uppercase">{label}</p>
        {icon ? <span className="text-faint">{icon}</span> : null}
      </div>
      <p className="type-kpi mt-2 text-ink">{value}</p>
      {delta || hint ? (
        <p className="type-caption mt-1.5 flex items-baseline gap-1.5">
          {delta ? <span className={`font-bold ${deltaColor[deltaTone]}`}>{delta}</span> : null}
          {hint ? <span className="text-faint">{hint}</span> : null}
        </p>
      ) : null}
    </>
  );

  const frame = `rounded-card border border-line bg-card p-5 shadow-card ${
    href ? "block transition duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card-hover" : ""
  }`;

  return href ? (
    <Link href={href} className={frame} aria-label={`${label}: ${value}`}>
      {body}
    </Link>
  ) : (
    <div className={frame}>{body}</div>
  );
}
