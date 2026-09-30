"use server";

import { createClient } from "@/lib/supabase/server";

type TradeInput = {
  title: string;
  incoterm?: string;
  origin_country?: string;
  destination_country?: string;
  buyer_name?: string;
  supplier_name?: string;
  currency?: string;
  total_value?: string;
  description?: string;
};

async function companyId() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("unauthorized");
  const { data: profile } = await sb
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile?.company_id) throw new Error("no company");
  return { sb, uid: user.id, company_id: profile.company_id as string };
}

export async function createTrade(input: TradeInput) {
  const { sb, uid, company_id } = await companyId();
  const { data: tradeNo } = await sb.rpc("next_trade_no");
  const { data, error } = await sb
    .from("trades")
    .insert({
      company_id,
      trade_no: tradeNo ?? `NIEL-TRD-${Date.now()}`,
      title: input.title.trim(),
      incoterm: input.incoterm || null,
      origin_country: input.origin_country || null,
      destination_country: input.destination_country || null,
      buyer_name: input.buyer_name || null,
      supplier_name: input.supplier_name || null,
      currency: input.currency || "USD",
      total_value: input.total_value ? Number(input.total_value) : null,
      description: input.description || null,
      created_by: uid,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function linkShipment(tradeId: string, gttid: string) {
  const sb = await createClient();
  const { error } = await sb.rpc("link_shipment_to_trade", {
    p_trade_id: tradeId,
    p_gttid: gttid.trim().toUpperCase(),
  });
  if (error) throw new Error(error.message);
}

export async function unlinkShipment(gttid: string) {
  const sb = await createClient();
  const { error } = await sb.rpc("link_shipment_to_trade", {
    p_trade_id: null,
    p_gttid: gttid.trim().toUpperCase(),
  });
  if (error) throw new Error(error.message);
}

export async function setTradeStatus(tradeId: string, status: string) {
  const { sb, company_id } = await companyId();
  const { error } = await sb
    .from("trades")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", tradeId)
    .eq("company_id", company_id);
  if (error) throw new Error(error.message);
}

export async function deleteTrade(tradeId: string) {
  const { sb, company_id } = await companyId();
  const { error } = await sb
    .from("trades")
    .delete()
    .eq("id", tradeId)
    .eq("company_id", company_id);
  if (error) throw new Error(error.message);
}
