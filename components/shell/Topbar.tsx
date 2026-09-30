"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useShell } from "./ShellContext";
import GlobalSearch from "./GlobalSearch";
import QuickActions from "./QuickActions";
import NotificationBell from "./NotificationBell";
import type { ShellLabels } from "./types";

type Props = {
  companyName: string;
  userEmail: string;
  labels: ShellLabels;
};

export default function Topbar({ companyName, userEmail, labels }: Props) {
  const locale = useLocale();
  const { setDrawerOpen } = useShell();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen ]);

  const signOut = async () => {
    setSigningOut(true);
    try {
      const sb = createClient();
      await sb.auth.signOut();
    } finally {
      window.location.href = `/${locale}/login`;
    }
  };

  const initial = (userEmail || "?").trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-line bg-card/95 px-3 backdrop-blur sm:gap-3 sm:px-4 lg:px-6">
      {/* mobile hamburger */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label={labels.openMenu}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-card-soft lg:hidden"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-5 w-5">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <GlobalSearch labels={labels} />

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <QuickActions labels={labels} />
        <NotificationBell labels={labels} />

        <span className="hidden h-6 w-px bg-line md:block" aria-hidden="true" />

        {/* company: display only (no multi-company switching) */}
        <span className="hidden max-w-44 truncate text-sm font-semibold text-ink md:block" title={companyName}>
          {companyName || labels.workspace}
        </span>

        {/* profile menu */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={userEmail}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-tint text-sm font-bold text-brand-ink transition-colors hover:bg-brand hover:text-white"
          >
            {initial}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-line bg-card py-2 shadow-pop">
              <p className="truncate px-4 pb-2 pt-1 text-xs text-muted">
                {labels["menu.signedInAs"].replace("%EMAIL%", userEmail)}
              </p>
              {companyName && (
                <p className="truncate px-4 pb-2 text-xs font-semibold text-ink-soft">{companyName}</p>
              )}
              <div className="border-t border-line pt-1">
                <button
                  type="button"
                  disabled={signingOut}
                  onClick={signOut}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-risk hover:bg-risk-tint disabled:opacity-60"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2M10 12h11M18 9l3 3-3 3" />
                  </svg>
                  {labels["menu.signOut"]}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
