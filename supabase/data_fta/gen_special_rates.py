#!/usr/bin/env python3
"""Generate supabase/customs_v24_pN.sql from the USITC HTS official CSV
export (per-chapter files in /tmp/usitc_fta/, downloaded from
https://hts.usitc.gov/reststop/exportList).

Why: the duty estimator's hts_schedule only carries Column 1 general
rates, so FTA / special-program rates (AUSFTA, USMCA, KORUS, GSP, ...)
were invisible — e.g. 2106.90.99.80 from Australia showed the 6.4%
MFN rate and missed the AUSFTA "Free". This builds hts_special_rates:
one row per (HTS line, SPI list, rate text) segment parsed out of the
"Special Rate of Duty" column.

Segment model: the special column looks like
  "Free (A,AU,BH,...) See 9822.04.01 (AU) 8.8¢/liter (JO)"
Every `rate text (SPI, list)` chunk becomes one row; any rate-like
text left outside parentheses becomes a bare row with spis = ''
(applies to all programs). `rate` is the parsed ad valorem percent
when the text is exactly "Free" (-> 0) or a plain "12.5%"; specific /
compound / chapter-98-reference texts keep rate_text with rate NULL.

Keying: rows are rolled up to the 8-digit tariff line, because
hts_schedule is keyed 8-digit and the USITC export repeats the same
Special text on every statistical suffix line. Verified lossless
on the Rev 21 export (2026-10-21): across all 7,099 tariff lines,
no SPI ever carries two different rates among the suffix rows of
one line, so the rollup preserves every program rate exactly.
"""
import csv
import glob
import os
import re

SRC_DIR = "/tmp/usitc_fta"
RELEASE = "2026 HTS Revision 21 (2026HTSRev21)"
DOWNLOAD_DATE = "2026-10-21"
ROWS_PER_INSERT = 400
MAX_PART_BYTES = 450_000

SEGMENT_RE = re.compile(r"([^(]*)\(([^)]*)\)")
PCT_RE = re.compile(r"(\d+(?:\.\d+)?)%")


def esc(s):
    return s.replace("'", "''")


def collapse(s):
    return " ".join(s.split())


def parse_rate(rate_text):
    if rate_text == "Free":
        return 0
    m = PCT_RE.fullmatch(rate_text)
    if m:
        return float(m.group(1))
    return None


def fmt_rate(rate):
    if rate is None:
        return "null"
    return f"{rate:.10f}".rstrip("0").rstrip(".")


def split_segments(hts_no, special):
    """Yield (hts_no, spis, rate, rate_text) rows for one special text."""
    out = []
    for rate_raw, spi_raw in SEGMENT_RE.findall(special):
        rate_text = collapse(rate_raw)
        spis = ",".join(t.strip() for t in spi_raw.split(",") if t.strip())
        if not rate_text and not spis:
            continue
        out.append((hts_no, spis, parse_rate(rate_text), rate_text))
    remainder = collapse(SEGMENT_RE.sub("", special))
    if any(c.isalnum() for c in remainder):
        out.append((hts_no, "", parse_rate(remainder), remainder))
    return out


def main():
    files = sorted(glob.glob(os.path.join(SRC_DIR, "ch*.csv")))
    rows = set()
    chapters = 0
    for path in files:
        chapters += 1
        with open(path, encoding="utf-8-sig", newline="") as fh:
            for rec in csv.DictReader(fh):
                special = (rec.get("Special Rate of Duty") or "").strip()
                if not special:
                    continue
                hts_no = (rec.get("HTS Number") or "").strip()
                if not hts_no:
                    continue
                # Roll statistical-suffix rows up to the 8-digit
                # tariff line (hts_schedule's key). Lossless: the
                # Special text is uniform across a line's suffixes
                # (verified on this export — see module docstring).
                digits = re.sub(r"[^0-9]", "", hts_no)
                if len(digits) > 8:
                    digits = digits[:8]
                if len(digits) == 8:
                    hts_no = f"{digits[:4]}.{digits[4:6]}.{digits[6:8]}"
                rows.update(split_segments(hts_no, special))
    rows = sorted(rows, key=lambda r: (r[0], r[1], r[3]))
    distinct_hts = len({r[0] for r in rows})

    header = f"""-- ============================================================
-- nielcos.ai customs v24: HTS Special Rate of Duty table
-- (hts_special_rates) — FTA / special-program rates for the
-- duty estimator (AUSFTA, USMCA, KORUS, GSP, CBI, ...).
--
-- Why: hts_schedule carries only Column 1 general (MFN) rates,
-- so a shipment that qualifies for a trade program priced at the
-- full MFN rate — e.g. 2106.90.99 from Australia is "Free" under
-- AUSFTA but showed 6.4%. The estimator joins this table by
-- hts_no and picks the segment whose SPI list contains the
-- program claimed for the selected origin.
--
-- Row semantics: one row per segment of the USITC "Special Rate
-- of Duty" text, keyed by the 8-digit tariff line (statistical
-- suffix rows rolled up — the Special text is uniform across a
-- line's suffixes, verified on this export). spis is the comma-joined Special Program
-- Indicator list exactly as printed ('' = bare text outside any
-- parentheses, applies to all programs). rate is the parsed ad
-- valorem percent when rate_text is exactly "Free" (-> 0) or a
-- plain percentage; it is NULL for specific / compound rates and
-- "See 98xx..." references — rate_text always keeps the literal.
--
-- Source: USITC HTS official export API
-- (hts.usitc.gov/reststop/exportList, per-chapter CSV),
-- release {RELEASE}, downloaded {DOWNLOAD_DATE}.
-- Generator: supabase/data_fta/gen_special_rates.py.
-- Run the parts in order (p1, p2, ...), once. Inserts are
-- ON CONFLICT DO NOTHING, so a re-run is harmless.
-- ============================================================
"""

    ddl = """
create table if not exists hts_special_rates (
  hts_no text not null,
  spis text not null default '',
  rate numeric,
  rate_text text not null,
  primary key (hts_no, spis, rate_text)
);

alter table hts_special_rates enable row level security;
drop policy if exists "hts special rates read" on hts_special_rates;
create policy "hts special rates read" on hts_special_rates for select to authenticated using (true);
drop policy if exists "hts special rates read anon" on hts_special_rates;
create policy "hts special rates read anon" on hts_special_rates for select to anon using (true);

"""

    verify = """
-- ============================================================
-- VERIFY (after running all parts):
-- select count(*) from hts_special_rates;
-- AUSFTA check — 2106.90.99 must include a segment whose spis
-- contain AU with rate 0 ("Free"):
-- select hts_no, spis, rate, rate_text from hts_special_rates
-- where hts_no = '2106.90.99';
-- ============================================================
"""

    # Build insert statements, ~ROWS_PER_INSERT rows each.
    statements = []
    for i in range(0, len(rows), ROWS_PER_INSERT):
        chunk = rows[i:i + ROWS_PER_INSERT]
        vals = ",\n".join(
            f"  ('{esc(h)}','{esc(s)}',{fmt_rate(r)},'{esc(t)}')"
            for h, s, r, t in chunk
        )
        statements.append(
            "insert into hts_special_rates (hts_no, spis, rate, rate_text) values\n"
            + vals + "\non conflict do nothing;\n"
        )

    # Pack statements into parts of at most ~MAX_PART_BYTES.
    parts = []
    current = header + ddl
    part_no = 1
    has_stmt = False
    for stmt in statements:
        if has_stmt and len((current + "\n" + stmt).encode("utf-8")) > MAX_PART_BYTES:
            parts.append(current)
            part_no += 1
            current = (f"-- nielcos.ai customs v24 part {part_no} "
                       f"(hts_special_rates inserts, continued)\n\n")
            has_stmt = False
        current += "\n" + stmt
        has_stmt = True
    current += verify
    parts.append(current)

    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
    written = []
    for idx, body in enumerate(parts, start=1):
        path = os.path.join(out_dir, f"customs_v24_p{idx}.sql")
        with open(path, "w") as fh:
            fh.write(body)
        written.append((path, len(body.encode("utf-8"))))

    print(f"chapters processed: {chapters}")
    print(f"segment rows: {len(rows)}")
    print(f"distinct hts_no: {distinct_hts}")
    for path, size in written:
        print(f"wrote {path} ({size} bytes)")


if __name__ == "__main__":
    main()
