"use client";

/**
 * ConfirmDialog — destructive confirmation.
 *
 * The body always names the object and states the consequence, e.g.
 *   Delete "%NAME%"? This action cannot be undone.
 * using a %NAME% marker (NOT ICU {name}: some pages pre-translate with
 * no-param t(k), which crashes on ICU placeholders).
 *
 * Render from a CLIENT component (open/onClose/onConfirm are callbacks).
 */
import { useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Object name interpolated into the body via %NAME% */
  name: string;
  title?: string;
  /** Override the default destructive body (must keep naming the object). */
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "destructive" | "default";
  /** Async confirm in flight — disables both buttons. */
  confirming?: boolean;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  name,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = "destructive",
  confirming = false,
}: ConfirmDialogProps) {
  const t = useTranslations("ui");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const resolvedTitle = title ?? (tone === "destructive" ? t("confirm.deleteTitle") : t("confirm.title"));
  const resolvedBody =
    body ?? t("confirm.deleteBody").replace("%NAME%", name);
  const resolvedConfirm =
    confirmLabel ?? (tone === "destructive" ? t("confirm.delete") : t("confirm.confirm"));

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center p-4" role="presentation">
      <button
        type="button"
        aria-label={t("confirm.cancel")}
        onClick={onClose}
        className="absolute inset-0 bg-navy/50"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={resolvedTitle}
        className="relative w-full max-w-md rounded-card border border-line bg-card p-6 shadow-pop"
      >
        <div className="flex items-start gap-3">
          {tone === "destructive" ? (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-risk-tint">
              <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-risk" aria-hidden="true">
                <path d="M10 2.5L18 16.5H2L10 2.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M10 7.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="10" cy="13.8" r="1.1" fill="currentColor" />
              </svg>
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink">{resolvedTitle}</h2>
            <div className="type-body mt-1.5 text-ink-soft">{resolvedBody}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="rounded-control border border-line bg-card px-4 py-2 text-sm font-semibold text-ink transition hover:bg-card-soft disabled:opacity-50"
          >
            {cancelLabel ?? t("confirm.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className={`rounded-control px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
              tone === "destructive"
                ? "bg-danger hover:bg-[#b52f2f]"
                : "bg-brand hover:bg-brand-deep"
            }`}
          >
            {confirming ? "…" : resolvedConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
