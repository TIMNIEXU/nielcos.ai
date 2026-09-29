"use client";

import { useEffect, useState } from "react";
import Reveal from "./Reveal";

type Update = {
  id: string;
  title: string;
  title_zh: string | null;
  body: string;
  body_zh: string | null;
  source: string | null;
  effective_date: string | null;
  url: string | null;
};

type Labels = {
  empty: string;
  expand: string;
  collapse: string;
  official: string;
  effectiveOn: string;
  updatedWeekly: string;
  disclaimer: string;
};

export default function RegulatoryList({
  t,
  locale,
}: {
  t: Labels;
  locale: string;
}) {
  const [items, setItems] = useState<Update[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/compliance-updates")
      .then((r) => r.json())
      .then((j) => setItems(j.updates ?? []))
      .catch(() => setItems([]));
  }, []);

  const preferZh = locale.startsWith("zh");

  if (items === null) {
    return (
      <div className="mx-auto mt-12 max-w-4xl space-y-4" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="dash-card animate-pulse p-6">
            <div className="h-4 w-2/3 rounded bg-line-soft" />
            <div className="mt-3 h-3 w-full rounded bg-line-soft" />
            <div className="mt-2 h-3 w-5/6 rounded bg-line-soft" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="py-16 text-center text-[15px] text-muted">{t.empty}</p>;
  }

  return (
    <div className="mx-auto mt-12 max-w-4xl">
      <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-1.5 text-[12.5px] font-semibold text-ink-soft shadow-card">
        <span className="pulse-dot h-2 w-2 rounded-full bg-ok" />
        {t.updatedWeekly}
      </p>
      <div className="space-y-4">
        {items.map((u, i) => {
          const title = preferZh && u.title_zh ? u.title_zh : u.title;
          const body = preferZh && u.body_zh ? u.body_zh : u.body;
          const isOpen = openId === u.id;
          return (
            <Reveal key={u.id} delay={Math.min(i, 5) * 60}>
              <article className="dash-card p-6 sm:p-7">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {u.effective_date && (
                    <span className="rounded-full bg-brand-tint px-2.5 py-1 font-bold text-brand">
                      {t.effectiveOn}: {u.effective_date}
                    </span>
                  )}
                  {u.source && (
                    <span className="truncate font-medium text-faint">
                      {u.source.split("·")[0].trim()}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-[17px] font-bold leading-snug text-ink">
                  {title}
                </h3>
                {body && (
                  <p
                    className={`mt-2 text-[14px] leading-relaxed text-muted ${
                      isOpen ? "whitespace-pre-line" : "line-clamp-2"
                    }`}
                  >
                    {body}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  {body && (
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : u.id)}
                      className="text-[13.5px] font-bold text-brand hover:underline"
                    >
                      {isOpen ? t.collapse : t.expand} {isOpen ? "↑" : "↓"}
                    </button>
                  )}
                  {u.url && (
                    <a
                      href={u.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13.5px] font-bold text-ink-soft hover:text-brand"
                    >
                      {t.official} ↗
                    </a>
                  )}
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
      <p className="mx-auto mt-10 max-w-2xl text-center text-[12.5px] leading-relaxed text-faint">
        {t.disclaimer}
      </p>
    </div>
  );
}
