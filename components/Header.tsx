import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { routing } from "@/i18n/routing";

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
  return (
    <div className="flex items-center overflow-hidden rounded-full border border-line bg-card-soft text-[12px] font-semibold">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={`/${l}`}
          className={`px-2.5 py-1.5 transition-colors ${
            l === locale
              ? "bg-ink text-white"
              : "text-muted hover:text-ink"
          }`}
        >
          {l === "en" ? "EN" : "中文"}
        </Link>
      ))}
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
    { href: `/${locale}/contact`, label: t("contact") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href={`/${locale}`} aria-label="NIEL COS home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3.5 py-2 text-[14px] font-medium text-ink-soft transition-colors hover:bg-brand-tint-soft hover:text-brand"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <LocaleSwitch />
          <Link
            href={`/${locale}/login`}
            className="hidden text-[14px] font-semibold text-ink-soft transition-colors hover:text-brand sm:block"
          >
            {t("login")}
          </Link>
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
