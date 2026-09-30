"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { linkShipment, unlinkShipment } from "../actions";

export function LinkForm({ messages, tradeId }: { messages: Record<string, string>; tradeId: string }) {
  const t = (k: string) => messages[k] ?? k;
  const router = useRouter();
  const [gttid, setGttid] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await linkShipment(tradeId, gttid);
        setGttid("");
        router.refresh();
      } catch {
        setError(t("linkFailed"));
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-ink">{t("linkShipment")}</span>
      <input
        value={gttid}
        onChange={(e) => setGttid(e.target.value)}
        placeholder={t("gttidPh")}
        className="min-w-52 flex-1 rounded-control border border-slate-200 bg-white px-3 py-2 font-mono text-sm"
      />
      <button
        type="submit"
        disabled={pending || !gttid.trim()}
        className="rounded-control bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
      >
        {t("link")}
      </button>
      {error && <span className="w-full text-sm text-red-600">{error}</span>}
    </form>
  );
}

export function UnlinkButton({ messages, gttid }: { messages: Record<string, string>; gttid: string }) {
  const t = (k: string) => messages[k] ?? k;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => { await unlinkShipment(gttid); router.refresh(); })}
      className="text-xs font-medium text-slate-400 hover:text-red-600 disabled:opacity-50"
    >
      {t("unlink")}
    </button>
  );
}
