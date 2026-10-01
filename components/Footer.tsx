import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Logo } from "./Header";

export default function Footer() {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  const locale = useLocale();

  const platform = [
    { href: `/${locale}/platform`, label: tn("platform") },
    { href: `/${locale}/modules`, label: tn("modules") },
    { href: `/${locale}/import-from-china`, label: t("chinaDesk") },
    { href: `/${locale}/contact`, label: t("contact") },
  ];
  const company = [
    { href: `/${locale}`, label: tn("home") },
    { href: `/${locale}/contact`, label: tn("demo") },
  ];

  return (
    <footer className="bg-[#0c1a33] text-white">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo dark />
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-white/60">
              {t("tag")}
            </p>
            <p className="mt-4 max-w-xs text-[12.5px] leading-relaxed text-white/40">
              {t("group")}
            </p>
          </div>
          <div>
            <p className="text-[12px] font-bold tracking-widest text-white/40 uppercase">
              {t("platform")}
            </p>
            <ul className="mt-4 space-y-2.5">
              {platform.map((l) => (
                <li key={l.href + l.label}>
                  <Link
                    href={l.href}
                    className="text-[14px] text-white/70 transition-colors hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[12px] font-bold tracking-widest text-white/40 uppercase">
              {t("company")}
            </p>
            <ul className="mt-4 space-y-2.5">
              {company.map((l) => (
                <li key={l.href + l.label}>
                  <Link
                    href={l.href}
                    className="text-[14px] text-white/70 transition-colors hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[12px] font-bold tracking-widest text-white/40 uppercase">
              {t("contact")}
            </p>
            <ul className="mt-4 space-y-2.5 text-[14px] text-white/70">
              <li>
                <a href="tel:+17323388098" className="transition-colors hover:text-white">
                  +1 (732) 338-8098
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@nielcustoms.ai"
                  className="transition-colors hover:text-white"
                >
                  info@nielcustoms.ai
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-[12.5px] text-white/40 sm:flex-row sm:items-center">
          <span>{t("rights")}</span>
          <span className="font-medium tracking-wide">
            Trade Further Together
          </span>
        </div>
      </div>
    </footer>
  );
}
