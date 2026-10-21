#!/usr/bin/env python3
"""Insert fxest program-selection label keys after originLabel in the
fxest block of every locale messages file. Text-level edit: the rest of
each file stays byte-identical."""
import json
import pathlib
import re

NEW = {
    "en": {
        "programLabel": "Import program",
        "programNone": "None (MFN / Column 1)",
        "progAU": "AUSFTA — Australia-U.S. Free Trade Agreement",
        "progUSMCA": "USMCA — U.S.-Mexico-Canada Agreement",
        "progKR": "KORUS — Korea-U.S. Free Trade Agreement",
        "programNote": "Program rates apply only when the goods qualify and the preference is claimed at entry.",
    },
    "zh-CN": {
        "programLabel": "进口协定计划",
        "programNone": "无（普通税率 / 第一栏）",
        "progAU": "AUSFTA — 澳大利亚-美国自贸协定",
        "progUSMCA": "USMCA — 美墨加协定",
        "progKR": "KORUS — 韩国-美国自贸协定",
        "programNote": "协定税率仅在货物符合原产地资格并在申报时申请优惠时适用。",
    },
    "zh-TW": {
        "programLabel": "進口協定計劃",
        "programNone": "無（普通稅率 / 第一欄）",
        "progAU": "AUSFTA — 澳大利亞-美國自貿協定",
        "progUSMCA": "USMCA — 美墨加協定",
        "progKR": "KORUS — 韓國-美國自貿協定",
        "programNote": "協定稅率僅在貨物符合原產地資格並在申報時申請優惠時適用。",
    },
    "vi": {
        "programLabel": "Chương trình nhập khẩu",
        "programNone": "Không (MFN / Cột 1)",
        "progAU": "AUSFTA — Hiệp định thương mại tự do Úc-Hoa Kỳ",
        "progUSMCA": "USMCA — Hiệp định Hoa Kỳ-Mexico-Canada",
        "progKR": "KORUS — Hiệp định thương mại tự do Hàn Quốc-Hoa Kỳ",
        "programNote": "Thuế suất ưu đãi chỉ áp dụng khi hàng hóa đủ điều kiện xuất xứ và được khai hưởng ưu đãi khi nhập khẩu.",
    },
    "ko": {
        "programLabel": "수입 프로그램",
        "programNone": "없음 (MFN / 1열)",
        "progAU": "AUSFTA — 호주-미국 자유무역협정",
        "progUSMCA": "USMCA — 미국-멕시코-캐나다 협정",
        "progKR": "KORUS — 한미 자유무역협정",
        "programNote": "특혜 관세율은 원산지 요건을 충족하고 수입 신고 시 특혜를 신청한 경우에만 적용됩니다.",
    },
    "ja": {
        "programLabel": "輸入プログラム",
        "programNone": "なし（MFN／第1欄）",
        "progAU": "AUSFTA — オーストラリア-米国自由貿易協定",
        "progUSMCA": "USMCA — 米国・メキシコ・カナダ協定",
        "progKR": "KORUS — 米韓自由貿易協定",
        "programNote": "特恵税率は、原産地資格を満たし、輸入申告時に特恵を申請した場合にのみ適用されます。",
    },
}

root = pathlib.Path(__file__).resolve().parents[2]  # repo root
for loc, keys in NEW.items():
    p = root / "messages" / f"{loc}.json"
    text = p.read_text(encoding="utf-8")
    if '"programLabel"' in text:
        print(f"{loc}: already has programLabel, skipped")
        continue
    fx = text.index('"fxest"')
    m = re.search(r'^(\s*)"originLabel": "(?:[^"\\]|\\.)*",\n', text[fx:], re.M)
    assert m, f"{loc}: originLabel not found in fxest block"
    indent = m.group(1)
    lines = "".join(
        f'{indent}"{k}": {json.dumps(v, ensure_ascii=False)},\n' for k, v in keys.items()
    )
    insert_at = fx + m.end()
    p.write_text(text[:insert_at] + lines + text[insert_at:], encoding="utf-8")
    print(f"{loc}: inserted {len(keys)} keys")
print("done")
