import type { ToolDef } from "./provider";
import { createClient } from "@/lib/supabase/server";

/* GRI-001 V2 — deterministic tools for the Import Box LLM.
   The LLM may ONLY organize and explain. Every number it reports must come
   from one of these tools. Tools reuse the existing public APIs / tables
   (duty-lookup, compliance_updates, CBP fee schedules) — no new math. */

export const IMPORT_BOX_TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "lookup_duty",
      description:
        "Look up real US import duty data for a product: HTS candidates with descriptions, MFN rate, and Section 232 / 301 / 301-FL additional-duty suggestions with 9903 codes. Use when the user names a product or gives an HTS code.",
      parameters: {
        type: "object",
        properties: {
          description: { type: "string", description: "Product description in any language" },
          hts: { type: "string", description: "HTS code digits if the user gave one" },
          origin: { type: "string", description: "Country of origin, e.g. China. Default China." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_regulations",
      description:
        "Search recent US trade/compliance regulatory updates (Federal Register radar, with Chinese translations) for PGA requirements, bans, or rule changes affecting a product.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Keywords, e.g. 'aluminum furniture', 'FDA food contact'" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "estimate_fees",
      description:
        "Compute deterministic CBP entry fees: Merchandise Processing Fee (0.3464%, FY2026/FY2027 min/max) and Harbor Maintenance Fee (0.125%, ocean only).",
      parameters: {
        type: "object",
        properties: {
          value_usd: { type: "number", description: "Shipment customs value in USD" },
          mode: { type: "string", enum: ["ocean", "air"], description: "Transport mode" },
          entry_date: { type: "string", description: "Expected entry date YYYY-MM-DD, default today" },
        },
        required: ["value_usd"],
      },
    },
  },
];

export type ToolCtx = { baseUrl: string };

function mpfSchedule(entryDate: string) {
  const fy27 = entryDate >= "2026-10-01"; // FY2027 begins 2026-10-01 (CBP notice Jul 2026)
  return {
    rate: 0.3464,
    min: fy27 ? 34.58 : 33.58,
    max: fy27 ? 670.86 : 651.5,
    fy: fy27 ? "FY2027" : "FY2026",
  };
}

export async function runTool(
  name: string,
  rawArgs: string,
  ctx: ToolCtx
): Promise<string> {
  let args: any = {};
  try {
    args = JSON.parse(rawArgs || "{}");
  } catch {
    return JSON.stringify({ error: "bad_arguments" });
  }

  if (name === "lookup_duty") {
    const p = new URLSearchParams();
    const htsDigits = String(args.hts ?? "").replace(/[^0-9]/g, "");
    if (htsDigits.length >= 6) p.set("hts", htsDigits);
    else if (args.description) p.set("description", String(args.description).slice(0, 300));
    else return JSON.stringify({ error: "provide description or hts" });
    p.set("origin", String(args.origin || "China").slice(0, 40));
    try {
      const r = await fetch(`${ctx.baseUrl}/api/public/duty-lookup?${p.toString()}`);
      const d = await r.json();
      return JSON.stringify(d).slice(0, 6000);
    } catch (e) {
      return JSON.stringify({ error: "lookup_failed", detail: (e as Error)?.message });
    }
  }

  if (name === "search_regulations") {
    const q = String(args.query ?? "").slice(0, 120).toLowerCase();
    if (!q) return JSON.stringify({ error: "provide query" });
    try {
      const sb = await createClient();
      // Table is small (weekly radar); filter in JS to avoid PostgREST .or() parsing pitfalls.
      const { data, error } = await sb
        .from("compliance_updates")
        .select("title, title_zh, published_at")
        .order("published_at", { ascending: false })
        .limit(120);
      if (error) return JSON.stringify({ error: "db_error" });
      const hits = (data ?? [])
        .filter((r: any) =>
          `${r.title ?? ""} ${r.title_zh ?? ""}`.toLowerCase().includes(q)
        )
        .slice(0, 5)
        .map((r: any) => ({ title: r.title, title_zh: r.title_zh, published_at: r.published_at }));
      return JSON.stringify({ query: args.query, hits });
    } catch (e) {
      return JSON.stringify({ error: "db_failed", detail: (e as Error)?.message });
    }
  }

  if (name === "estimate_fees") {
    const v = Number(args.value_usd);
    if (!Number.isFinite(v) || v < 0)
      return JSON.stringify({ error: "value_usd must be a non-negative number" });
    const mode = args.mode === "air" ? "air" : "ocean";
    const entryDate =
      /^\d{4}-\d{2}-\d{2}$/.test(String(args.entry_date ?? ""))
        ? String(args.entry_date)
        : new Date().toISOString().slice(0, 10);
    const sched = mpfSchedule(entryDate);
    const mpfRaw = (v * sched.rate) / 100;
    const mpf = v > 0 ? Math.min(sched.max, Math.max(sched.min, mpfRaw)) : 0;
    const hmf = mode === "ocean" && v > 0 ? (v * 0.125) / 100 : 0;
    return JSON.stringify({
      value_usd: v, mode, entry_date: entryDate, mpf_fy: sched.fy,
      mpf_usd: Math.round(mpf * 100) / 100,
      hmf_usd: Math.round(hmf * 100) / 100,
    });
  }

  return JSON.stringify({ error: `unknown_tool: ${name}` });
}
