/* Global Trade Case helper — one GTTID per trade transaction.
   Canonical model: Customer/Tenant → Trade Transaction (GTTID) →
   multiple Service Orders (SO-xxxxxx). Never mint a bare per-SO GTTID;
   always go through ensureTradeCase() so every order/shipment/entry/
   payment hangs off the same case. */

type Sb = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  from: (table: string) => any;
};

export type TradeCase = {
  id: string;
  gttid: string;
  trade_no: string;
  title: string;
  status: string;
  source_case_id: string | null;
};

/* Find-or-create the trade case for a company. When sourceCaseId (the
   nielsc.com SC-2026-XXXXX) is given, one SC case maps to exactly one
   trade — all its service orders share the trade's GTTID. */
export async function ensureTradeCase(
  sb: Sb,
  opts: { companyId: string; sourceCaseId?: string | null; title?: string }
): Promise<TradeCase> {
  const { companyId, sourceCaseId, title } = opts;

  if (sourceCaseId) {
    const { data: existing } = await sb
      .from("trades")
      .select("id, gttid, trade_no, title, status, source_case_id")
      .eq("company_id", companyId)
      .eq("source_case_id", sourceCaseId)
      .maybeSingle();
    if (existing) return existing as TradeCase;
  }

  const { data: tradeNo } = await sb.rpc("next_trade_no");
  const { data: gttid } = await sb.rpc("next_gttid");
  const { data: created, error } = await sb
    .from("trades")
    .insert({
      company_id: companyId,
      trade_no: (tradeNo as string) ?? `NIEL-TRD-${Date.now()}`,
      gttid: (gttid as string) ?? null,
      title: (title ?? sourceCaseId ?? "Trade case").slice(0, 200),
      status: "active",
      source_case_id: sourceCaseId ?? null,
    })
    .select("id, gttid, trade_no, title, status, source_case_id")
    .single();
  if (error || !created) throw new Error("trade_create_failed");
  return created as TradeCase;
}
