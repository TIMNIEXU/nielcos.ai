import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Logo } from "./Header";

export default function Footer() {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const UTM = "utm_source=www-nielcos.ai&utm_medium=group_footer";
  const groupBrands = [
    { name: "Niel Supply Chain", href: `https://www.nielsc.com?${UTM}`, logo: "/logo-niel-badge.png" },
    { name: "Niel Customs", href: `https://www.nielcustoms.ai?${UTM}`, logo: "/logo-niel-badge.png" },
    { name: "JOMA Logistics", href: `https://www.jomaus.com?${UTM}`, logo: "/logo-joma-logistics.png" },
    { name: "Niel Insurance", href: `https://nielinsurance.com?${UTM}`, logo: "/logo-niel-insurance.png" },
    { name: "NIEL COS", href: `/${locale}`, logo: "/logo-niel-badge.png" },
  ];

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
      {/* NIEL GROUP standard strip — identical on every group site (v1.0 section 4) */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8fb4ff]">
            {t("groupEyebrow")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
            {groupBrands.map((b) => {
              const inner = (
                <span className="flex h-11 items-center gap-2.5 rounded-lg bg-white px-3 transition-opacity hover:opacity-85">
                  <img
                    src={b.logo}
                    alt={b.name}
                    className="h-8 w-auto max-w-[84px] object-contain"
                  />
                  <span className="whitespace-nowrap text-[13px] font-bold text-[#0c1a33]">
                    {b.name}
                  </span>
                </span>
              );
              return b.href.startsWith("http") ? (
                <a key={b.name} href={b.href} target="_blank" rel="noreferrer">
                  {inner}
                </a>
              ) : (
                <Link key={b.name} href={b.href}>
                  {inner}
                </Link>
              );
            })}
          </div>
          <p className="mt-2 text-[12.5px] text-white/40">{t("groupNote")}</p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Logo dark />
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-white/60">
              {t("tag")}
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
                  href="mailto:sales@nielcos.ai"
                  className="transition-colors hover:text-white"
                >
                  sales@nielcos.ai
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@nielcos.ai"
                  className="transition-colors hover:text-white"
                >
                  support@nielcos.ai
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
        <p className="mt-4 text-[11.5px] leading-relaxed text-white/40">
          {t("operatedBy")} {t("entityNote")}
        </p>
      </div>
    </footer>
  );
}
