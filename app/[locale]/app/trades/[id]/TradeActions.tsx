"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTradeStatus, deleteTrade } from "../actions";

export default function TradeActions({
  messages,
  tradeId,
  tradeNo,
  status,
  locale,
}: {
  messages: Record<string, string>;
  tradeId: string;
  tradeNo: string;
  status: string;
  locale: string;
}) {
  const t = (k: string) => messages[k] ?? k;
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<void>, after?: () => void) {
    startTransition(async () => {
      await fn();
      after?.();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "draft" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setTradeStatus(tradeId, "active"))}
          className="rounded-control border border-slate-200 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {t("activate")}
        </button>
      )}
      {status === "active" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setTradeStatus(tradeId, "completed"))}
          className="rounded-control border border-slate-200 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {t("complete")}
        </button>
      )}
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-control border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600"
        >
          {t("deleteTrade")}
        </button>
      ) : (
        <span className="flex items-center gap-2 rounded-control bg-red-50 px-3 py-2 text-sm">
          <span className="text-red-700">{t("confirmDelete").replace("%NO%", tradeNo)}</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => deleteTrade(tradeId), () => router.push(`/${locale}/app/trades`))}
            className="font-bold text-red-700 hover:underline disabled:opacity-50"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="font-bold text-slate-500 hover:underline"
          >
            ✕
          </button>
        </span>
      )}
    </div>
  );
}
