/* Phase-1 verification for the Section 232 scope matcher (customs_v23).
   Fixtures mirror production rules: v10 List 3 at 8-digit prefixes,
   v4 301-FL blanket (China 12.5), v19 headline 232 chapter rules,
   v20 7202.80 [NOT SUBJECT] carve-out. Scope rows come from the real
   parsed data (supabase/data_232/scope_v23.json).
   Run: npx tsx scripts/test_232_scope.ts */
import { suggestAdditionalDuties, type DutyRule, type Scope232Row } from "../lib/additionalDuties";
import scopeJson from "../supabase/data_232/scope_v23.json";

const NOTE_BY_TIER: Record<string, string> = {
  std50: "Section 232 metals — standard heading 9903.82.02: 50% on full customs value.",
  std25: "Section 232 metals — standard heading 9903.82.09: 25% on full customs value.",
  floor10: "Section 232 metals — headings 9903.82.07/.08: combined floor of 10%.",
};
const scope: Scope232Row[] = (scopeJson as any[]).map((r) => ({
  hts_prefix: r.prefix,
  metal: r.metal,
  subdiv: r.subdiv,
  kind: r.kind,
  tier: r.tier,
  effective_from: "2026-04-06",
  source: "CBP Metals HTS List — CSMS #68855869",
  note: NOTE_BY_TIER[r.tier] ?? "",
}));

const R = (
  duty_type: string,
  hts_prefix: string,
  origin_country: string,
  rate: number,
  note = "",
  basis = "full_value",
  effective_from = "2026-04-06"
): DutyRule => ({
  id: `${duty_type}-${hts_prefix}-${origin_country}`,
  duty_type,
  hts_prefix,
  origin_country,
  rate,
  basis,
  effective_from,
  source: "fixture",
  note,
});

const rules: DutyRule[] = [
  R("301-CN", "83025000", "CHINA", 25, "Section 301 List 3 (9903.88.03)"),
  R("301-FL", "", "CHINA", 12.5, "Forced-labor 301 blanket", "flat", "2026-07-24"),
  R("232", "72", "", 50, "Steel articles (Annex I-A)"),
  R("232", "7206", "", 50, "Steel articles (Annex I-A)"),
  R("301-FL", "720280", "CHINA", 0, "[NOT SUBJECT] Ferrotungsten excluded, Note 52(b)", "full_value", "2026-07-24"),
  R("301-CN", "34051000", "CHINA", 25, "Section 301 List 3 (9903.88.03)"),
];

type Case = {
  name: string;
  hts: string;
  origin: string;
  material: string;
  opts?: { metal?: string; metalWeightPct?: number; metalOriginCountry?: string; entryDate?: string };
  expect: (lines: string[]) => boolean;
  expectBasis?: string;
};

const fmt = (sugs: ReturnType<typeof suggestAdditionalDuties>) =>
  sugs.map((s) =>
    s.kind === "rate" ? `${s.duty_type}:${s.rate}%` : `WARN:${s.text.slice(0, 40)}`
  );

const cases: Case[] = [
  {
    name: "8302.50.0000 aluminum China -> 232 25% + List3 25% + FL $0 excl",
    hts: "8302500000", origin: "China", material: "Aluminum",
    expect: (l) =>
      l.includes("232:25%") && l.includes("301-CN:25%") &&
      l.includes("301-FL-EXCL:0%") && !l.includes("301-FL:12.5%"),
  },
  {
    name: "8302.50.0000 steel China -> NO 232, FL charged",
    hts: "8302500000", origin: "China", material: "Steel",
    expect: (l) =>
      !l.some((x) => x.startsWith("232:")) && l.includes("301-FL:12.5%") &&
      l.includes("301-CN:25%") && !l.some((x) => x.startsWith("WARN")),
  },
  {
    name: "8302.50.0000 aluminum weight 10% -> 232-EXCL 0%, FL charged",
    hts: "8302500000", origin: "China", material: "Aluminum",
    opts: { metalWeightPct: 10 },
    expect: (l) =>
      l.includes("232-EXCL:0%") && l.includes("301-FL:12.5%") && !l.includes("301-FL-EXCL:0%"),
  },
  {
    name: "8302.50.0000 no metal declared -> scope warning, no 232 rate",
    hts: "8302500000", origin: "China", material: "",
    expect: (l) =>
      !l.some((x) => x.startsWith("232:")) && l.some((x) => x.startsWith("WARN:Section 232:")),
  },
  {
    name: "7206 steel China -> headline rule 50% wins, scope not double-counted",
    hts: "7206100000", origin: "China", material: "Steel",
    expect: (l) => l.filter((x) => x.startsWith("232:")).length === 1 && l.includes("232:50%"),
  },
  {
    name: "7202.80 China -> Note 52(b) FL carve-out intact",
    hts: "7202800000", origin: "China", material: "",
    expect: (l) => l.includes("301-FL-EXCL:0%") && !l.includes("301-FL:12.5%"),
  },
  {
    name: "3405.10.00.00 China -> 37.50% case unchanged (List3 25 + FL 12.5)",
    hts: "3405100000", origin: "China", material: "",
    expect: (l) => l.includes("301-CN:25%") && l.includes("301-FL:12.5%") && !l.some((x) => x.startsWith("232")),
  },
  {
    name: "floor10: (x) steel code -> 232 rate 10 basis floor10",
    hts: "8207200070", origin: "China", material: "Steel",
    expect: (l) => l.includes("232:10%"),
  },
  {
    name: "structured metal param wins (copper 8544.42 -> std25 (viii))",
    hts: "8544421000", origin: "China", material: "",
    opts: { metal: "copper" },
    expect: (l) => l.includes("232:25%"),
  },
  // ---- Phase 3 special tiers ----
  {
    name: "P3 US-metal: 8302.50 aluminum, metal melted in US -> 10% (9903.82.06)",
    hts: "8302500000", origin: "China", material: "Aluminum",
    opts: { metalOriginCountry: "United States" },
    expect: (l) => l.includes("232:10%") && l.includes("301-FL-EXCL:0%"),
  },
  {
    name: "P3 UK derivative: 8302.50, UK origin + UK metal -> 15% (9903.82.05)",
    hts: "8302500000", origin: "United Kingdom", material: "Aluminum",
    opts: { metalOriginCountry: "United Kingdom" },
    expect: (l) => l.includes("232:15%"),
  },
  {
    name: "P3 UK article: 7601 aluminum, UK origin + UK metal -> 25% (9903.82.04)",
    hts: "7601100000", origin: "United Kingdom", material: "Aluminum",
    opts: { metalOriginCountry: "United Kingdom" },
    expect: (l) => l.includes("232:25%"),
  },
  {
    name: "P3 partner (xi): 8427.10.40 steel, Japan -> 15% (9903.82.22)",
    hts: "8427104000", origin: "Japan", material: "Steel",
    expect: (l) => l.includes("232:15%"),
  },
  {
    name: "P3 partner expires: (xi) Japan with entry 2028 -> standard 25%",
    hts: "8427104000", origin: "Japan", material: "Steel",
    opts: { entryDate: "2028-03-01" },
    expect: (l) => l.includes("232:25%"),
  },
  {
    name: "P3 USMCA (xi): Mexico -> 25% (split basis checked separately)",
    hts: "8427104000", origin: "Mexico", material: "Steel",
    expect: (l) => l.includes("232:25%"),
    expectBasis: "usmca_split",
  },
  {
    name: "P3 Russia (iv): 7301.20.10 steel -> 10% (9903.82.15)",
    hts: "7301201000", origin: "Russia", material: "Steel",
    expect: (l) => l.includes("232:10%"),
  },
  {
    name: "P3 Russia (x): 8207.20.0070 steel -> 25% (9903.82.17), not floor 10",
    hts: "8207200070", origin: "Russia", material: "Steel",
    expect: (l) => l.includes("232:25%"),
  },
  {
    name: "P3 non-NTR floor: Belarus (x) -> 25% (9903.82.12)",
    hts: "8207200070", origin: "Belarus", material: "Steel",
    expect: (l) => l.includes("232:25%"),
  },
  {
    name: "P3 floor post-2028: China (x) entry 2028-03 -> 25% standard",
    hts: "8207200070", origin: "China", material: "Steel",
    opts: { entryDate: "2028-03-01" },
    expect: (l) => l.includes("232:25%"),
  },
];

let fail = 0;
for (const c of cases) {
  const sugs = suggestAdditionalDuties(c.hts, c.origin, c.material, rules, {
    scope232: scope,
    metal: c.opts?.metal,
    metalWeightPct: c.opts?.metalWeightPct,
    metalOriginCountry: c.opts?.metalOriginCountry,
    entryDate: c.opts?.entryDate,
  });
  const lines = fmt(sugs);
  let ok = c.expect(lines);
  if (c.expectBasis) {
    const s232 = sugs.find((s) => s.kind === "rate" && s.duty_type === "232");
    ok = ok && !!s232 && s232.kind === "rate" && s232.basis === c.expectBasis;
  }
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}`);
  console.log(`      -> ${lines.join(" | ")}`);
  const fl = sugs.find((s) => s.kind === "rate" && s.duty_type === "232");
  if (fl && fl.kind === "rate" && c.name.includes("floor10"))
    console.log(`      basis=${fl.basis} note=${fl.note.slice(0, 80)}...`);
}
console.log(fail === 0 ? "\nALL PASS" : `\n${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
