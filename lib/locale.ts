/* Central locale helpers — use these instead of `locale === "zh-CN"` checks
   so zh-TW / vi / ko / ja behave correctly. */

export function isZhLocale(locale: string): boolean {
  return locale.startsWith("zh");
}

/** BCP-47 tag for Intl.DateTimeFormat / NumberFormat. */
export function intlLocale(locale: string): string {
  switch (locale) {
    case "en":
      return "en-US";
    case "zh-CN":
      return "zh-CN";
    case "zh-TW":
      return "zh-TW";
    case "vi":
      return "vi";
    case "ko":
      return "ko";
    case "ja":
      return "ja";
    default:
      return "en-US";
  }
}

/** True when DB-side Chinese fields (title_zh, label_cn, …) should be preferred.
    zh-TW reuses the simplified-Chinese DB content as fallback. */
export function preferDbZh(locale: string): boolean {
  return isZhLocale(locale);
}

/** Locale bucket for the AI assistant engine: "zh" (simplified/traditional
    share the Chinese prompt path) or "en" fallback. */
export function assistantLang(locale: string): "zh" | "en" {
  return isZhLocale(locale) ? "zh" : "en";
}
