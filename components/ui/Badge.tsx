"use client";

/**
 * Badge — status pill. Always text + color (never color alone): a tone dot
 * plus the label text, so meaning survives without color perception.
 */
import type { ReactNode } from "react";

export type BadgeTone = "ok" | "warn" | "risk" | "info" | "neutral";

const toneClass: Record<BadgeTone, { pill: string; dot: string }> = {
  ok: { pill: "bg-ok-tint", dot: "bg-ok" },
  warn: { pill: "bg-warn-tint", dot: "bg-warn" },
  risk: { pill: "bg-risk-tint", dot: "bg-risk" },
  info: { pill: "bg-sky-tint", dot: "bg-sky" },
  neutral: { pill: "bg-line-soft", dot: "bg-faint" },
};

type BadgeProps = {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
};

export function Badge({ tone = "neutral", children, className = "" }: BadgeProps) {
  const c = toneClass[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-ink-soft ${c.pill} ${className}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} />
      {children}
    </span>
  );
}
