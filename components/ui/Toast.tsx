"use client";

/**
 * Toast — lightweight notification stack (success / warning / error).
 *
 * Usage:
 *   // 1. Mount ONCE near the root (e.g. app/[locale]/layout.tsx):
 *   //      <ToastProvider><Header/>...{children}</ToastProvider>
 *   // 2. Inside any client component under the provider:
 *   //      const toast = useToast();
 *   //      toast.success("Saved"); toast.warning("…"); toast.error("…");
 *
 * Guideline (7.0 spec): a toast is a transient hint — never the ONLY place an
 * error is shown. Pair errors with an inline message near the failed action.
 */
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";

export type ToastTone = "success" | "warning" | "error";

type ToastItem = { id: number; tone: ToastTone; message: string };

export type ToastApi = {
  notify: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
  error: (message: string) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

/** Graceful fallback so a forgotten provider warns instead of crashing a route. */
const fallbackApi: ToastApi = {
  notify: (m) => console.warn(`[ui/Toast] no <ToastProvider> mounted — dropped: ${m}`),
  success: (m) => console.warn(`[ui/Toast] no <ToastProvider> mounted — dropped: ${m}`),
  warning: (m) => console.warn(`[ui/Toast] no <ToastProvider> mounted — dropped: ${m}`),
  error: (m) => console.warn(`[ui/Toast] no <ToastProvider> mounted — dropped: ${m}`),
};

export function useToast(): ToastApi {
  return useContext(ToastCtx) ?? fallbackApi;
}

const AUTO_DISMISS_MS = 4500;

const toneIcon: Record<ToastTone, ReactNode> = {
  success: (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-ok" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 10.2l2.4 2.4 4.6-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-warn" aria-hidden="true">
      <path d="M10 2.5L18 16.5H2L10 2.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 7.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="13.8" r="1.1" fill="currentColor" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 text-risk" aria-hidden="true">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("ui");
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastTone = "success") => {
      const id = nextId.current++;
      setItems((prev) => [...prev.slice(-3), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const api: ToastApi = {
    notify,
    success: (m) => notify(m, "success"),
    warning: (m) => notify(m, "warning"),
    error: (m) => notify(m, "error"),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2"
      >
        {items.map((x) => (
          <div
            key={x.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-card border border-line bg-card p-3.5 shadow-pop"
          >
            <span className="mt-0.5 shrink-0">{toneIcon[x.tone]}</span>
            <p className="type-body min-w-0 flex-1 text-ink">{x.message}</p>
            <button
              type="button"
              onClick={() => dismiss(x.id)}
              aria-label={t("toast.close")}
              className="shrink-0 rounded-control p-1 text-faint transition hover:bg-line-soft hover:text-ink"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
