"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import type { ShellLabels } from "./types";

type Alert = {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail?: string;
  href?: string;
};

const SEV_STYLE: Record<Alert["severity"], string> = {
  high: "bg-risk-tint text-risk",
  medium: "bg-warn-tint text-warn",
  low: "bg-sky-tint text-sky",
};

type Props = { labels: ShellLabels };

export default function NotificationBell({ labels }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);

  /* /api/app/alerts is implemented by track C; until then (404) stay in empty state. */
  useEffect(() => {
    let alive = true;
    fetch("/api/app/alerts")
      .then((r) => (r.ok ? r.json() : { alerts: [] }))
      .then((d) => {
        if (alive) setAlerts(Array.isArray(d?.alerts) ? d.alerts : []);
      })
      .catch(() => {
        if (alive) setAlerts([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open ]);

  const count = alerts.length;
  const sevLabel = (s: Alert["severity"]) =>
    s === "high" ? labels["bell.high"] : s === "medium" ? labels["bell.medium"] : labels["bell.low"];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={labels["bell.title"]}
        title={labels["bell.title"]}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card text-ink-soft transition-colors hover:border-brand hover:text-brand"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-risk px-1 text-[11px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-label={labels["bell.title"]}>
          <button
            type="button"
            aria-label={labels["bell.title"]}
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-ink/30"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-card shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-base font-bold text-ink">
                {labels["bell.title"]}
                {count > 0 && <span className="ml-2 text-sm font-semibold text-muted">({count})</span>}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-card-soft"
                aria-label={labels["bell.title"]}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-5 w-5">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {alerts.length === 0 ? (
                <p className="px-3 py-10 text-center text-sm text-muted">{labels["bell.empty"]}</p>
              ) : (
                <ul className="space-y-2">
                  {alerts.map((a) => {
                    const body = (
                      <>
                        <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${SEV_STYLE[a.severity]}`}>
                          {sevLabel(a.severity)}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-ink">{a.title}</span>
                          {a.detail && (
                            <span className="mt-0.5 block text-xs text-muted">{a.detail}</span>
                          )}
                        </span>
                      </>
                    );
                    const cls =
                      "flex w-full items-start gap-3 rounded-xl border border-line bg-card-soft/60 px-3.5 py-3 text-left";
                    return (
                      <li key={a.id}>
                        {a.href ? (
                          <Link href={a.href} onClick={() => setOpen(false)} className={`${cls} hover:border-brand`}>
                            {body}
                          </Link>
                        ) : (
                          <div className={cls}>{body}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
