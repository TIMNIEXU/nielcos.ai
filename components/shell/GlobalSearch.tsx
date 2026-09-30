"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";
import type { ShellLabels } from "./types";

type Result = {
  type: "trade" | "shipment" | "entry" | "document";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

const GROUP_ORDER: Result["type"][] = ["trade", "shipment", "entry", "document"];

const TYPE_STYLE: Record<Result["type"], string> = {
  trade: "bg-vio-tint text-vio",
  shipment: "bg-sky-tint text-sky",
  entry: "bg-warn-tint text-warn",
  document: "bg-brand-tint text-brand-ink",
};

type Props = { labels: ShellLabels };

export default function GlobalSearch({ labels }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[]>([]);

  /* ⌘K / Ctrl+K focuses the search box */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (query.length === 0) {
      setResults([]);
      setBusy(false);
      return;
    }
    setBusy(true);
    const t = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ctl = new AbortController();
      abortRef.current = ctl;
      try {
        const res = await fetch(
          `/api/app/search?q=${encodeURIComponent(query)}&locale=${encodeURIComponent(locale)}`,
          { signal: ctl.signal }
        );
        const data = res.ok ? await res.json() : { results: [] };
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch {
        /* aborted or network error -> keep previous results */
      } finally {
        setBusy(false);
      }
    }, 280);
    return () => window.clearTimeout(t);
  }, [q, locale]);

  const go = (href: string) => {
    // API returns locale-prefixed hrefs; the locale-aware router wants a bare path.
    const bare = href.replace(/^\/[^/]+/, "") || "/";
    setOpen(false);
    setQ("");
    router.push(bare);
  };

  const groups = GROUP_ORDER.map((type) => ({
    type,
    items: results.filter((r) => r.type === type),
  })).filter((g) => g.items.length > 0);

  const groupLabel: Record<Result["type"], string> = {
    trade: labels["search.groupTrade"],
    shipment: labels["search.groupShipment"],
    entry: labels["search.groupEntry"],
    document: labels["search.groupDocument"],
  };

  const showPanel = open && q.trim().length > 0;

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-md">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-faint">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-4.5 w-4.5">
          <path d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM16 16l4.5 4.5" />
        </svg>
      </div>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" && results.length > 0) go(results[0].href);
        }}
        placeholder={labels["search.placeholder"]}
        aria-label={labels["search.placeholder"]}
        className="h-10 w-full rounded-full border border-line bg-card-soft pl-9 pr-10 text-sm text-ink placeholder:text-faint focus:border-brand focus:bg-card focus:outline-none"
      />
      <kbd className="pointer-events-none absolute inset-y-0 right-3 hidden items-center text-[11px] font-semibold text-faint sm:flex">
        ⌘K
      </kbd>

      {showPanel && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-line bg-card shadow-pop">
          {busy && results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">{labels["search.searching"]}</p>
          ) : groups.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              {labels["search.noResults"].replace("%Q%", q.trim())}
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto py-2">
              {groups.map((g) => (
                <div key={g.type}>
                  <p className="px-4 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-faint">
                    {groupLabel[g.type]}
                  </p>
                  {g.items.map((r) => (
                    <button
                      key={`${r.type}-${r.id}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => go(r.href)}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-card-soft"
                    >
                      <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${TYPE_STYLE[r.type]}`}>
                        {groupLabel[r.type]}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">{r.title}</span>
                        {r.subtitle && (
                          <span className="block truncate text-xs text-muted">{r.subtitle}</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
