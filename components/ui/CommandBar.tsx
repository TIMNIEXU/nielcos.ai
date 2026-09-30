"use client";

/**
 * CommandBar — search box + removable filter chips + right actions slot,
 * shared by list pages.
 *
 * Fully self-contained: it reads/writes the URL itself (?q= by default, chips
 * clear their own param), so a Server Component renders it with plain-object
 * props only — no callbacks cross the server/client boundary.
 *
 *   <CommandBar
 *     searchParam="q"
 *     chips={[{ key: "status", label: t("…"), param: "status" }]}
 *     actions={<Link …>…</Link>}
 *   />
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

export type CommandBarChip = {
  key: string;
  /** Visible label, e.g. "Status: In transit" */
  label: string;
  /** URL param cleared when the chip is removed */
  param: string;
};

type CommandBarProps = {
  searchParam?: string;
  placeholder?: string;
  chips?: CommandBarChip[];
  actions?: ReactNode;
  debounceMs?: number;
};

export function CommandBar({
  searchParam = "q",
  placeholder,
  chips = [],
  actions,
  debounceMs = 500,
}: CommandBarProps) {
  const t = useTranslations("ui");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const timer = useRef<number | null>(null);

  // Initialise from the URL once (client-only; avoids useSearchParams/Suspense).
  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get(searchParam) ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParam]);

  const writeParam = (param: string, value: string | null) => {
    const sp = new URLSearchParams(window.location.search);
    if (value === null || value === "") sp.delete(param);
    else sp.set(param, value);
    if (param !== "page") sp.set("page", "1");
    router.replace(`${window.location.pathname}?${sp.toString()}`, { scroll: false });
  };

  const onChange = (v: string) => {
    setQuery(v);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => writeParam(searchParam, v.trim() ? v.trim() : null), debounceMs);
  };

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  const clearSearch = () => {
    setQuery("");
    if (timer.current) window.clearTimeout(timer.current);
    writeParam(searchParam, null);
  };

  const removeChip = (chip: CommandBarChip) => {
    if (chip.param === searchParam) setQuery("");
    writeParam(chip.param, null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-faint"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          role="searchbox"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? t("commandbar.searchPlaceholder")}
          aria-label={placeholder ?? t("commandbar.searchPlaceholder")}
          className="w-full rounded-control border border-line bg-card py-2 pr-9 pl-9 text-sm text-ink outline-none placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        {query ? (
          <button
            type="button"
            onClick={clearSearch}
            aria-label={t("commandbar.clear")}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-control p-1 text-faint transition hover:bg-line-soft hover:text-ink"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>

      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-tint-soft px-2.5 py-1 text-xs font-semibold text-brand-ink"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => removeChip(chip)}
            aria-label={`${t("commandbar.clear")}: ${chip.label}`}
            className="rounded-full p-0.5 transition hover:bg-brand-tint"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </span>
      ))}

      {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
