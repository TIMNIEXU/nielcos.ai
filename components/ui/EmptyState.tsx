"use client";

/**
 * EmptyState — icon + title + description + optional primary action.
 * The action is a link (href) so a Server Component can render this
 * without passing callbacks.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

type EmptyStateProps = {
  icon?: ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({ icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  const t = useTranslations("ui");
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line bg-card-soft px-6 py-12 text-center">
      {icon ? (
        <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-brand-tint-soft text-brand">
          {icon}
        </span>
      ) : null}
      <h3 className="text-base font-bold text-ink">{title ?? t("empty.noResults")}</h3>
      {description ? <p className="type-body mt-1.5 max-w-md text-muted">{description}</p> : null}
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-deep"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

/** Default inbox-style icon for empty states. */
export function EmptyInboxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="M3 8l9-5 9 5v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M3 8l9 5 9-5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
