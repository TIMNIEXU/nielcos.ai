import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string; page?: string; per?: string }>;
};

const TONE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-400",
};

export default async function TradesList({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "trades" });

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  const q = (sp.q ?? "").trim();
  const status = sp.status ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const perRaw = parseInt(sp.per ?? "25", 10);
  const per = [25, 50, 100].includes(perRaw) ? perRaw : 25;

  let missing = false;
  let trades: any[] = [];
  let total = 0;
  try {
    let query = sb.from("trades").select("*", { count: "exact" });
    if (q) query = query.or(`trade_no.ilike.%${q}%,title.ilike.%${q}%`);
    if (status) query = query.eq("status", status);
    const from = (page - 1) * per;
    const { data, count, error } = await query
      .order("updated_at", { ascending: false })
      .range(from, from + per - 1);
    if (error) throw error;
    trades = data ?? [];
    total = count ?? 0;
  } catch {
    missing = true;
  }

  const statusName = (s: string) =>
    (
      {
        draft: t("stDraft"),
        active: t("stActive"),
        completed: t("stCompleted"),
        cancelled: t("stCancelled"),
      } as Record<string, string>
    )[s] ?? s;

  const pages = Math.max(1, Math.ceil(total / per));
  const link = (p: number) =>
    `?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&page=${p}&per=${per}`;

  return (
    <section className="min-h-[75vh] bg-brand-tint-soft">
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-brand uppercase">
              {t("tradeNo")}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">{t("title")}</h1>
            <p className="mt-1 text-ink-soft">{t("sub")}</p>
          </div>
          {!missing && (
            <Link
              href={`/${locale}/app/trades/new`}
              className="rounded-control bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep"
            >
              {t("new")}
            </Link>
          )}
        </div>

        {missing ? (
          <div className="mt-8 rounded-card bg-white p-10 text-center shadow-card">
            <p className="text-lg font-semibold text-ink">{t("migrationNeeded")}</p>
            <p className="mt-2 text-sm text-ink-soft">{t("migrationSub")}</p>
          </div>
        ) : (
          <>
            <form className="mt-6 flex flex-wrap gap-3" method="get">
              <input
                name="q"
                defaultValue={q}
                placeholder={t("searchPh")}
                className="min-w-0 flex-1 rounded-control border border-slate-200 bg-white px-3 py-2 text-sm"
              />
              <select
                name="status"
                defaultValue={status}
                className="rounded-control border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">{t("allStatuses")}</option>
                <option value="draft">{t("stDraft")}</option>
                <option value="active">{t("stActive")}</option>
                <option value="completed">{t("stCompleted")}</option>
                <option value="cancelled">{t("stCancelled")}</option>
              </select>
              <input type="hidden" name="per" value={String(per)} />
              <button
                type="submit"
                className="rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
              >
                {t("searchPh").replace("…", "")}
              </button>
            </form>

            {trades.length === 0 ? (
              <div className="mt-8 rounded-card bg-white p-10 text-center shadow-card">
                <p className="text-lg font-semibold text-ink">{t("empty")}</p>
                <p className="mt-2 text-sm text-ink-soft">{t("emptySub")}</p>
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto rounded-card bg-white shadow-card">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-ink-soft">
                      <th className="px-4 py-3">{t("tradeNo")}</th>
                      <th className="px-4 py-3">{t("fTitle")}</th>
                      <th className="px-4 py-3">{t("status")}</th>
                      <th className="px-4 py-3">{t("route")}</th>
                      <th className="px-4 py-3 text-right">{t("value")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((tr) => (
                      <tr key={tr.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <Link
                            href={`/${locale}/app/trades/${tr.id}`}
                            className="font-mono font-semibold text-brand hover:underline"
                          >
                            {tr.trade_no}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium text-ink">{tr.title}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              TONE[tr.status] ?? TONE.draft
                            }`}
                          >
                            {statusName(tr.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink-soft">
                          {[tr.origin_country, tr.destination_country].filter(Boolean).join(" → ") ||
                            "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {tr.total_value != null
                            ? `${tr.currency ?? "USD"} ${Number(tr.total_value).toLocaleString()}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                {page > 1 && (
                  <Link href={link(page - 1)} className="rounded-control border border-slate-200 bg-white px-3 py-1.5">
                    ←
                  </Link>
                )}
                <span className="text-ink-soft">
                  {page} / {pages}
                </span>
                {page < pages && (
                  <Link href={link(page + 1)} className="rounded-control border border-slate-200 bg-white px-3 py-1.5">
                    →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
