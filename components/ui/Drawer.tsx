"use client";

/**
 * Drawer — right slide-over panel.
 *
 * Render from a CLIENT component (open/onClose are callbacks; a Server
 * Component must not pass functions to a Client Component).
 *
 *   const [open, setOpen] = useState(false);
 *   <button onClick={() => setOpen(true)}>…</button>
 *   <Drawer open={open} onClose={() => setOpen(false)} title="…">…</Drawer>
 */
import { useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** md = 480px, lg = 560px (7.0 spec) */
  size?: "md" | "lg";
  footer?: ReactNode;
};

export function Drawer({ open, onClose, title, children, size = "md", footer }: DrawerProps) {
  const t = useTranslations("ui");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const width = size === "lg" ? "sm:w-[560px]" : "sm:w-[480px]";

  return (
    <div className={open ? undefined : "hidden"} aria-hidden={open ? undefined : true}>
      {/* overlay */}
      <button
        type="button"
        aria-label={t("drawer.close")}
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        className={`fixed inset-0 z-[90] bg-navy/50 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed inset-y-0 right-0 z-[91] flex w-full ${width} flex-col bg-card shadow-pop transition-transform duration-250 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="type-h2 truncate text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("drawer.close")}
            className="shrink-0 rounded-control p-2 text-muted transition hover:bg-line-soft hover:text-ink"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-line px-5 py-4">{footer}</div> : null}
      </aside>
    </div>
  );
}
