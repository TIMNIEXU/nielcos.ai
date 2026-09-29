"use client";

import { useEffect, useState } from "react";
import { fmtDate } from "../IntegrationsBoard";

type Entry = {
  id: string;
  actor: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

type Props = { m: Record<string, string>; locale: string };

export default function AuditTab({ m, locale }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/app/integrations/audit?limit=200");
      if (r.ok) setEntries((await r.json()).entries ?? []);
    })();
  }, []);

  const actionLabel = (a: string) => m[`audit_${a.replace(/\./g, "_")}`] ?? a;

  const detailText = (e: Entry) => {
    const meta = e.meta ?? {};
    const bits: string[] = [];
    if (typeof meta.name === "string") bits.push(meta.name);
    if (typeof meta.prefix === "string") bits.push(meta.prefix);
    if (typeof meta.url === "string") bits.push(meta.url);
    if (typeof meta.filename === "string") bits.push(meta.filename);
    if (typeof meta.kind === "string") bits.push(`kind ${meta.kind}`);
    if (typeof meta.connector === "string") bits.push(m[`cn_${meta.connector}`] ?? String(meta.connector));
    if (typeof meta.ok === "boolean") bits.push(meta.ok ? m.statusOk : m.statusFail);
    return bits.join(" · ") || "—";
  };

  return (
    <div className="dash-card p-6">
      <h2 className="text-lg font-bold text-ink">{m.auditTitle}</h2>
      <p className="mt-1 text-[13.5px] text-muted">{m.auditHint}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13.5px]">
          <thead>
            <tr className="border-b border-line text-[12px] uppercase tracking-wide text-faint">
              <th className="py-2 pr-3 font-semibold">{m.auditThTime}</th>
              <th className="py-2 pr-3 font-semibold">{m.auditThActor}</th>
              <th className="py-2 pr-3 font-semibold">{m.auditThAction}</th>
              <th className="py-2 font-semibold">{m.auditThDetail}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-line-soft last:border-0">
                <td className="py-2.5 pr-3 whitespace-nowrap text-ink-soft">
                  {fmtDate(e.created_at, locale)}
                </td>
                <td className="py-2.5 pr-3 text-ink-soft">{e.actor}</td>
                <td className="py-2.5 pr-3 font-bold text-ink">{actionLabel(e.action)}</td>
                <td className="py-2.5 text-[12.5px] text-ink-soft">{detailText(e)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <p className="py-6 text-center text-[13.5px] text-muted">{m.emptyAudit}</p>
        )}
      </div>
    </div>
  );
}
