import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["en", "zh-CN", "zh-TW", "vi", "ko", "ja"],
  defaultLocale: "en",
  localePrefix: "always",
});

/** Native display names for the language switcher, in switcher order. */
export const localeNames: Record<string, string> = {
  en: "English",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  vi: "Tiếng Việt",
  ko: "한국어",
  ja: "日本語",
};

export type Locale = (typeof routing.locales)[number];

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
