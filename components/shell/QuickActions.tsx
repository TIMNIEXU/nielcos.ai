"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/routing";
import type { ShellLabels } from "./types";

const ACTIONS = [
  { key: "newTrade", href: "/app/trades", icon: <path d="M12 5v14M5 12h14" /> },
  { key: "newShipment", href: "/app", icon: <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5" /> },
  { key: "uploadDocument", href: "/app/documents", icon: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" /> },
  { key: "newEntry", href: "/app/customs", icon: <path d="M9 4h6v3H9zM7 5H5v16h14V5h-2M10 14h4" /> },
];

type Props = { labels: ShellLabels };

export default function QuickActions({ labels }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={labels["quick.title"]}
        aria-expanded={open}
        title={labels["quick.title"]}
        className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
          open
            ? "border-brand bg-brand text-white"
            : "border-line bg-card text-ink-soft hover:border-brand hover:text-brand"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={`h-5 w-5 transition-transform ${open ? "rotate-45" : ""}`}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-line bg-card py-2 shadow-pop">
          <p className="px-4 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-faint">
            {labels["quick.title"]}
          </p>
          {ACTIONS.map((a) => (
            <Link
              key={a.key}
              href={a.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-soft hover:bg-card-soft hover:text-ink"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-tint text-brand">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  {a.icon}
                </svg>
              </span>
              {labels[`quick.${a.key}`]}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
