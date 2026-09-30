"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/routing";
import { ShellProvider, type ShellMode } from "./ShellContext";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Breadcrumbs from "./Breadcrumbs";
import type { NavItem, ShellLabels } from "./types";

const COLLAPSE_KEY = "nielcos.shell.collapsed";

type Props = {
  locale: string;
  labels: ShellLabels;
  navItems: NavItem[];
  companyName: string;
  userEmail: string;
  children: React.ReactNode;
};

export default function AppShell({
  locale,
  labels,
  navItems,
  companyName,
  userEmail,
  children,
}: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [narrow, setNarrow] = useState(false); // <1280px: icon rail
  const [mobile, setMobile] = useState(false); // <1024px: drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* persisted collapse preference (desktop only) */
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* private mode etc. */
    }
  }, []);

  /* responsive breakpoints */
  useEffect(() => {
    const mqNarrow = window.matchMedia("(max-width: 1279.98px)");
    const mqMobile = window.matchMedia("(max-width: 1023.98px)");
    const update = () => {
      setNarrow(mqNarrow.matches);
      setMobile(mqMobile.matches);
    };
    update();
    mqNarrow.addEventListener("change", update);
    mqMobile.addEventListener("change", update);
    return () => {
      mqNarrow.removeEventListener("change", update);
      mqMobile.removeEventListener("change", update);
    };
  }, []);

  /* close the drawer on navigation */
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  /* lock body scroll while the drawer is open */
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen ]);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const mode: ShellMode = mobile ? "drawer" : narrow || collapsed ? "icon" : "expanded";

  return (
    <ShellProvider value={{ mode, drawerOpen, setDrawerOpen, toggleCollapsed }}>
      <div className="flex min-h-screen bg-canvas text-ink" data-locale={locale}>
        {/* desktop sidebar */}
        {!mobile && (
          <aside
            className={`sticky top-0 z-40 hidden h-screen shrink-0 border-r border-line lg:block ${
              mode === "icon" ? "w-[72px]" : "w-60"
            }`}
          >
            <Sidebar items={navItems} labels={labels} />
          </aside>
        )}

        {/* mobile drawer */}
        {mobile && drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={labels.openMenu}>
            <button
              type="button"
              aria-label={labels.closeMenu}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 cursor-default bg-ink/30"
            />
            <aside className="absolute inset-y-0 left-0 border-r border-line shadow-pop">
              <Sidebar items={navItems} labels={labels} inDrawer />
            </aside>
          </div>
        )}

        {/* main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar companyName={companyName} userEmail={userEmail} labels={labels} />
          <Breadcrumbs labels={labels} />
          <main className="min-w-0 flex-1">
            <div className="mx-auto max-w-[1600px]">{children}</div>
          </main>
        </div>
      </div>
    </ShellProvider>
  );
}
