import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LinkForm, UnlinkButton } from "./LinkForm";
import TradeActions from "./TradeActions";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

const TABS = [
  "tabOverview",
  "tabCommercial",
  "tabPayments",
  "tabLogistics",
  "tabCustoms",
  "tabDocuments",
  "tabCosts",
  "tabActivity",
];

const ST_TONE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-blue-50 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-400",
};

const KEYS = [
  "tradeNo", "status", "route", "value", "updated", "terms", "parties", "fTitle",
  "stDraft", "stActive", "stCompleted", "stCancelled",
  "linkShipment", "gttidPh", "link", "unlink", "linkFailed", "linked", "fBuyer", "fSupplier",
  "noShipments", "noDocuments", "noEntries", "noPayables", "noSheets", "noActivity",
  "commercialNote", "overview", "deleteTrade", "confirmDelete", "deleted",
  "activate", "complete", "migrationNeeded", "migrationSub",
  ...TABS,
];

export default async function TradeDetail({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "trades" });
  const dict = Object.fromEntries(KEYS.map((k) => [k, t(k)]));
  const tt = (k: string) => dict[k] ?? k;

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  const tab = TABS.includes(sp.tab ?? "") ? sp.tab! : "tabOverview";
  const tabHref = (tb: string) => `/${locale}/app/trades/${id}?tab=${tb}`;

  let missing = false;
  let trade: any = null;
  let shipments: any[] = [];
  let documents: any[] = [];
  let entries: any[] = [];
  let sheets: any[] = [];
  let payables: any[] = [];
  try {
    const { data: tr, error } = await sb.from("trades").select("*").eq("id", id).single();
    if (error) throw error;
    if (!tr) redirect({ href: `/${locale}/app/trades`, locale });
    trade = tr;

    const { data: sh } = await sb
      .from("shipments")
      .select("id, gttid, container_number, status, origin, destination, eta, updated_at")
      .eq("trade_id", id)
      .order("updated_at", { ascending: false });
    shipments = sh ?? [];
    const shipIds = shipments.map((s) => s.id);
    const gttids = shipments.map((s) => s.gttid).filter(Boolean);

    if (shipIds.length > 0) {
      const idList = shipIds.join(",");
      const { data: dc } = await sb
        .from("documents")
        .select("id, file_name, created_at")
        .or(`trade_id.eq.${id},shipment_id.in.(${idList})`)
        .order("created_at", { ascending: false })
        .limit(50);
      documents = dc ?? [];
      const { data: en } = await sb
        .from("customs_entries")
        .select("id, entry_no, importer_name, status, updated_at")
        .or(`trade_id.eq.${id},shipment_id.in.(${idList})`)
        .order("updated_at", { ascending: false })
        .limit(50);
      entries = en ?? [];
    } else {
      const { data: dc } = await sb
        .from("documents")
        .select("id, file_name, created_at")
        .eq("trade_id", id)
        .order("created_at", { ascending: false })
        .limit(50);
      documents = dc ?? [];
      const { data: en } = await sb
        .from("customs_entries")
        .select("id, entry_no, importer_name, status, updated_at")
        .eq("trade_id", id)
        .order("updated_at", { ascending: false })
        .limit(50);
      entries = en ?? [];
    }

    const sheetIds = new Set<string>();
    const { data: sheetsByTrade } = await sb
      .from("finance_cost_sheets")
      .select("id, gttid, title, currency, status, updated_at")
      .eq("trade_id", id);
    (sheetsByTrade ?? []).forEach((s) => {
      if (!sheetIds.has(s.id)) {
        sheetIds.add(s.id);
        sheets.push(s);
      }
    });
    if (gttids.length > 0) {
      const { data: sheetsByGttid } = await sb
        .from("finance_cost_sheets")
        .select("id, gttid, title, currency, status, updated_at")
        .in("gttid", gttids);
      (sheetsByGttid ?? []).forEach((s) => {
        if (!sheetIds.has(s.id)) {
          sheetIds.add(s.id);
          sheets.push(s);
        }
      });
    }

    const payIds = new Set<string>();
    const { data: payByTrade } = await sb
      .from("finance_payables")
      .select("id, payee, amount, currency, due_date, status")
      .eq("trade_id", id);
    (payByTrade ?? []).forEach((p) => {
      if (!payIds.has(p.id)) {
        payIds.add(p.id);
        payables.push(p);
      }
    });
    if (gttids.length > 0) {
      const { data: payByGttid } = await sb
        .from("finance_payables")
        .select("id, payee, amount, currency, due_date, status")
        .in("gttid", gttids);
      (payByGttid ?? []).forEach((p) => {
        if (!payIds.has(p.id)) {
          payIds.add(p.id);
          payables.push(p);
        }
      });
    }
  } catch {
    missing = true;
  }

  if (missing || !trade) {
    return (
      <section className="min-h-[75vh] bg-brand-tint-soft">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="rounded-card bg-white p-10 text-center shadow-card">
            <p className="text-lg font-semibold text-ink">{tt("migrationNeeded")}</p>
            <p className="mt-2 text-sm text-ink-soft">{tt("migrationSub")}</p>
          </div>
        </div>
      </section>
    );
  }

  const statusName = (s: string) =>
    (
      {
        draft: tt("stDraft"),
        active: tt("stActive"),
        completed: tt("stCompleted"),
        cancelled: tt("stCancelled"),
      } as Record<string, string>
    )[s] ?? s;

  const activity = [
    ...shipments.map((s) => ({
      at: s.updated_at,
      label: `${s.gttid ?? s.container_number} — ${s.status}`,
      href: s.gttid ? `/${locale}/app/${s.gttid}` : `/${locale}/app/trades/${id}?tab=tabLogistics`,
    })),
    ...documents.map((d) => ({ at: d.created_at, label: d.file_name, href: `/${locale}/app/documents` })),
    ...entries.map((e) => ({
      at: e.updated_at,
      label: `${e.entry_no || "Entry"} — ${e.status}`,
      href: `/${locale}/app/customs`,
    })),
    ...sheets.map((s) => ({ at: s.updated_at, label: s.title, href: `/${locale}/app/finance` })),
  ]
    .filter((a) => a.at)
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 30);

  const card = "rounded-card bg-white p-5 shadow-card";
  const h2 = "text-sm font-bold uppercase tracking-wide text-ink-soft";
  const empty = "rounded-card bg-white p-8 text-center text-sm text-ink-soft shadow-card";

  return (
    <section className="min-h-[75vh] bg-brand-tint-soft">
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <Link href={`/${locale}/app/trades`} className="text-sm font-medium text-brand hover:underline">
          ← {tt("tradeNo")}
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm font-semibold text-brand">{trade.trade_no}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">{trade.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  ST_TONE[trade.status] ?? ST_TONE.draft
                }`}
              >
                {statusName(trade.status)}
              </span>
              <span>{[trade.origin_country, trade.destination_country].filter(Boolean).join(" → ") || "—"}</span>
              {trade.total_value != null && (
                <span className="tabular-nums font-semibold text-ink">
                  {trade.currency} {Number(trade.total_value).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <TradeActions
            messages={dict}
            tradeId={trade.id}
            tradeNo={trade.trade_no}
            status={trade.status}
            locale={locale}
          />
        </div>

        <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200">
          {TABS.map((tb) => (
            <Link
              key={tb}
              href={tabHref(tb)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-semibold ${
                tab === tb ? "border-b-2 border-brand text-brand" : "text-ink-soft hover:text-ink"
              }`}
            >
              {tt(tb)}
            </Link>
          ))}
        </nav>

        <div className="mt-6">
          {tab === "tabOverview" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className={card}>
                <h2 className={h2}>{tt("overview")}</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-soft">{tt("tradeNo")}</dt>
                    <dd className="font-mono">{trade.trade_no}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-soft">{tt("fTitle")}</dt>
                    <dd>{trade.title}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-soft">{tt("terms")}</dt>
                    <dd>{trade.incoterm ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-soft">{tt("route")}</dt>
                    <dd>{[trade.origin_country, trade.destination_country].filter(Boolean).join(" → ") || "—"}</dd>
                  </div>
                </dl>
                {trade.description && <p className="mt-3 text-sm text-ink-soft">{trade.description}</p>}
              </div>
              <div className={card}>
                <h2 className={h2}>{tt("parties")}</h2>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-soft">{tt("fBuyer")}</dt>
                    <dd>{trade.buyer_name ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-soft">{tt("fSupplier")}</dt>
                    <dd>{trade.supplier_name ?? "—"}</dd>
                  </div>
                </dl>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  {[
                    [shipments.length, "tabLogistics"],
                    [documents.length, "tabDocuments"],
                    [entries.length, "tabCustoms"],
                  ].map(([n, tb]) => (
                    <Link key={tb as string} href={tabHref(tb as string)} className="rounded-control bg-slate-50 py-3 hover:bg-slate-100">
                      <p className="text-2xl font-bold text-ink">{n as number}</p>
                      <p className="text-xs text-ink-soft">{tt(tb as string)}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "tabCommercial" && (
            <div className={card}>
              <h2 className={h2}>{tt("tabCommercial")}</h2>
              <p className="mt-2 text-sm text-ink-soft">{tt("commercialNote")}</p>
              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div className="flex justify-between border-b border-slate-50 py-2">
                  <dt className="text-ink-soft">{tt("fBuyer")}</dt>
                  <dd className="font-medium">{trade.buyer_name ?? "—"}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 py-2">
                  <dt className="text-ink-soft">{tt("fSupplier")}</dt>
                  <dd className="font-medium">{trade.supplier_name ?? "—"}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 py-2">
                  <dt className="text-ink-soft">{tt("terms")}</dt>
                  <dd className="font-medium">{trade.incoterm ?? "—"}</dd>
                </div>
                <div className="flex justify-between border-b border-slate-50 py-2">
                  <dt className="text-ink-soft">{tt("value")}</dt>
                  <dd className="font-medium tabular-nums">
                    {trade.total_value != null
                      ? `${trade.currency} ${Number(trade.total_value).toLocaleString()}`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {tab === "tabLogistics" && (
            <div className="space-y-4">
              <div className={card}>
                <LinkForm messages={dict} tradeId={trade.id} />
              </div>
              {shipments.length === 0 ? (
                <div className={empty}>{tt("noShipments")}</div>
              ) : (
                <div className="overflow-x-auto rounded-card bg-white shadow-card">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-ink-soft">
                        <th className="px-4 py-3">GTTID</th>
                        <th className="px-4 py-3">Container</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">ETA</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {shipments.map((s) => (
                        <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            {s.gttid ? (
                              <Link href={`/${locale}/app/${s.gttid}`} className="font-mono font-semibold text-brand hover:underline">
                                {s.gttid}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{s.container_number}</td>
                          <td className="px-4 py-3">{s.status}</td>
                          <td className="px-4 py-3">{s.eta ?? "—"}</td>
                          <td className="px-4 py-3 text-right">
                            {s.gttid && <UnlinkButton messages={dict} gttid={s.gttid} />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "tabCustoms" && (
            entries.length === 0 ? (
              <div className={empty}>{tt("noEntries")}</div>
            ) : (
              <div className="overflow-x-auto rounded-card bg-white shadow-card">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-ink-soft">
                      <th className="px-4 py-3">Entry No.</th>
                      <th className="px-4 py-3">Importer</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id} className="border-b border-slate-50">
                        <td className="px-4 py-3 font-mono">{e.entry_no ?? "—"}</td>
                        <td className="px-4 py-3">{e.importer_name ?? "—"}</td>
                        <td className="px-4 py-3">{e.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {tab === "tabDocuments" && (
            documents.length === 0 ? (
              <div className={empty}>{tt("noDocuments")}</div>
            ) : (
              <ul className="divide-y divide-slate-50 rounded-card bg-white shadow-card">
                {documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="font-medium text-ink">{d.file_name}</span>
                    <span className="text-xs text-ink-soft">{d.created_at?.slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            )
          )}

          {tab === "tabPayments" && (
            payables.length === 0 ? (
              <div className={empty}>{tt("noPayables")}</div>
            ) : (
              <div className="overflow-x-auto rounded-card bg-white shadow-card">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-ink-soft">
                      <th className="px-4 py-3">Payee</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Due</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payables.map((p) => (
                      <tr key={p.id} className="border-b border-slate-50">
                        <td className="px-4 py-3 font-medium">{p.payee}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {p.currency} {Number(p.amount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">{p.due_date ?? "—"}</td>
                        <td className="px-4 py-3">{p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {tab === "tabCosts" && (
            sheets.length === 0 ? (
              <div className={empty}>{tt("noSheets")}</div>
            ) : (
              <ul className="divide-y divide-slate-50 rounded-card bg-white shadow-card">
                {sheets.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <Link href={`/${locale}/app/finance`} className="font-medium text-brand hover:underline">
                      {s.title}
                    </Link>
                    <span className="font-mono text-xs text-ink-soft">{s.gttid ?? ""}</span>
                  </li>
                ))}
              </ul>
            )
          )}

          {tab === "tabActivity" && (
            activity.length === 0 ? (
              <div className={empty}>{tt("noActivity")}</div>
            ) : (
              <ul className="space-y-2">
                {activity.map((a, i) => (
                  <li key={i} className="flex items-center justify-between rounded-card bg-white px-4 py-3 text-sm shadow-card">
                    <Link href={a.href} className="font-medium text-ink hover:text-brand">
                      {a.label}
                    </Link>
                    <span className="text-xs text-ink-soft">{a.at?.slice(0, 16).replace("T", " ")}</span>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </div>
    </section>
  );
}
