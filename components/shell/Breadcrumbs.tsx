"use client";

import { Fragment } from "react";
import { Link, usePathname } from "@/i18n/routing";
import type { ShellLabels } from "./types";

const LOCALE_RE = /^(en|zh-CN|zh-TW|vi|ko|ja)$/;

type Crumb = { label: string; href: string };

type Props = { labels: ShellLabels };

export default function Breadcrumbs({ labels }: Props) {
  const pathname = usePathname();
  const segs = pathname.split("/").filter(Boolean);
  if (segs.length > 0 && LOCALE_RE.test(segs[0])) segs.shift();

  const crumbs: Crumb[] = [{ label: labels["crumbs.dashboard"], href: "/app" }];
  const rest = segs[0] === "app" ? segs.slice(1) : segs;

  if (rest.length === 0) {
    // workspace root: single crumb
  } else if (rest.length === 1) {
    const navLabel = labels[`nav.${rest[0]}`];
    if (navLabel) {
      crumbs.push({ label: navLabel, href: `/app/${rest[0]}` });
    } else {
      // dynamic id directly under /app (e.g. NIEL-2026-000123): Dashboard / Shipments / <id>
      crumbs.push({ label: labels["nav.shipments"], href: "/app" });
      crumbs.push({
        label: decodeURIComponent(rest[0]),
        href: `/app/${rest[0]}`,
      });
    }
  } else {
    rest.forEach((s, i) => {
      const navLabel = i === 0 ? labels[`nav.${s}`] : undefined;
      crumbs.push({
        label: navLabel ?? decodeURIComponent(s),
        href: "/app/" + rest.slice(0, i + 1).join("/"),
      });
    });
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="breadcrumb" className="border-b border-line bg-card">
      <ol className="mx-auto flex max-w-[1600px] items-center gap-1.5 overflow-x-auto whitespace-nowrap px-4 py-2.5 text-[13px] lg:px-6">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <Fragment key={`${c.href}-${i}`}>
              {i > 0 && (
                <li aria-hidden="true" className="text-faint">
                  /
                </li>
              )}
              <li className="min-w-0">
                {last ? (
                  <span aria-current="page" className="truncate font-semibold text-ink">
                    {c.label}
                  </span>
                ) : (
                  <Link href={c.href} className="text-muted hover:text-brand hover:underline">
                    {c.label}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
