"use client";

/**
 * Pagination — server-side pagination UI.
 *
 * Fully self-contained: the server page passes plain numbers (total, page,
 * per); this component reads/writes the URL itself (?page=&per=), so no
 * callbacks cross the server/client boundary. Uses window.location at click
 * time instead of useSearchParams, so no <Suspense> wrapper is required.
 */
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type PaginationProps = {
  total: number;
  page: number;
  per: number;
  perOptions?: number[];
};

const DEFAULT_PER_OPTIONS = [25, 50, 100];

function pageList(current: number, totalPages: number): (number | "…")[] {
  const set = new Set<number>([1, totalPages, current - 1, current, current + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < nums.length; i++) {
    if (i > 0 && nums[i] - nums[i - 1] > 1) out.push("…");
    out.push(nums[i]);
  }
  return out;
}

export function Pagination({ total, page, per, perOptions = DEFAULT_PER_OPTIONS }: PaginationProps) {
  const t = useTranslations("ui");
  const router = useRouter();

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, per)));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * per + 1;
  const to = Math.min(total, safePage * per);

  const go = (p: number, nextPer: number) => {
    const sp = new URLSearchParams(window.location.search);
    sp.set("page", String(Math.min(Math.max(1, p), Math.ceil(total / Math.max(1, nextPer)) || 1)));
    sp.set("per", String(nextPer));
    router.push(`${window.location.pathname}?${sp.toString()}`, { scroll: false });
  };

  const btn =
    "rounded-control border border-line bg-card px-2.5 py-1.5 text-sm font-semibold text-ink transition hover:bg-card-soft disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card";

  return (
    <nav aria-label={t("pagination.page")} className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <p className="type-caption text-muted">
        {t("pagination.summary").replace("%A%", String(from)).replace("%B%", String(to)).replace("%C%", String(total))}
      </p>
      <div className="flex items-center gap-1">
        <button type="button" className={btn} disabled={safePage <= 1} onClick={() => go(safePage - 1, per)}>
          {t("pagination.prev")}
        </button>
        {pageList(safePage, totalPages).map((n, i) =>
          n === "…" ? (
            <span key={`e${i}`} className="px-1 text-faint" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => go(n, per)}
              aria-current={n === safePage ? "page" : undefined}
              className={`rounded-control px-2.5 py-1.5 text-sm font-semibold transition ${
                n === safePage
                  ? "bg-brand text-white"
                  : "border border-line bg-card text-ink hover:bg-card-soft"
              }`}
            >
              {n}
            </button>
          )
        )}
        <button type="button" className={btn} disabled={safePage >= totalPages} onClick={() => go(safePage + 1, per)}>
          {t("pagination.next")}
        </button>
      </div>
      <label className="type-caption ml-auto flex items-center gap-2 text-muted">
        {t("pagination.perPage")}
        <select
          value={per}
          onChange={(e) => go(1, Number(e.target.value))}
          className="rounded-control border border-line bg-card px-2 py-1.5 text-sm text-ink outline-none focus:border-brand"
        >
          {perOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
