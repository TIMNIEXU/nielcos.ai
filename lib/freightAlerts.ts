/* Freight milestone alerts — rule-based, computed from the tenant's
   own shipment rows. No carrier EDI yet; rules run on milestones/ETA/
   status already in the system. */

export type FreightAlert = {
  level: "danger" | "warning" | "info";
  code: "on_hold" | "overdue_eta" | "eta_soon" | "stale";
  shipmentId: string;
  gttid: string;
  mbl: string;
  eta: string | null;
};

const ACTIVE = ["pending_pickup", "at_port", "in_transit", "out_for_delivery", "on_hold"];

type Row = {
  id: string;
  gttid: string | null;
  mbl_no: string | null;
  status: string | null;
  eta: string | null;
  updated_at: string | null;
};

export function buildAlerts(rows: Row[]): FreightAlert[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const out: FreightAlert[] = [];
  const seen = new Set<string>();

  const push = (a: FreightAlert) => {
    const k = `${a.code}:${a.shipmentId}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(a);
  };

  for (const r of rows) {
    if (!r.id) continue;
    const base = {
      shipmentId: r.id,
      gttid: r.gttid ?? "",
      mbl: r.mbl_no ?? "",
      eta: r.eta,
    };
    if (r.status === "on_hold") {
      push({ ...base, level: "danger", code: "on_hold" });
      continue;
    }
    if (!ACTIVE.includes(r.status ?? "")) continue;

    const eta = r.eta ? new Date(r.eta) : null;
    if (eta && !isNaN(eta.getTime())) {
      const etaDay = new Date(eta.getFullYear(), eta.getMonth(), eta.getDate());
      const diffDays = Math.round((etaDay.getTime() - today.getTime()) / 86400000);
      if (diffDays < 0) push({ ...base, level: "danger", code: "overdue_eta" });
      else if (diffDays <= 3) push({ ...base, level: "warning", code: "eta_soon" });
    }
    if (r.updated_at) {
      const upd = new Date(r.updated_at);
      if (!isNaN(upd.getTime()) && now.getTime() - upd.getTime() > 7 * 86400000) {
        push({ ...base, level: "info", code: "stale" });
      }
    }
  }

  const rank = { danger: 0, warning: 1, info: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}
