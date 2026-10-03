"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "nielcos-pwa-dismissed";

/* "Install the app" prompt.
   - Chromium/Android: uses the beforeinstallprompt event -> native install.
   - iOS Safari: no install event exists -> show the Share > Add to Home
     Screen steps instead.
   Hidden when already installed (standalone) or after the user dismisses. */
export default function PwaInstallPrompt() {
  const t = useTranslations("pwa");
  const [ready, setReady] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setIsIos(ios);
    setReady(true);
    if (standalone || localStorage.getItem(DISMISS_KEY)) return;
    if (ios) {
      setVisible(true);
      return;
    }
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!ready || !visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode — just hide for this session */
    }
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) {
      dismiss();
      return;
    }
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {}
      setVisible(false);
    } else {
      dismiss();
    }
    setDeferred(null);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 sm:px-6 sm:pb-6" role="dialog" aria-label={t("installTitle")}>
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-line bg-white/95 p-3 shadow-xl backdrop-blur">
        <img src="/icons/icon-192.png" alt="" className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold text-ink">{t("installTitle")}</p>
          <p className="truncate text-[12px] text-ink-soft">{isIos && !deferred ? t("iosHint") : t("installSub")}</p>
        </div>
        {!isIos || deferred ? (
          <button
            type="button"
            onClick={install}
            className="shrink-0 rounded-xl bg-brand px-4 py-2.5 text-[13px] font-bold text-white hover:bg-brand-deep"
          >
            {t("installCta")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("installLater")}
          className="shrink-0 rounded-lg px-2 py-2 text-[13px] font-semibold text-ink-soft hover:bg-card-soft"
        >
          {t("installLater")}
        </button>
      </div>
    </div>
  );
}
