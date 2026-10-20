#!/usr/bin/env python3
"""Parse CBP 'Metals HTS List' (CSMS #68855869 attachment, 2026-06-05) into
hts_232_scope rows for customs_v23.sql.

Canonical sections parsed (other sections restate the same lists under
UK / U.S.-metal / origin conditions — membership is taken once, from the
standard-heading sections):
  9903.82.02          -> subdiv (i)-(v)   tier std50
  9903.82.09          -> subdiv (vi)-(viii),(xi) tier std25
  9903.82.07 and .08  -> subdiv (ix)-(x)  tier floor10
  9903.82.10 and .11  -> subdiv (ix)-(x)  tier floor15 (industrial subset)
  9903.82.03          -> QA only: union of (vi)-(xi), the <15%-weight
                         0% universe; parsed sets must reconcile.
Output: scope_v23.json  [{prefix, metal, subdiv, kind, tier}]
"""
import json
import re
import sys
from docx import Document

CODE_RE = re.compile(r"\b\d{4}(?:\.\d{2}(?:\.\d{2,4})?)?\b")
LABEL_RE = re.compile(
    r"(?:\((i{1,3}|iv|v|vi{0,3}|ix|x|xi)\)\s*)?(Derivative|Articles of)\s+"
    r"(aluminum|steel|copper)",
    re.I,
)
HEADING_RE = re.compile(r"^(9903\.82\.\d+)", re.M)

METAL = {"aluminum": "aluminum", "steel": "steel", "copper": "copper"}

# unlabeled groups in the .02 section, in document order (= subdiv i..v)
ORDER_02 = [
    ("i", "aluminum", "article"),
    ("ii", "aluminum", "derivative"),
    ("iii", "steel", "article"),
    ("iv", "steel", "derivative"),
    ("v", "copper", "article"),
]
# unlabeled groups in the .03 section, in document order (= subdiv vi..xi)
ORDER_03 = [
    ("vi", "aluminum", "derivative"),
    ("vii", "steel", "derivative"),
    ("viii", "copper", "article"),
    ("ix", "aluminum", "derivative"),
    ("x", "steel", "derivative"),
    ("xi", "steel", "derivative"),
]

SECTION_TIER = {
    "9903.82.02": "std50",
    "9903.82.09": "std25",
    "9903.82.07": "floor10",
    # .10/.11 lists the SAME (ix)/(x) codes as .07/.08 (verified identical);
    # the split is Note 16 (e) vs (f) end-use, not HTS membership. Phase 1
    # stores floor10 (the general treatment) and flags the 15% variant in
    # the row note; .10 is parsed for QA set-equality only.
    "9903.82.10": "floor10",
}
CANONICAL = {"9903.82.02", "9903.82.09", "9903.82.07", "9903.82.10", "9903.82.03"}


def codes_in(text):
    out = []
    for tok in CODE_RE.findall(text):
        digits = tok.replace(".", "")
        if digits.startswith("9903"):
            continue
        if len(digits) in (4, 6, 8, 10):
            out.append(digits)
    return out


def is_code_block(text):
    toks = text.replace("\t", " ").split()
    if len(toks) < 2:
        return len(codes_in(text)) == len(toks) and len(toks) >= 1 and all(
            CODE_RE.fullmatch(t) for t in toks
        )
    return len(codes_in(text)) >= 0.6 * len(toks)


def main():
    doc = Document("metals_hts_list_2026-06.docx")
    paras = [p.text for p in doc.paragraphs]
    section = None
    group = None  # (subdiv, metal, kind)
    order_idx = {"9903.82.02": 0, "9903.82.03": 0}
    rows = {}  # (prefix, metal, subdiv) -> dict
    qa03 = {}  # (prefix, metal, subdiv) -> True
    qa10 = {}  # .10/.11 section keys — must equal the .07/.08 (ix)/(x) keys

    def set_group(sec, label_text):
        m = LABEL_RE.search(label_text)
        if not m:
            return None
        roman, kind_word, metal_word = m.groups()
        kind = "derivative" if kind_word.lower().startswith("deriv") else "article"
        metal = METAL[metal_word.lower()]
        if roman:
            return (roman.lower(), metal, kind)
        if sec in order_idx:
            idx = order_idx[sec]
            order = ORDER_02 if sec == "9903.82.02" else ORDER_03
            if idx < len(order):
                order_idx[sec] += 1
                return order[idx]
        return (None, metal, kind)

    for p in paras:
        t = p.strip()
        if not t:
            continue
        hm = HEADING_RE.match(t)
        if hm and ("9903.82" in t[:12]):
            section = hm.group(1)
            group = None
            continue
        if section not in CANONICAL:
            continue
        if LABEL_RE.search(t) and not is_code_block(t):
            group = set_group(section, t)
            continue
        if is_code_block(t) and group and group[0]:
            subdiv, metal, kind = group
            for code in codes_in(t):
                if section == "9903.82.03":
                    qa03[(code, metal, subdiv)] = True
                elif section == "9903.82.10":
                    qa10[(code, metal, subdiv)] = True
                else:
                    key = (code, metal, subdiv)
                    rows[key] = {
                        "prefix": code,
                        "metal": metal,
                        "subdiv": subdiv,
                        "kind": kind,
                        "tier": SECTION_TIER[section],
                    }

    out = sorted(rows.values(), key=lambda r: (r["metal"], r["subdiv"], r["prefix"]))
    with open("scope_v23.json", "w") as f:
        json.dump(out, f, indent=1)

    # ---- QA report ----
    from collections import Counter

    print("rows (prefix,metal,subdiv):", len(out))
    print(Counter((r["metal"], r["tier"]) for r in out))
    print(Counter(r["subdiv"] for r in out))

    def covered(code, metal, subdiv, pool):
        return any(
            code.startswith(p) or p.startswith(code)
            for (p, m, s) in pool
            if m == metal and s == subdiv
        )

    pool = set(rows.keys())
    missing = [k for k in qa03 if not covered(*k, pool)]
    extra = [
        k
        for k in pool
        if k[2] in ("vi", "vii", "viii", "ix", "x", "xi")
        and not covered(*k, set(qa03.keys()))
    ]
    print("QA .03 codes not covered by canonical rows:", len(missing), missing[:10])
    print("QA canonical (vi-xi) rows not in .03:", len(extra), extra[:10])

    hit = [r for r in out if "8302500000".startswith(r["prefix"]) or r["prefix"].startswith("830250")]
    print("8302.50 scope hits:", hit)

    f10 = {(r["prefix"], r["metal"]) for r in out if r["tier"] == "floor10"}
    print("floor10 rows:", len(f10))
    ix_x = {k for k in rows if k[2] in ("ix", "x")}
    print("QA .10 keys == .07 (ix)/(x) keys:", set(qa10.keys()) == ix_x,
          "| .10-only:", len(set(qa10.keys()) - ix_x),
          "| .07-only:", len(ix_x - set(qa10.keys())))


if __name__ == "__main__":
    sys.exit(main())
