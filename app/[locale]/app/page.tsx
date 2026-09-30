import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";
import ShipmentCards from "./ShipmentCards";
import { fetchAlertInputs, buildAlerts, type AlertTemplates } from "@/lib/alerts";
import { intlLocale } from "@/lib/locale";

type Props = { params: Promise<{ locale: string }> };

const ACTIVE = new Set(["in_transit", "at_port", "out_for_delivery", "pending_pickup"]);
const STATUS_ORDER = ["in_transit", "at_port", "out_for_delivery", "pending_pickup", "delivered", "on_hold"];
const STATUS_COLORS: Record<string, string> = {
  in_transit: "#1d4ed8",
  at_port: "#0284c7",
  out_for_delivery: "#7c3aed",
  pending_pickup: "#d97706",
  delivered: "#16a34a",
  on_hold: "#dc2626",
  other: "#8ba0bb",
};

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function money(n: number) {
  return `$${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function AppHome({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("app");
  const td = await getTranslations("dash");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect({ href: "/login", locale });
  }
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect({ href: "/login", locale });
  const uid = user!.id;
  const { data: cid } = await sb.rpc("own_company_id");
  const companyId = (cid as string) ?? "";

  const { data: profile } = await sb
    .from("profiles")
    .select("company_id, companies ( name )")
    .eq("id", uid)
    .single();
  const companyName = (profile?.companies as { name?: string } | null)?.name ?? "";

  // --- Shipments ------------------------------------------------------------
  const { data: shipRaw } = await sb
    .from("shipments")
    .select("id, gttid, container_number, mbl_no, status, origin, destination, eta, updated_at")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false })
    .limit(500);
  const shipments = shipRaw ?? [];
  const inTransit = shipments.filter((s) => ACTIVE.has(s.status)).length;
  const onHold = shipments.filter((s) => s.status === "on_hold").length;

  // --- Payables --------------------------------------------------------------
  const { data: payRaw } = await sb
    .from("finance_payables")
    .select("id, payee, amount, currency, due_date, gttid, status")
    .eq("company_id", companyId)
    .eq("status", "pending")
    .order("due_date", { ascending: true })
    .limit(200);
  const payables = payRaw ?? [];
  const todayStr = isoDay(new Date());
  const overduePayables = payables.filter((p) => p.due_date && p.due_date < todayStr);
  const payTotal = payables.reduce((a, p) => a + (Number(p.amount) || 0), 0);
  const payCurrencies = new Set(payables.map((p) => p.currency).filter(Boolean));
  const payLabel =
    payables.length === 0
      ? money(0)
      : payCurrencies.size <= 1
        ? `${(payTotal).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${[...payCurrencies][0] ?? "USD"}`
        : `${money(payTotal)}*`;

  // --- Duty exposure: duty items on draft sheets with an ETA (forecast) ------
  const { data: sheetsRaw } = await sb
    .from("finance_cost_sheets")
    .select("id, status, eta_date")
    .eq("company_id", companyId)
    .limit(500);
  const sheets = sheetsRaw ?? [];
  const sheetById = new Map(sheets.map((s) => [s.id, s]));
  const { data: itemsRaw } = await sb
    .from("finance_cost_items")
    .select("sheet_id, category, amount, created_at")
    .eq("company_id", companyId)
    .eq("category", "duty")
    .order("created_at", { ascending: true })
    .limit(2000);
  const dutyItems = itemsRaw ?? [];
  const dutyExposure = dutyItems
    .filter((it) => {
      const sh = sheetById.get(it.sheet_id);
      return sh && sh.status === "draft" && sh.eta_date;
    })
    .reduce((a, it) => a + (Number(it.amount) || 0), 0);

  // --- Alerts (shared lib) ----------------------------------------------------
  const alertInputs = await fetchAlertInputs(sb, companyId);
  const tpl: AlertTemplates = {
    tDemurrage: td("alDemurrageT"),
    dDemurrageOverdue: td("alDemurrageOverdueD"),
    dDemurrageSoon: td("alDemurrageSoonD"),
    tPayable: td("alPayableT"),
    dPayableOverdue: td("alPayableOverdueD"),
    tAppt: td("alApptT"),
    dApptMissed: td("alApptMissedD"),
    tHold: td("alHoldT"),
    dHold: td("alHoldD"),
    tStale: td("alStaleT"),
    dStale: td("alStaleD"),
  };
  const base = `/${locale}/app`;
  const alerts = buildAlerts(alertInputs, tpl, base, 6);

  // --- Tasks ------------------------------------------------------------------
  const today = new Date();
  const daysOver = (d: string) =>
    Math.max(0, Math.floor((+new Date(isoDay(today) + "T00:00:00") - +new Date(d + "T00:00:00")) / 86400000));
  const taskPayables = overduePayables.slice(0, 5).map((p) => ({
    id: `tp-${p.id}`,
    text: td("taskOverduePayable")
      .split("%PAYEE%").join(p.payee)
      .split("%AMOUNT%").join(money(p.amount))
      .split("%DAYS%").join(String(p.due_date ? daysOver(p.due_date) : 0)),
    href: `${base}/finance`,
  }));
  const taskAppts = alertInputs.appts.slice(0, 5).map((a) => ({
    id: `ta-${a.id}`,
    text: td("taskMissedAppt")
      .split("%WAREHOUSE%").join(a.warehouse_name)
      .split("%CONTAINER%").join(a.container_number ?? "—"),
    href: `${base}/logistics`,
  }));
  // Shipments arriving within 14 days with no linked documents
  const in14 = isoDay(new Date(+today + 14 * 86400000));
  const arriving = shipments.filter(
    (s) => s.eta && s.eta >= todayStr && s.eta <= in14 && ACTIVE.has(s.status)
  );
  let taskDocs: { id: string; text: string; href: string }[] = [];
  if (arriving.length) {
    const { data: docs } = await sb
      .from("documents")
      .select("shipment_id")
      .eq("company_id", companyId)
      .in("shipment_id", arriving.map((s) => s.id));
    const hasDoc = new Set((docs ?? []).map((d: any) => d.shipment_id));
    taskDocs = arriving
      .filter((s) => !hasDoc.has(s.id))
      .slice(0, 5)
      .map((s) => ({
        id: `td-${s.id}`,
        text: td("taskDocsMissing").split("%GTTID%").join(s.gttid ?? s.container_number),
        href: `${base}/documents`,
      }));
  }
  const tasks = [...taskPayables, ...taskAppts, ...taskDocs].slice(0, 8);

  // --- AI daily briefing (rule-generated, numbers only) ------------------------
  const attention = onHold + overduePayables.length;
  const summary = [
    td("summary1").split("%INTRANSIT%").join(String(inTransit)).split("%ATTENTION%").join(String(attention)),
    td("summary2").split("%PAYABLE%").join(payLabel).split("%DUTY%").join(money(dutyExposure)),
  ];

  // --- Spend trend: duty items per month, last 6 months -------------------------
  const months: { key: string; label: string; total: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      key,
      label: d.toLocaleDateString(intlLocale(locale), { month: "short" }),
      total: 0,
    });
  }
  const monthIdx = new Map(months.map((m, i) => [m.key, i]));
  for (const it of dutyItems) {
    const dt = new Date(it.created_at);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    const i = monthIdx.get(key);
    if (i != null) months[i].total += Number(it.amount) || 0;
  }
  const maxSpend = Math.max(1, ...months.map((m) => m.total));

  // --- Status donut --------------------------------------------------------------
  const statusCounts = new Map<string, number>();
  for (const s of shipments) statusCounts.set(s.status, (statusCounts.get(s.status) ?? 0) + 1);
  const donutTotal = Math.max(1, shipments.length);
  const donutSegs = [...statusCounts.entries()]
    .sort((a, b) => {
      const ai = STATUS_ORDER.indexOf(a[0]);
      const bi = STATUS_ORDER.indexOf(b[0]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    })
    .map(([st, n]) => ({
      st,
      n,
      label: (() => { try { return t(`statusNames.${st}`); } catch { return st; } })(),
      color: STATUS_COLORS[st] ?? STATUS_COLORS.other,
      frac: n / donutTotal,
    }));

  const sevTone: Record<string, string> = {
    high: "bg-risk-tint text-risk ring-risk/20",
    medium: "bg-warn-tint text-warn ring-warn/20",
    low: "bg-sky-tint text-sky ring-sky/20",
  };
  const sevName = (s: string) =>
    s === "high" ? td("sevHigh") : s === "medium" ? td("sevMedium") : td("sevLow");

  const kpis = [
    { label: td("kpiInTransit"), value: String(inTransit), href: `${base}/freight`, tone: "text-brand" },
    { label: td("kpiPayables"), value: payLabel, href: `${base}/finance`, tone: "text-warn" },
    { label: td("kpiDutyExposure"), value: money(dutyExposure), href: `${base}/finance`, tone: "text-vio" },
    { label: td("kpiAttention"), value: String(attention), href: `${base}/tower`, tone: attention > 0 ? "text-risk" : "text-ok" },
  ];

  const modules: [string, string][] = [
    [t("customs"), `${base}/customs`],
    [t("freightNav"), `${base}/freight`],
    [t("complianceNav"), `${base}/compliance`],
    [t("documentsNav"), `${base}/documents`],
    [t("productsNav"), `${base}/products`],
    [t("suppliersNav"), `${base}/suppliers`],
    [t("logisticsNav"), `${base}/logistics`],
    [t("financeNav"), `${base}/finance`],
    [t("assistantNav"), `${base}/assistant`],
    [t("towerNav"), `${base}/tower`],
    [t("executiveNav"), `${base}/executive`],
    [t("integrationsNav"), `${base}/integrations`],
  ];

  return (
    <section className="min-h-[75vh] bg-brand-tint-soft">
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.22em] text-brand uppercase">
              {t("workspace")}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">
              {companyName || t("myShipments")}
            </h1>
            <p className="mt-1 text-ink-soft">{t("sub")}</p>
          </div>
          <SignOutButton label={t("signOut")} />
        </div>

        {/* AI daily briefing */}
        <div className="mt-6 rounded-2xl border border-brand/20 bg-white p-5 shadow-card">
          <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">✨ {td("secSummary")}</p>
          {shipments.length === 0 && payables.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">{td("noData")}</p>
          ) : (
            <div className="mt-2 space-y-1">
              {summary.map((s, i) => (
                <p key={i} className="text-sm leading-relaxed text-ink">{s}</p>
              ))}
            </div>
          )}
        </div>

        {/* KPI row */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <Link
              key={k.label}
              href={k.href}
              className="rounded-2xl border border-line bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <p className={`truncate text-3xl font-bold ${k.tone}`}>{k.value}</p>
              <p className="mt-1 text-sm font-medium text-ink-soft">{k.label} →</p>
            </Link>
          ))}
        </div>

        {/* trend + donut */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="text-sm font-bold tracking-wide text-ink uppercase">{td("secTrend")}</h2>
            {months.every((m) => m.total === 0) ? (
              <p className="mt-6 py-8 text-center text-sm text-ink-soft">{td("noData")}</p>
            ) : (
              <svg viewBox="0 0 360 170" className="mt-3 w-full" role="img" aria-label={td("secTrend")}>
                {months.map((m, i) => {
                  const h = Math.max(4, (m.total / maxSpend) * 110);
                  const x = 20 + i * 56;
                  return (
                    <g key={m.key}>
                      <rect x={x} y={130 - h} width={34} height={h} rx={6} fill="#1d4ed8" opacity={0.85} />
                      <text x={x + 17} y={148} textAnchor="middle" fontSize={11} fill="#5d6f89">{m.label}</text>
                      {m.total > 0 && (
                        <text x={x + 17} y={122 - h} textAnchor="middle" fontSize={10} fontWeight={700} fill="#0e1e38">
                          ${(m.total / 1000).toFixed(m.total >= 10000 ? 0 : 1)}k
                        </text>
                      )}
                    </g>
                  );
                })}
                <line x1={10} y1={130} x2={350} y2={130} stroke="#e3e9f3" strokeWidth={1} />
              </svg>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="text-sm font-bold tracking-wide text-ink uppercase">{td("secStatus")}</h2>
            {shipments.length === 0 ? (
              <p className="mt-6 py-8 text-center text-sm text-ink-soft">{td("noData")}</p>
            ) : (
              <div className="mt-3 flex items-center gap-6">
                <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" role="img" aria-label={td("secStatus")}>
                  {(() => {
                    let acc = 0;
                    const C = 2 * Math.PI * 54;
                    return donutSegs.map((s) => {
                      const dash = `${Math.max(0, s.frac * C - 2)} ${C}`;
                      const off = -acc * C;
                      acc += s.frac;
                      return (
                        <circle
                          key={s.st}
                          cx={70} cy={70} r={54} fill="none"
                          stroke={s.color} strokeWidth={18}
                          strokeDasharray={dash} strokeDashoffset={off}
                          transform="rotate(-90 70 70)"
                        />
                      );
                    });
                  })()}
                  <text x={70} y={66} textAnchor="middle" fontSize={22} fontWeight={800} fill="#0e1e38">{shipments.length}</text>
                  <text x={70} y={86} textAnchor="middle" fontSize={11} fill="#5d6f89">{td("kpiInTransit").split(" ")[0]}</text>
                </svg>
                <ul className="min-w-0 flex-1 space-y-1.5">
                  {donutSegs.map((s) => (
                    <li key={s.st} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                      <span className="min-w-0 flex-1 truncate text-ink-soft">{s.label}</span>
                      <span className="font-mono font-bold text-ink">{s.n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* alerts + tasks */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-wide text-ink uppercase">⚠️ {td("secAlerts")}</h2>
              <Link href={`${base}/tower`} className="text-xs font-bold text-brand-deep hover:underline">{td("viewAll")} →</Link>
            </div>
            {alerts.length === 0 ? (
              <p className="mt-4 rounded-xl bg-ok-tint px-4 py-3 text-sm font-medium text-ok">{td("alertEmpty")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {alerts.map((a) => (
                  <li key={a.id}>
                    <Link href={a.href} className="flex items-start gap-3 rounded-xl border border-line-soft px-3 py-2.5 transition-colors hover:border-brand/40 hover:bg-brand-tint-soft/50">
                      <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${sevTone[a.severity]}`}>
                        {sevName(a.severity)}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-ink">{a.title}</span>
                        <span className="block truncate text-xs text-ink-soft">{a.detail}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="text-sm font-bold tracking-wide text-ink uppercase">✅ {td("secTasks")}</h2>
            {tasks.length === 0 ? (
              <p className="mt-4 rounded-xl bg-brand-tint-soft px-4 py-3 text-sm font-medium text-ink-soft">{td("taskEmpty")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {tasks.map((x) => (
                  <li key={x.id}>
                    <Link href={x.href} className="flex items-center gap-3 rounded-xl border border-line-soft px-3 py-2.5 text-sm text-ink transition-colors hover:border-brand/40 hover:bg-brand-tint-soft/50">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line text-[11px] text-ink-soft">○</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{x.text}</span>
                      <span className="shrink-0 text-brand-deep">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* modules */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-ink">{td("secModules")}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {modules.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-full border border-brand/30 bg-white px-4 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-tint"
              >
                {label} →
              </Link>
            ))}
          </div>
        </div>

        {/* recent shipments */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-ink">{t("myShipments")}</h2>
          <div className="mt-4">
            {shipments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-ink-soft">
                {t("empty")}
              </div>
            ) : (
              <ShipmentCards shipments={shipments.slice(0, 12)} locale={locale} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
