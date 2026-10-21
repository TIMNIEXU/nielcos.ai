/* FTA program-selection checks: segment matching (lib/programs.ts).
   Fixtures mirror real USITC Special-column shapes.
   Run: npx tsx scripts/test_programs.ts */
import { segmentForProgram, type SpecialSegment } from "../lib/programs";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}`); }
}

// 2106.90.99 real shape: one Free segment listing 16 SPIs incl. AU + KR + S.
const food: SpecialSegment[] = [
  { spis: ["A", "AU", "BH", "CL", "CO", "D", "E", "IL", "JO", "KR", "MA", "OM", "P", "PA", "PE", "S", "SG"], rate: 0, rate_text: "Free" },
];
check("AU matches the Free segment", segmentForProgram(food, "AU")?.rate === 0);
check("KR matches the Free segment", segmentForProgram(food, "KR")?.rate === 0);
check("S (Canada USMCA) matches", segmentForProgram(food, "S")?.rate === 0);
check("S+ (Mexico USMCA) does NOT match an S-only segment", segmentForProgram(food, "S+") === null);

// Two segments: explicit % for AU, See-98xx for S+.
const two: SpecialSegment[] = [
  { spis: ["AU"], rate: 2.5, rate_text: "2.5%" },
  { spis: ["S+"], rate: null, rate_text: "See 9822.60.25" },
];
check("AU explicit percent segment", segmentForProgram(two, "AU")?.rate === 2.5);
check("S+ chapter-98 segment, rate null", segmentForProgram(two, "S+")?.rate_text === "See 9822.60.25");

// Bare segment (no SPI list) applies to every program; explicit beats bare.
const bare: SpecialSegment[] = [
  { spis: [], rate: 0, rate_text: "Free" },
  { spis: ["KR"], rate: 5, rate_text: "5%" },
];
check("bare segment serves AU", segmentForProgram(bare, "AU")?.rate === 0);
check("explicit KR segment beats bare", segmentForProgram(bare, "KR")?.rate === 5);

// No segments -> nothing offered.
check("empty segments -> null", segmentForProgram([], "AU") === null);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
