/* FTA / preference programs claimable in the duty estimator, keyed by
   origin country name (ORIGIN_OPTIONS). `spi` is the HTS Special Program
   Indicator as printed in the Special rate column; `labelKey` is the
   fxest message key carrying the localized program name. USMCA uses a
   different SPI per partner: S (Canada) and S+ (Mexico). */

export type FtaProgram = { spi: string; labelKey: string };

export const ORIGIN_PROGRAMS: Record<string, FtaProgram[]> = {
  Australia: [{ spi: "AU", labelKey: "progAU" }],
  Canada: [{ spi: "S", labelKey: "progUSMCA" }],
  Mexico: [{ spi: "S+", labelKey: "progUSMCA" }],
  "South Korea": [{ spi: "KR", labelKey: "progKR" }],
  Japan: [{ spi: "JP", labelKey: "progJP" }],
};

/* One parsed segment of an HTS Special rate, as returned by
   /api/public/duty-lookup (`hts_special_rates`, customs_v24).
   spis = [] means a bare rate that applies to all programs. */
export type SpecialSegment = {
  spis: string[];
  rate: number | null;
  rate_text: string;
};

/* Best segment for a program: an explicit SPI match beats a bare
   (all-programs) segment. Null when the HTS line grants the program
   no special rate — the program is then not offered. */
export function segmentForProgram(
  segments: SpecialSegment[],
  spi: string
): SpecialSegment | null {
  let bare: SpecialSegment | null = null;
  for (const s of segments) {
    if (s.spis.includes(spi)) return s;
    if (s.spis.length === 0 && !bare) bare = s;
  }
  return bare;
}
