"use client";

import { Link, usePathname } from "@/i18n/routing";
import { useShell } from "./ShellContext";
import type { NavItem, ShellLabels } from "./types";

const ICONS: Record<string, React.ReactNode> = {
  dashboard: (
    <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z" />
  ),
  trades: (
    <path d="M4 7h16v10H4zM9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M4 12h16" />
  ),
  shipments: (
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5" />
  ),
  customs: (
    <path d="M9 4h6v3H9zM7 5H5v16h14V5h-2M9 12l2 2 4-4" />
  ),
  documents: (
    <path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" />
  ),
  products: (
    <path d="M4 4h7l9 9-7 7-9-9zM8.5 8.5h.01" />
  ),
  suppliers: (
    <path d="M4 20V10l6-4v14M10 20V6l10 4v10M4 20h16M14 13h.01M17 13h.01" />
  ),
  logistics: (
    <path d="M2 6h12v10H2zM14 10h4l4 4v2h-8M6 20a1.8 1.8 0 1 0 0-.01M18 20a1.8 1.8 0 1 0 0-.01" />
  ),
  finance: (
    <path d="M4 7h16v12H4zM4 10h16M7 15h4" />
  ),
  insurance: (
    <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /><path d="M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21" /></>
  ),
  compliance: (
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4" />
  ),
  assistant: (
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z" />
  ),
  tower: (
    <path d="M12 12h.01M12 12a4 4 0 0 1 4 4M12 12a8 8 0 0 1 8 8M12 12a8 8 0 0 0-8 8M5 21h14" />
  ),
  executive: (
    <path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3" />
  ),
  integrations: (
    <path d="M9 7V4M15 7V4M7 7h10v4a5 5 0 0 1-10 0zM12 16v5" />
  ),
  team: (
    <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 11a3 3 0 1 0-2-5.2M17.5 14.5a6.5 6.5 0 0 1 4 5.5" />
  ),
  settings: (
    <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.5a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.5h4l.4-2.5a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2z" />
  ),
};

function Icon({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      {ICONS[name] ?? ICONS.dashboard}
    </svg>
  );
}

/* Slugs that have their own top-level nav entry; anything else under /app/<x>
   is treated as a shipment-detail-style page. */
const SECTION_SLUGS = new Set([
  "trades", "customs", "documents", "products", "suppliers", "logistics",
  "finance", "insurance", "freight", "compliance", "assistant", "tower", "executive",
  "integrations", "team", "settings",
]);

function pathNoLocale(pathname: string): string {
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length > 0 && /^(en|zh-CN|zh-TW|vi|ko|ja)$/.test(segs[0])) segs.shift();
  return "/" + segs.join("/");
}

function isActive(item: NavItem, path: string): boolean {
  if (item.href === "/app") {
    if (item.key === "dashboard") return path === "/app";
    if (item.key === "shipments") {
      if (path === "/app") return false; // dashboard wins on the root
      const m = /^\/app\/([^/]+)(\/.*)?$/.exec(path);
      return !!m && !SECTION_SLUGS.has(m[1]);
    }
    return false;
  }
  return path === item.href || path.startsWith(item.href + "/");
}

type Props = {
  items: NavItem[];
  labels: ShellLabels;
  /** Rendered inside the mobile drawer (always expanded look). */
  inDrawer?: boolean;
};

export default function Sidebar({ items, labels, inDrawer = false }: Props) {
  const pathname = usePathname();
  const { mode, toggleCollapsed, setDrawerOpen } = useShell();
  const path = pathNoLocale(pathname);
  const iconOnly = !inDrawer && mode === "icon";

  return (
    <nav
      aria-label="primary"
      className={`flex h-full flex-col bg-card ${
        inDrawer ? "w-72" : iconOnly ? "w-[72px]" : "w-60"
      }`}
    >
      {/* nav items */}
      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active = isActive(item, path);
          return (
            <Link
              key={item.key}
              href={item.href}
              title={item.label}
              onClick={() => inDrawer && setDrawerOpen(false)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                iconOnly ? "justify-center" : ""
              } ${
                active
                  ? "bg-brand-tint font-semibold text-brand-ink"
                  : "text-ink-soft hover:bg-card-soft hover:text-ink"
              }`}
            >
              <span className={active ? "text-brand" : "text-faint group-hover:text-ink-soft"}>
                <Icon name={item.icon} />
              </span>
              {!iconOnly && <span className="truncate">{item.label}</span>}
              {!iconOnly && active && (
                <span className="ml-auto h-5 w-1 rounded-full bg-brand" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>

      {/* footer: collapse toggle (desktop) / close (drawer) */}
      <div className="border-t border-line p-3">
        {inDrawer ? (
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-soft hover:bg-card-soft"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
            {labels.closeMenu}
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleCollapsed}
            title={iconOnly ? labels.expand : labels.collapse}
            aria-label={iconOnly ? labels.expand : labels.collapse}
            className={`hidden items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-soft hover:bg-card-soft lg:flex ${
              iconOnly ? "justify-center" : ""
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              {iconOnly ? <path d="M9 6l6 6-6 6" /> : <path d="M15 6l-6 6 6 6" />}
            </svg>
            {!iconOnly && <span>{labels.collapse}</span>}
          </button>
        )}
      </div>
    </nav>
  );
}
