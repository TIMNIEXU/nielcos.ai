"use client";

import { useEffect, useState } from "react";
import { fmtDate } from "../IntegrationsBoard";

type Key = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type Props = { m: Record<string, string>; locale: string; onChange: () => void };

export default function KeysTab({ m, locale, onChange }: Props) {
  const [keys, setKeys] = useState<Key[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [write, setWrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [freshKey, setFreshKey] = useState<{ raw: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  const load = async () => {
    const r = await fetch("/api/app/integrations/keys");
    if (r.ok) setKeys((await r.json()).keys ?? []);
  };
  useEffect(() => {
    load();
    setOrigin(window.location.origin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/app/integrations/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scopes: write ? ["read", "write"] : ["read"] }),
      });
      if (r.ok) {
        const j = await r.json();
        setFreshKey({ raw: j.raw, name: j.key.name });
        setName("");
        setWrite(false);
        setShowForm(false);
        load();
        onChange();
      }
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (k: Key) => {
    if (!window.confirm(m.revokeConfirm)) return;
    const r = await fetch(`/api/app/integrations/keys/${k.id}`, { method: "DELETE" });
    if (r.ok) {
      load();
      onChange();
    }
  };

  const copyKey = async () => {
    if (!freshKey) return;
    try {
      await navigator.clipboard.writeText(freshKey.raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const curl = (path: string, desc: string) =>
    `# ${desc}\ncurl -H "Authorization: Bearer $NIEL_API_KEY" \\\n  ${origin}${path}`;

  return (
    <div className="space-y-4">
      <div className="dash-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">{m.keysTitle}</h2>
            <p className="mt-1 max-w-2xl text-[13.5px] text-muted">{m.keysHint}</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            + {m.newKey}
          </button>
        </div>

        {showForm && (
          <div className="mt-4 rounded-xl border border-line bg-card-soft p-4">
            <label className="text-[13px] font-bold text-ink">{m.keyNameLabel}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 60))}
              maxLength={60}
              placeholder={m.keyNamePh}
              className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
            <div className="mt-3 space-y-1.5 text-[13.5px] text-ink-soft">
              <label className="flex items-center gap-2">
                <input type="radio" checked={!write} onChange={() => setWrite(false)} />
                {m.scopeRead}
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={write} onChange={() => setWrite(true)} />
                {m.scopeWrite}
              </label>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={create}
                disabled={!name.trim() || busy}
                className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                {m.create}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-full border border-line px-4 py-2 text-sm font-bold text-ink-soft"
              >
                {m.cancel}
              </button>
            </div>
          </div>
        )}

        {freshKey && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="font-bold text-[14px] text-ink">{m.keyOnceTitle} — {freshKey.name}</p>
            <p className="mt-1 text-[13px] text-ink-soft">{m.keyOnceWarn}</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-[12.5px] text-ink ring-1 ring-line">
                {freshKey.raw}
              </code>
              <button
                onClick={copyKey}
                className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white"
              >
                {copied ? m.copied : m.copy}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-[12px] uppercase tracking-wide text-faint">
                <th className="py-2 pr-3 font-semibold">{m.thName}</th>
                <th className="py-2 pr-3 font-semibold">{m.thPrefix}</th>
                <th className="py-2 pr-3 font-semibold">{m.thScopes}</th>
                <th className="py-2 pr-3 font-semibold">{m.thLastUsed}</th>
                <th className="py-2 pr-3 font-semibold">{m.thStatus}</th>
                <th className="py-2 font-semibold">{m.thActions}</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-line-soft last:border-0">
                  <td className="py-2.5 pr-3 font-bold text-ink">{k.name}</td>
                  <td className="py-2.5 pr-3 font-mono text-[12.5px] text-muted">{k.key_prefix}…</td>
                  <td className="py-2.5 pr-3 text-ink-soft">{k.scopes.join(", ")}</td>
                  <td className="py-2.5 pr-3 text-ink-soft">{fmtDate(k.last_used_at, locale)}</td>
                  <td className="py-2.5 pr-3">
                    {k.revoked_at ? (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[12px] font-bold text-gray-500">
                        {m.statusRevoked}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-bold text-emerald-700">
                        {m.statusActive}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5">
                    {!k.revoked_at && (
                      <button
                        onClick={() => revoke(k)}
                        className="text-[13px] font-bold text-red-600 hover:underline"
                      >
                        {m.revoke}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {keys.length === 0 && (
            <p className="py-6 text-center text-[13.5px] text-muted">{m.emptyKeys}</p>
          )}
        </div>
      </div>

      <div className="dash-card p-6">
        <h2 className="text-lg font-bold text-ink">{m.apiDocsTitle}</h2>
        <p className="mt-1 text-[13.5px] text-muted">
          {m.apiDocsSub}: <code className="font-mono text-[12.5px] text-ink">{origin}/api/v1</code>
        </p>
        <p className="mt-2 text-[13.5px] text-muted">{m.apiAuthNote}</p>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-ink p-4 font-mono text-[12px] leading-relaxed text-white">
          {'export NIEL_API_KEY="niel_sk_..."'}
        </pre>
        <div className="mt-3 space-y-3">
          {[
            ["/api/v1/shipments", m.epShipments],
            ["/api/v1/shipments/NIEL-2026-000001", m.epShipmentOne],
            ["/api/v1/documents", m.epDocuments],
          ].map(([path, desc]) => (
            <pre
              key={path as string}
              className="overflow-x-auto rounded-xl bg-ink p-4 font-mono text-[12px] leading-relaxed text-white"
            >
              {curl(path as string, desc as string)}
            </pre>
          ))}
        </div>
      </div>
    </div>
  );
}
