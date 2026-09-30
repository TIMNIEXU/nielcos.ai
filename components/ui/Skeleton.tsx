"use client";

/**
 * Skeleton — loading placeholders. Purely presentational (no i18n needed).
 * Card / TableRow / Text variants.
 */
import type { ReactNode } from "react";

function Block({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-control bg-line-soft ${className}`} />;
}

export function SkeletonCard({ children }: { children?: ReactNode }) {
  if (children) {
    return (
      <div className="rounded-card border border-line bg-card p-5" aria-busy="true">
        {children}
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-card border border-line bg-card p-5" aria-busy="true">
      <Block className="h-4 w-1/3" />
      <Block className="h-8 w-2/3" />
      <Block className="h-4 w-full" />
      <Block className="h-4 w-5/6" />
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <div className="grid gap-3 border-b border-line-soft px-4 py-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }} aria-busy="true">
      {Array.from({ length: cols }).map((_, i) => (
        <Block key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Block key={i} className={`h-3.5 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}
