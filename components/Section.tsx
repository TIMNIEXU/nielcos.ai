import Link from "next/link";
import type { ReactNode } from "react";
import Reveal from "./Reveal";

export function SectionHead({
  eyebrow,
  title,
  sub,
  align = "center",
  image,
  imageAlt = "",
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: string;
  align?: "center" | "left";
  image?: string;
  imageAlt?: string;
}) {
  const alignCls = align === "center" ? "items-center text-center" : "items-start text-left";
  return (
    <Reveal className={`flex flex-col gap-4 ${alignCls}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="max-w-3xl text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
        {title}
      </h2>
      {sub && (
        <p className={`max-w-2xl text-[15.5px] leading-relaxed text-muted ${align === "center" ? "mx-auto" : ""}`}>
          {sub}
        </p>
      )}
      {image && (
        <div className="mt-6 w-full overflow-hidden rounded-2xl shadow-lg">
          <img src={image} alt={imageAlt} className="h-64 w-full object-cover sm:h-80 lg:h-96" loading="lazy" />
        </div>
      )}
    </Reveal>
  );
}

export function CtaBand({
  title,
  sub,
  b1,
  b1Href,
  b2,
  b2Href,
}: {
  title: string;
  sub: string;
  b1: string;
  b1Href: string;
  b2: string;
  b2Href: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-brand-deep px-6 py-14 text-center sm:px-12 lg:py-16">
          <div className="dotgrid absolute inset-0 opacity-40" />
          <div className="absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand/60 blur-3xl" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/75">
              {sub}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={b1Href}
                className="rounded-full bg-white px-7 py-3 text-[15px] font-bold text-brand-deep shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                {b1}
              </Link>
              <Link
                href={b2Href}
                className="rounded-full border border-white/40 px-7 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
              >
                {b2}
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
