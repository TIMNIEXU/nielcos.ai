"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link as LocaleLink, usePathname, routing, localeNames } from "@/i18n/routing";

import AuthLink from "./AuthLink";

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-[13px] font-bold text-white shadow-[0_4px_12px_-4px_rgba(29,78,216,0.6)]">
        N
      </span>
      <span
        className={`text-[17px] font-bold tracking-tight ${
          dark ? "text-white" : "text-ink"
        }`}
      >
        NIEL
        <span className="ml-1.5 rounded-md bg-brand-tint px-1.5 py-0.5 align-middle text-[10px] font-bold tracking-widest text-brand">
          COS
        </span>
      </span>
    </span>
  );
}

function LocaleSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
        className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-white text-ink transition-colors hover:border-brand hover:text-brand"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c2.5 2.6 3.9 5.7 3.9 9S14.5 18.4 12 21c-2.5-2.6-3.9-5.7-3.9-9S9.5 5.6 12 3z" />
        </svg>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-[60] mt-2 min-w-[190px] rounded-2xl border border-line bg-white py-2 shadow-[0_16px_48px_-12px_rgba(14,30,56,0.25)]"
        >
          {routing.locales.map((l) => {
            const active = l === locale;
            return (
              <LocaleLink
                key={l}
                href={pathname}
                locale={l}
                role="option"
                aria-selected={active}
                onClick={() => setOpen(false)}
                className={`block px-5 py-2.5 text-[15px] transition-colors hover:bg-brand-tint-soft ${
                  active ? "font-bold text-brand" : "font-medium text-ink"
                }`}
              >
                {localeNames[l] ?? l}
              </LocaleLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const links = [
    { href: `/${locale}`, label: t("home") },
    { href: `/${locale}/platform`, label: t("platform") },
    { href: `/${locale}/modules`, label: t("modules") },
    { href: `/${locale}/landed-cost`, label: t("landedCost") },
    { href: `/${locale}/regulatory`, label: t("regulatory") },
    { href: `/${locale}/ad-cvd`, label: t("adcvd") },
    { href: `/${locale}/ad-cvd-checker`, label: t("adcvdchecker") },
    { href: `/${locale}/developers`, label: t("developers") },
    { href: `/${locale}/#resources`, label: t("resources") },
    { href: `/${locale}/insurance`, label: t("insurance") },
    { href: `/${locale}/contact`, label: t("contact") },
  ];

  const linkCls =
    "rounded-lg px-3.5 py-2 text-[14px] font-medium text-ink-soft transition-colors hover:bg-brand-tint-soft hover:text-brand";

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href={`/${locale}`} aria-label="NIEL COS home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkCls}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <LocaleSwitch />
          <AuthLink />
          <Link
            href={`/${locale}/contact`}
            className="hidden rounded-full bg-brand px-4.5 py-2 text-[14px] font-semibold text-white shadow-[0_6px_16px_-6px_rgba(29,78,216,0.7)] transition-all hover:-translate-y-px hover:bg-brand-deep sm:block"
          >
            {t("demo")}
          </Link>
        </div>
      </div>
    </header>
  );
}
