/* Trade-case AI analysis — deterministic, evidence-chained, no invented numbers.
   Same reference data and matchers as the public free tools (duty-lookup,
   ad-cvd-watch): keyword HTS candidates → MFN + 232/301 duty lines →
   PGA flags → AD/CVD watchlist hits. Output is candidates + risk flags,
   never a legal classification or a filing-ready rate. */

import { createClient } from "@/lib/supabase/server";
import { suggestHts, matchPga, type PgaRule } from "@/lib/hts";
import { suggestAdditionalDuties, type DutyRule } from "@/lib/additionalDuties";
import { fetchRefTable } from "@/lib/dutyData";
import { fetchWatchEntries } from "@/lib/adcvdData";

export type IntelCandidate = {
  hts_no: string;
  description: string;
  score: number;
  rate_text: string | null;
};

export type IntelDuty = {
  duty_type: string;
  rate: number | null;
  source?: string;
  note?: string;
};

export type TradeIntel = {
  ok: boolean;
  description: string;
  origin: string;
  candidates: IntelCandidate[];
  top: {
    hts_no: string;
    description: string;
    general_rate: number | null;
    rate_text: string | null;
    duties: IntelDuty[];
    pga: { agency: string; agency_cn: string; note: string }[];
  } | null;
  watch: {
    product_keyword: string;
    hts_prefix: string | null;
    origin: string;
    case_type: string;
    status: string;
    note: string | null;
  }[];
  error?: string;
};

export async function analyzeTradeCase(
  description: string,
  origin: string
): Promise<TradeIntel> {
  const desc = description.trim().slice(0, 300);
  const org = origin.trim().slice(0, 40);
  const base: TradeIntel = {
    ok: false,
    description: desc,
    origin: org,
    candidates: [],
    top: null,
    watch: [],
  };
  if (!desc) return { ...base, error: "no_description" };

  try {
    const sb = await createClient();

    /* 1. HTS candidates */
    const rows = await fetchRefTable(sb, "hts_schedule", "hts_no, description, general_rate, keywords, rate_text");
    const cands = suggestHts(desc, (rows ?? []) as any[], 3).map((c: any) => {
      const row = (rows ?? []).find((r: any) => r.hts_no === c.hts_no) as any;
      return {
        hts_no: c.hts_no,
        description: c.description,
        score: c.score,
        rate_text: row?.rate_text ?? null,
      };
    });
    base.candidates = cands;

    /* 2. Duty detail for the top candidate */
    if (cands.length > 0) {
      const top = cands[0];
      const digits = top.hts_no.replace(/[^0-9]/g, "");
      const { data: row } = await sb
        .from("hts_schedule")
        .select("hts_no, description, general_rate, rate_text")
        .eq("hts_no", top.hts_no)
        .maybeSingle();
      const dutyRows = await fetchRefTable(sb, "additional_duties", "*");
      const suggestions = suggestAdditionalDuties(digits, org, "", (dutyRows ?? []) as DutyRule[]);
      const duties: IntelDuty[] = (suggestions ?? [])
        .filter((s: any) => s.kind === "rate" && s.rate != null)
        .map((s: any) => ({
          duty_type: s.duty_type ?? "—",
          rate: s.rate ?? null,
          source: s.source ?? undefined,
          note: s.note ?? undefined,
        }));
      let pga: { agency: string; agency_cn: string; note: string }[] = [];
      try {
        const { data: pgaRules } = await sb.from("pga_rules").select("hts_prefix, agency, agency_cn, note");
        pga = matchPga(top.hts_no, (pgaRules ?? []) as PgaRule[]).map((r) => ({
          agency: r.agency,
          agency_cn: r.agency_cn,
          note: r.note,
        }));
      } catch { /* advisory only */ }
      base.top = {
        hts_no: top.hts_no,
        description: (row as any)?.description ?? top.description,
        general_rate: (row as any)?.general_rate ?? null,
        rate_text: (row as any)?.rate_text ?? top.rate_text,
        duties,
        pga,
      };
    }

    /* 3. AD/CVD watchlist */
    try {
      const entries = await fetchWatchEntries(200);
      const kw = desc.split(/\s+/).slice(0, 3).join(" ").toLowerCase();
      base.watch = entries
        .filter((e) => e.product_keyword.toLowerCase().includes(kw) || kw.includes(e.product_keyword.toLowerCase()))
        .filter((e) => !org || e.origin === org)
        .slice(0, 10)
        .map((e) => ({
          product_keyword: e.product_keyword,
          hts_prefix: e.hts_prefix ?? null,
          origin: e.origin,
          case_type: e.case_type,
          status: e.status,
          note: e.note ?? null,
        }));
    } catch { /* advisory only */ }

    base.ok = true;
    return base;
  } catch {
    return { ...base, error: "db_error" };
  }
}
