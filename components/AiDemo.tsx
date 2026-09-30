"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Chip = { q: string; a: string };

/* Prompt chips + typewriter answer. Plain-object props only (RSC-safe).
   Respects prefers-reduced-motion: static full answer, no animation. */
export default function AiDemo({
  messages,
  ctaLabel,
  ctaHref,
  note,
}: {
  messages: { chips: Chip[] };
  ctaLabel: string;
  ctaHref: string;
  note: string;
}) {
  const chips = messages.chips;
  const [active, setActive] = useState(0);
  const [typed, setTyped] = useState("");
  const [reduced, setReduced] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const run = useCallback(
    (i: number) => {
      setActive(i);
      if (timer.current) clearInterval(timer.current);
      const full = chips[i].a;
      if (reduced) {
        setTyped(full);
        return;
      }
      setTyped("");
      let n = 0;
      timer.current = setInterval(() => {
        n += 3;
        setTyped(full.slice(0, n));
        if (n >= full.length && timer.current) clearInterval(timer.current);
      }, 24);
    },
    [chips, reduced]
  );

  useEffect(() => {
    run(0);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const full = chips[active].a;
  const done = typed.length >= full.length;

  return (
    <div className="dash-card overflow-hidden p-0">
      <div className="flex flex-wrap gap-2 border-b border-line bg-white px-5 py-4 sm:px-6">
        {chips.map((c, i) => (
          <button
            key={c.q}
            type="button"
            onClick={() => run(i)}
            className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition-all ${
              i === active
                ? "border-brand bg-brand text-white shadow-[0_6px_16px_-6px_rgba(29,78,216,0.7)]"
                : "border-line bg-white text-ink-soft hover:border-brand hover:text-brand"
            }`}
          >
            {c.q}
          </button>
        ))}
      </div>
      <div className="bg-brand-tint-soft/60 px-5 py-6 sm:px-6">
        <p className="text-[12px] font-bold tracking-[0.18em] text-brand uppercase">
          NIEL AI
        </p>
        <p className="mt-3 min-h-[96px] text-[15px] leading-relaxed text-ink">
          {typed}
          {!reduced && !done && (
            <span aria-hidden="true" className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] animate-pulse bg-brand" />
          )}
        </p>
        <p className="mt-3 text-[12.5px] text-faint">{note}</p>
        <Link
          href={ctaHref}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-[14px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(29,78,216,0.8)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep"
        >
          {ctaLabel} →
        </Link>
      </div>
    </div>
  );
}
