"use client";

import { useCallback, useEffect, useState } from "react";
import KeysTab from "./tabs/KeysTab";
import WebhooksTab from "./tabs/WebhooksTab";
import EdiTab from "./tabs/EdiTab";
import ConnectorsTab from "./tabs/ConnectorsTab";
import AuditTab from "./tabs/AuditTab";

type Props = {
  messages: Record<string, string>;
  appMessages: Record<string, string>;
  locale: string;
};

export function fmtDate(iso: string | null, locale: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function IntegrationsBoard({ messages: m, locale }: Props) {
  const [tab, setTab] = useState<"keys" | "webhooks" | "edi" | "connectors" | "audit">("keys");
  const [stats, setStats] = useState({ activeKeys: 0, activeWebhooks: 0, ediDocuments: 0, connectorRequests: 0 });

  const reloadStats = useCallback(async () => {
    try {
      const r = await fetch("/api/app/integrations");
      if (r.ok) setStats(await r.json());
    } catch {
      /* stats are decorative */
    }
  }, []);
  useEffect(() => {
    reloadStats();
  }, [reloadStats]);

  const tabs = [
    { id: "keys", label: m.tabKeys },
    { id: "webhooks", label: m.tabWebhooks },
    { id: "edi", label: m.tabEdi },
    { id: "connectors", label: m.tabConnectors },
    { id: "audit", label: m.tabAudit },
  ] as const;

  const statCards = [
    { label: m.statKeys, value: stats.activeKeys },
    { label: m.statWebhooks, value: stats.activeWebhooks },
    { label: m.statEdi, value: stats.ediDocuments },
    { label: m.statRequests, value: stats.connectorRequests },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="dash-card p-4">
            <p className="text-2xl font-bold text-ink">{s.value}</p>
            <p className="mt-1 text-[12.5px] font-medium text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              tab === t.id
                ? "bg-brand text-white"
                : "border border-line bg-white text-ink-soft hover:border-brand/40"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "keys" && <KeysTab m={m} locale={locale} onChange={reloadStats} />}
        {tab === "webhooks" && <WebhooksTab m={m} locale={locale} onChange={reloadStats} />}
        {tab === "edi" && <EdiTab m={m} locale={locale} onChange={reloadStats} />}
        {tab === "connectors" && <ConnectorsTab m={m} locale={locale} onChange={reloadStats} />}
        {tab === "audit" && <AuditTab m={m} locale={locale} />}
      </div>
    </div>
  );
}
