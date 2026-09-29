"use client";

import { useEffect, useState } from "react";
import Reveal from "./Reveal";
import { SectionHead } from "./Section";

type U = {
  id: string;
  title: string;
  body: string;
  source: string | null;
  effective_date: string | null;
  url: string | null;
};

export default function RegulatoryFeed({
  t,
  locale,
}: {
  t: { eyebrow: string; title: string; sub: string; viewAll: string; empty: string };
  locale: string;
}) {
  const [items, setItems] = useState<U[] | null>(null);

  useEffect(() => {
    fetch("/api/public/compliance-updates")
      .then((r) => r.json())
      .then((j) => setItems(j.updates ?? []))
      .catch(() => setItems([]));
  }, []);

  // Don't render the section until we know there's content.
  if (!items || items.length === 0) return null;

  return (
    <section className="border-y border-line bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHead eyebrow={t.eyebrow} title={t.title} sub={t.sub} />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((u, i) => (
            <Reveal key={u.id} delay={(i % 3) * 80}>
              <a
                href={u.url ?? `/${locale}/app/compliance`}
                target={u.url ? "_blank" : undefined}
                rel={u.url ? "noopener noreferrer" : undefined}
                className="dash-card dash-card-hover flex h-full flex-col p-6"
              >
                <div className="flex items-center gap-2 text-xs">
                  {u.effective_date && (
                    <span className="rounded-full bg-brand-tint px-2.5 py-1 font-bold text-brand">
                      {u.effective_date}
                    </span>
                  )}
                  {u.source && <span className="truncate text-faint">{u.source.split("·")[0].trim()}</span>}
                </div>
                <p className="mt-3 line-clamp-3 text-[15px] font-bold leading-snug text-ink">
                  {u.title}
                </p>
                {u.body && (
                  <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted">{u.body}</p>
                )}
                <span className="mt-auto pt-4 text-[13px] font-bold text-brand">↗</span>
              </a>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-8 text-center">
          <a
            href={`/${locale}/app/compliance`}
            className="inline-flex items-center gap-2 text-[15px] font-bold text-brand hover:gap-3 transition-all"
          >
            {t.viewAll} →
          </a>
        </Reveal>
      </div>
    </section>
  );
}
