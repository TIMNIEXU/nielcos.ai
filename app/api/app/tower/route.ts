import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* Control Tower — one-screen roll-up of the company's shipments,
   open exception tickets, derived risk alerts, and regulatory updates.
   Read-only: aggregates existing tables, no new tables needed. */

async function companyId(sb: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.rpc("own_company_id");
  return (data as string | null) ?? null;
}

const ACTIVE_STATUSES = new Set([
  "in_transit",
  "at_port",
  "out_for_delivery",
  "pending_pickup",
  "on_hold",
]);

function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / 86400000);
}

function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* GET /api/app/tower?q= — the company's control-tower snapshot. */
export async function GET(req: NextRequest) {
  const sb = await createClient();
  const cid = await companyId(sb);
  if (!cid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim().toUpperCase() ?? "";
  const now = new Date();
  const today = todayStr(now);

  // --- Shipments ---------------------------------------------------------
  let shipQuery = sb
    .from("shipments")
    .select(
      "id, gttid, mbl_no, container_number, containers, status, origin, destination, current_location, eta, milestones, updated_at"
    )
    .eq("company_id", cid)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (q)
    shipQuery = shipQuery.or(
      `mbl_no.ilike.%${q}%,container_number.ilike.%${q}%,gttid.ilike.%${q}%`
    );
  const { data: shipmentsRaw, error: shipErr } = await shipQuery;
  if (shipErr) return NextResponse.json({ error: "db_error", detail: shipErr.message }, { status: 500 });
  const shipments = (shipmentsRaw ?? []).map((s: any) => {
    const ms: any[] = Array.isArray(s.milestones) ? s.milestones : [];
    const done = ms.filter((m) => m?.at || m?.date).length;
    return {
      ...s,
      milestones: ms.slice(-4),
      progress: ms.length ? Math.round((done / ms.length) * 100) : 0,
    };
  });
  const active = shipments.filter((s: any) => ACTIVE_STATUSES.has(s.status));

  // --- Exception tickets (existing freight_exceptions table) ---------------
  const { data: excRaw, error: excErr } = await sb
    .from("freight_exceptions")
    .select(
      "id, type, title, note, status, created_at, updated_at, shipments ( gttid, mbl_no, container_number )"
    )
    .eq("company_id", cid)
    .neq("status", "resolved")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (excErr) return NextResponse.json({ error: "db_error", detail: excErr.message }, { status: 500 });
  const exceptions = excRaw ?? [];

  // --- Derived risks ------------------------------------------------------
  type Risk = {
    kind: string;
    severity: "high" | "medium" | "low";
    title: string;
    title_zh: string;
    detail: string;
    detail_zh: string;
    ref: string | null;
  };
  const risks: Risk[] = [];
  let demurrageExposure = 0;

  // Demurrage / detention from drayage moves
  const { data: moves } = await sb
    .from("drayage_moves")
    .select("id, container_number, mbl, gttid, status, last_free_day, demurrage_rate")
    .eq("company_id", cid)
    .not("last_free_day", "is", null)
    .neq("status", "completed")
    .neq("status", "cancelled")
    .limit(200);
  for (const m of moves ?? []) {
    const free = new Date(`${m.last_free_day}T00:00:00`);
    const daysLeft = daysBetween(free, now);
    if (daysLeft < 0) {
      const over = -daysLeft;
      const rate = Number(m.demurrage_rate ?? 0);
      const est = over * rate;
      demurrageExposure += est;
      risks.push({
        kind: "demurrage",
        severity: "high",
        title: `Container ${m.container_number} past free time by ${over}d`,
        title_zh: `柜 ${m.container_number} 已超免费用箱期 ${over} 天`,
        detail: rate > 0 ? `Est. exposure $${est.toFixed(0)} @ $${rate}/day` : "Demurrage accruing",
        detail_zh: rate > 0 ? `预估敞口 $${est.toFixed(0)}（$${rate}/天）` : "滞期费正在累积",
        ref: m.gttid ?? m.mbl ?? m.container_number,
      });
    } else if (daysLeft <= 3) {
      risks.push({
        kind: "demurrage",
        severity: "medium",
        title: `Container ${m.container_number} free time ends in ${daysLeft}d`,
        title_zh: `柜 ${m.container_number} 免费用箱期 ${daysLeft} 天后到期`,
        detail: m.last_free_day,
        detail_zh: m.last_free_day,
        ref: m.gttid ?? m.mbl ?? m.container_number,
      });
    }
  }

  // Overdue payables
  const { data: payables } = await sb
    .from("finance_payables")
    .select("id, payee, amount, currency, due_date, gttid")
    .eq("company_id", cid)
    .eq("status", "pending")
    .not("due_date", "is", null)
    .lt("due_date", today)
    .limit(100);
  let overdueTotal = 0;
  for (const p of payables ?? []) {
    const over = daysBetween(now, new Date(`${p.due_date}T00:00:00`));
    overdueTotal += Number(p.amount ?? 0);
    risks.push({
      kind: "payable",
      severity: "high",
      title: `Payable to ${p.payee} overdue ${over}d`,
      title_zh: `应付 ${p.payee} 逾期 ${over} 天`,
      detail: `${p.currency} ${Number(p.amount ?? 0).toLocaleString()} · due ${p.due_date}`,
      detail_zh: `${p.currency} ${Number(p.amount ?? 0).toLocaleString()} · 到期 ${p.due_date}`,
      ref: p.gttid,
    });
  }

  // Missed warehouse appointments
  const { data: appts } = await sb
    .from("warehouse_appts")
    .select("id, warehouse_name, appt_at, container_number, reference, status")
    .eq("company_id", cid)
    .eq("status", "missed")
    .order("appt_at", { ascending: false })
    .limit(50);
  for (const a of appts ?? []) {
    risks.push({
      kind: "warehouse",
      severity: "medium",
      title: `Missed warehouse appointment at ${a.warehouse_name}`,
      title_zh: `${a.warehouse_name} 仓库预约已错过`,
      detail: [a.appt_at ? String(a.appt_at).slice(0, 16).replace("T", " ") : null, a.container_number, a.reference]
        .filter(Boolean)
        .join(" · "),
      detail_zh: [a.appt_at ? String(a.appt_at).slice(0, 16).replace("T", " ") : null, a.container_number, a.reference]
        .filter(Boolean)
        .join(" · "),
      ref: a.container_number,
    });
  }

  // On-hold shipments
  for (const s of shipments) {
    if (s.status === "on_hold") {
      risks.push({
        kind: "hold",
        severity: "high",
        title: `Shipment ${s.gttid ?? s.mbl_no ?? s.container_number} on hold`,
        title_zh: `货运 ${s.gttid ?? s.mbl_no ?? s.container_number} 被暂扣`,
        detail: [s.current_location, s.origin, s.destination].filter(Boolean).join(" → "),
        detail_zh: [s.current_location, s.origin, s.destination].filter(Boolean).join(" → "),
        ref: s.gttid,
      });
    }
  }

  // Stale shipments — active but no update in 7+ days
  for (const s of active) {
    if (s.status === "on_hold") continue;
    const upd = s.updated_at ? new Date(s.updated_at) : null;
    if (upd && daysBetween(now, upd) >= 7) {
      const days = daysBetween(now, upd);
      risks.push({
        kind: "stale",
        severity: "low",
        title: `Shipment ${s.gttid ?? s.mbl_no ?? s.container_number} quiet for ${days}d`,
        title_zh: `货运 ${s.gttid ?? s.mbl_no ?? s.container_number} 已 ${days} 天无动态`,
        detail: s.current_location ?? s.status,
        detail_zh: s.current_location ?? s.status,
        ref: s.gttid,
      });
    }
  }

  const sevRank = { high: 0, medium: 1, low: 2 };
  risks.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);

  // --- Regulatory updates (global, latest 5) -------------------------------
  const { data: regulatory } = await sb
    .from("compliance_updates")
    .select("id, title, title_zh, effective_date, created_at")
    .order("effective_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json({
    kpis: {
      activeShipments: active.length,
      openExceptions: exceptions.length,
      riskCount: risks.length,
      demurrageExposure: Math.round(demurrageExposure * 100) / 100,
      overduePayables: { count: (payables ?? []).length, total: Math.round(overdueTotal * 100) / 100 },
    },
    exceptions,
    risks,
    shipments,
    regulatory: regulatory ?? [],
  });
}
