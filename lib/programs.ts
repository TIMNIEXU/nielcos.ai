/* FTA / preference programs claimable in the duty estimator, keyed by
   origin country name (ORIGIN_OPTIONS). `spi` is the HTS Special Program
   Indicator as printed in the Special rate column; `labelKey` is the
   fxest message key carrying the localized program name.
   USMCA quirk: the Special column prints "S" for the USMCA rate
   generally and adds a separate "S+" segment ONLY where Mexico's rate
   differs (usually a chapter 98 / 9823 reference that applies in lieu
   of the column rate). CBP's own guidance refers to the USMCA rate as
   the rate followed by "S or S+" (CSMS #69326983). So Mexico claims
   S+ when the line has one and falls back to S otherwise; Canada is
   always S. */

export type FtaProgram = { spi: string; labelKey: string; fallbackSpi?: string };

export const ORIGIN_PROGRAMS: Record<string, FtaProgram[]> = {
  Australia: [{ spi: "AU", labelKey: "progAU" }],
  Canada: [{ spi: "S", labelKey: "progUSMCA" }],
  Mexico: [{ spi: "S+", fallbackSpi: "S", labelKey: "progUSMCA" }],
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

/* Segment for a full program entry, honoring the USMCA S+ -> S
   fallback (see ORIGIN_PROGRAMS note): the partner-specific SPI
   wins when the line prints one, else the general SPI applies. */
export function programSegment(
  segments: SpecialSegment[],
  p: FtaProgram
): SpecialSegment | null {
  return (
    segmentForProgram(segments, p.spi) ??
    (p.fallbackSpi ? segmentForProgram(segments, p.fallbackSpi) : null)
  );
}
