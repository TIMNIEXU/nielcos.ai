"use client";

/**
 * FormField — label + input + hint / inline error slot.
 *
 * The input itself is passed as children (a Server Component can pass the
 * element; no callbacks involved). Give the input the same id as `htmlFor`.
 * Shared input styling is exported as `fieldInputClass`.
 */
import { useId, type ReactNode } from "react";
import { useTranslations } from "next-intl";

export const fieldInputClass =
  "w-full rounded-control border border-line bg-card px-3 py-2 text-sm text-ink outline-none placeholder:text-faint transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-card-soft disabled:text-faint";

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  /** Inline validation message. Takes precedence over `hint`. */
  error?: string;
  children: ReactNode;
  className?: string;
};

export function FormField({ label, htmlFor, required, hint, error, children, className = "" }: FormFieldProps) {
  const t = useTranslations("ui");
  const uid = useId();
  const descId = error ? `${uid}-error` : hint ? `${uid}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="type-caption mb-1.5 flex items-center gap-1 font-semibold text-ink-soft">
        {label}
        {required ? (
          <span className="text-risk" aria-label={t("form.requiredMark")}>
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p id={descId} role="alert" className="type-caption mt-1.5 font-medium text-risk">
          {error}
        </p>
      ) : hint ? (
        <p id={descId} className="type-caption mt-1.5 text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
