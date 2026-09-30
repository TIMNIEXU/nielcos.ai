/* lib/alerts.ts — derive alert items from existing tenant tables.
   Server-side only. Pure w.r.t. i18n: the caller passes pre-translated
   template strings (with %X% placeholders); this module never calls i18n.
   Used by the dashboard page, the control tower, and /api/app/alerts. */

export type AlertSeverity = "high" | "medium" | "low";
export type AlertItem = {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  href: string;
};

/* Pre-translated templates from the caller (dash.* namespace).
   Placeholders: %CONTAINER% %DAYS% %PAYEE% %AMOUNT% %WAREHOUSE% %GTTID% */
export type AlertTemplates = {
  tDemurrage: string;
  dDemurrageOverdue: string;
  dDemurrageSoon: string;
  tPayable: string;
  dPayableOverdue: string;
  tAppt: string;
  dApptMissed: string;
  tHold: string;
  dHold: string;
  tStale: string;
  dStale: string;
};

type Sb = { from: (t: string) => any };

/* Raw rows every alert source needs — fetched once, reused by the
   dashboard for KPIs/tasks too. */
export type AlertInputs = {
  moves: { id: string; container_number: string; last_free_day: string | null; status: string }[];
  payables: { id: string; payee: string; amount: number; currency: string; due_date: string | null }[];
  appts: { id: string; warehouse_name: string; container_number: string | null; appt_at: string | null }[];
  holds: { id: string; gttid: string | null; container_number: string }[];
  stale: { id: string; gttid: string | null; container_number: string; updated_at: string }[];
};

const ACTIVE = ["in_transit", "at_port", "out_for_delivery", "pending_pickup"];

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fill(tpl: string, vars: Record<string, string | number>) {
  let out = tpl;
  for (const [k, v] of Object.entries(vars)) out = out.split(`%${k}%`).join(String(v));
  return out;
}

export async function fetchAlertInputs(sb: Sb, companyId: string): Promise<AlertInputs> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = isoDay(today);
  const weekAgo = new Date(+today - 7 * 86400000).toISOString();

  const [moves, payables, appts, holds, stale] = await Promise.all([
    sb.from("drayage_moves")
      .select("id, container_number, last_free_day, status")
      .eq("company_id", companyId)
      .not("last_free_day", "is", null)
      .not("status", "in", "(completed,cancelled)")
      .limit(200),
    sb.from("finance_payables")
      .select("id, payee, amount, currency, due_date")
      .eq("company_id", companyId)
      .eq("status", "pending")
      .not("due_date", "is", null)
      .lt("due_date", todayStr)
      .order("due_date", { ascending: true })
      .limit(50),
    sb.from("warehouse_appts")
      .select("id, warehouse_name, container_number, appt_at")
      .eq("company_id", companyId)
      .eq("status", "missed")
      .order("appt_at", { ascending: false })
      .limit(50),
    sb.from("shipments")
      .select("id, gttid, container_number")
      .eq("company_id", companyId)
      .eq("status", "on_hold")
      .order("updated_at", { ascending: false })
      .limit(50),
    sb.from("shipments")
      .select("id, gttid, container_number, updated_at")
      .eq("company_id", companyId)
      .in("status", ACTIVE)
      .lt("updated_at", weekAgo)
      .order("updated_at", { ascending: true })
      .limit(50),
  ]);

  return {
    moves: moves.data ?? [],
    payables: payables.data ?? [],
    appts: appts.data ?? [],
    holds: holds.data ?? [],
    stale: stale.data ?? [],
  };
}

function money(amount: number, currency: string) {
  const n = Number(amount) || 0;
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || "USD"}`;
}

/* Pure builder: inputs + templates -> sorted alerts. */
export function buildAlerts(
  inp: AlertInputs,
  tpl: AlertTemplates,
  base: string,
  limit = 20
): AlertItem[] {
  const out: AlertItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Demurrage: overdue (high) / free time ends within 3 days (medium)
  for (const m of inp.moves) {
    if (!m.last_free_day) continue;
    const days = Math.floor((+today - +new Date(m.last_free_day + "T00:00:00")) / 86400000);
    if (days > 0) {
      out.push({
        id: `dem-over-${m.id}`,
        severity: "high",
        title: tpl.tDemurrage,
        detail: fill(tpl.dDemurrageOverdue, { CONTAINER: m.container_number, DAYS: days }),
        href: `${base}/logistics`,
      });
    } else if (days >= -3) {
      out.push({
        id: `dem-soon-${m.id}`,
        severity: "medium",
        title: tpl.tDemurrage,
        detail: fill(tpl.dDemurrageSoon, { CONTAINER: m.container_number, DAYS: Math.max(0, -days) }),
        href: `${base}/logistics`,
      });
    }
  }

  // 2. Overdue payables (high)
  for (const p of inp.payables) {
    const days = p.due_date
      ? Math.floor((+today - +new Date(p.due_date + "T00:00:00")) / 86400000)
      : 0;
    out.push({
      id: `pay-over-${p.id}`,
      severity: "high",
      title: tpl.tPayable,
      detail: fill(tpl.dPayableOverdue, { PAYEE: p.payee, AMOUNT: money(p.amount, p.currency), DAYS: Math.max(0, days) }),
      href: `${base}/finance`,
    });
  }

  // 3. Shipments on hold (medium)
  for (const s of inp.holds) {
    out.push({
      id: `hold-${s.id}`,
      severity: "medium",
      title: tpl.tHold,
      detail: fill(tpl.dHold, { GTTID: s.gttid ?? s.container_number }),
      href: `${base}/freight`,
    });
  }

  // 4. Missed warehouse appointments (medium)
  for (const a of inp.appts) {
    out.push({
      id: `appt-${a.id}`,
      severity: "medium",
      title: tpl.tAppt,
      detail: fill(tpl.dApptMissed, { WAREHOUSE: a.warehouse_name, CONTAINER: a.container_number ?? "—" }),
      href: `${base}/logistics`,
    });
  }

  // 5. Stale shipments — no update for 7+ days (low)
  for (const s of inp.stale) {
    const days = Math.floor((+today - +new Date(s.updated_at)) / 86400000);
    out.push({
      id: `stale-${s.id}`,
      severity: "low",
      title: tpl.tStale,
      detail: fill(tpl.dStale, { GTTID: s.gttid ?? s.container_number, DAYS: days }),
      href: `${base}/freight`,
    });
  }

  const rank: Record<AlertSeverity, number> = { high: 0, medium: 1, low: 2 };
  out.sort((a, b) => rank[a.severity] - rank[b.severity]);
  return out.slice(0, limit);
}

/* Convenience: fetch + build in one call (used by /api/app/alerts). */
export async function deriveAlerts(
  sb: Sb,
  companyId: string,
  tpl: AlertTemplates,
  base: string,
  limit = 20
): Promise<AlertItem[]> {
  const inp = await fetchAlertInputs(sb, companyId);
  return buildAlerts(inp, tpl, base, limit);
}
