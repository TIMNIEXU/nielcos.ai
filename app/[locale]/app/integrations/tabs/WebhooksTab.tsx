"use client";

import { useEffect, useState } from "react";
import { fmtDate } from "../IntegrationsBoard";

type Endpoint = {
  id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  created_at: string;
};

type Delivery = {
  id: string;
  event: string;
  status_code: number | null;
  ok: boolean;
  error: string | null;
  duration_ms: number | null;
  created_at: string;
};

type Props = { m: Record<string, string>; locale: string; onChange: () => void };

const EVENT_LABEL: Record<string, string> = {
  "document.parsed": "ev_document_parsed",
  "drayage_move.created": "ev_drayage_move_created",
  "drayage_move.status_changed": "ev_drayage_move_status_changed",
  "webhook.test": "ev_webhook_test",
};

export default function WebhooksTab({ m, locale, onChange }: Props) {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [allEvents, setAllEvents] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Record<string, Delivery[]>>({});
  const [testResult, setTestResult] = useState<Record<string, string>>({});
  const [showSecret, setShowSecret] = useState<string | null>(null);

  const load = async () => {
    const r = await fetch("/api/app/integrations/webhooks");
    if (r.ok) {
      const j = await r.json();
      setEndpoints(j.endpoints ?? []);
      setAllEvents((j.events ?? []).map((e: any) => e.id));
      if (events.length === 0 && j.events) setEvents(j.events.map((e: any) => e.id));
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleEvent = (id: string) =>
    setEvents((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));

  const create = async () => {
    if (!url.trim() || events.length === 0 || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/app/integrations/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), events }),
      });
      if (r.ok) {
        setUrl("");
        setShowForm(false);
        load();
        onChange();
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (ep: Endpoint) => {
    const r = await fetch(`/api/app/integrations/webhooks/${ep.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !ep.is_active }),
    });
    if (r.ok) {
      load();
      onChange();
    }
  };

  const remove = async (ep: Endpoint) => {
    if (!window.confirm(m.deleteConfirm)) return;
    const r = await fetch(`/api/app/integrations/webhooks/${ep.id}`, { method: "DELETE" });
    if (r.ok) {
      load();
      onChange();
    }
  };

  const sendTest = async (ep: Endpoint) => {
    setTestResult((p) => ({ ...p, [ep.id]: "…" }));
    const r = await fetch(`/api/app/integrations/webhooks/${ep.id}/test`, { method: "POST" });
    if (r.ok) {
      const j = await r.json();
      const d = j.delivery;
      setTestResult((p) => ({
        ...p,
        [ep.id]: d.ok ? `${m.testOk} (${d.statusCode})` : `${m.testFail}: ${d.error ?? d.statusCode}`,
      }));
      if (expanded === ep.id) loadDeliveries(ep.id);
    } else {
      setTestResult((p) => ({ ...p, [ep.id]: m.testFail }));
    }
  };

  const loadDeliveries = async (id: string) => {
    const r = await fetch(`/api/app/integrations/webhooks/${id}/deliveries`);
    if (r.ok) {
      const j = await r.json();
      setDeliveries((p) => ({ ...p, [id]: j.deliveries ?? [] }));
    }
  };

  const toggleExpanded = (id: string) => {
    if (expanded === id) setExpanded(null);
    else {
      setExpanded(id);
      loadDeliveries(id);
    }
  };

  const evLabel = (id: string) => m[EVENT_LABEL[id] ?? ""] || id;

  return (
    <div className="space-y-4">
      <div className="dash-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink">{m.whTitle}</h2>
            <p className="mt-1 max-w-2xl text-[13.5px] text-muted">{m.whHint}</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            + {m.newEndpoint}
          </button>
        </div>

        {showForm && (
          <div className="mt-4 rounded-xl border border-line bg-card-soft p-4">
            <label className="text-[13px] font-bold text-ink">{m.whUrlLabel}</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={m.whUrlPh}
              className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 font-mono text-sm text-ink outline-none focus:border-brand"
            />
            <p className="mt-3 text-[13px] font-bold text-ink">{m.whEventsLabel}</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {allEvents.map((id) => (
                <button
                  key={id}
                  onClick={() => toggleEvent(id)}
                  className={`rounded-full px-3 py-1.5 text-[12.5px] font-bold ${
                    events.includes(id)
                      ? "bg-brand text-white"
                      : "border border-line bg-white text-ink-soft"
                  }`}
                >
                  {evLabel(id)}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={create}
                disabled={!url.trim() || events.length === 0 || busy}
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

        <div className="mt-4 space-y-3">
          {endpoints.map((ep) => (
            <div key={ep.id} className="rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <code className="break-all font-mono text-[13px] font-bold text-ink">{ep.url}</code>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(ep)}
                    className={`rounded-full px-3 py-1 text-[12px] font-bold ${
                      ep.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {ep.is_active ? m.statusActive : m.active}
                  </button>
                  <button
                    onClick={() => sendTest(ep)}
                    className="rounded-full border border-brand/40 px-3 py-1 text-[12px] font-bold text-brand hover:bg-brand-tint"
                  >
                    {m.test}
                  </button>
                  <button
                    onClick={() => toggleExpanded(ep.id)}
                    className="rounded-full border border-line px-3 py-1 text-[12px] font-bold text-ink-soft"
                  >
                    {m.deliveries}
                  </button>
                  <button
                    onClick={() => remove(ep)}
                    className="text-[12px] font-bold text-red-600 hover:underline"
                  >
                    {m.delete}
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ep.events.map((e) => (
                  <span
                    key={e}
                    className="rounded-full bg-brand-tint px-2.5 py-0.5 font-mono text-[11.5px] font-bold text-brand-deep"
                  >
                    {e}
                  </span>
                ))}
              </div>
              <div className="mt-2 text-[12.5px] text-muted">
                <span className="font-bold text-ink-soft">{m.whSecretLabel}: </span>
                <code className="font-mono">
                  {showSecret === ep.id ? ep.secret : ep.secret.slice(0, 10) + "…"}
                </code>{" "}
                <button
                  onClick={() => setShowSecret((v) => (v === ep.id ? null : ep.id))}
                  className="font-bold text-brand hover:underline"
                >
                  {showSecret === ep.id ? "hide" : "show"}
                </button>
                <span className="ml-2">{m.whSecretHint}</span>
              </div>
              {testResult[ep.id] && (
                <p className="mt-2 text-[13px] font-bold text-ink">{testResult[ep.id]}</p>
              )}
              {expanded === ep.id && (
                <div className="mt-3 overflow-x-auto rounded-lg bg-card-soft p-3">
                  <table className="w-full min-w-[480px] text-left text-[12.5px]">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-wide text-faint">
                        <th className="py-1 pr-3 font-semibold">{m.delThTime}</th>
                        <th className="py-1 pr-3 font-semibold">{m.delThEvent}</th>
                        <th className="py-1 pr-3 font-semibold">{m.delThStatus}</th>
                        <th className="py-1 font-semibold">{m.delThLatency}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(deliveries[ep.id] ?? []).map((d) => (
                        <tr key={d.id} className="border-t border-line-soft">
                          <td className="py-1.5 pr-3 text-ink-soft">{fmtDate(d.created_at, locale)}</td>
                          <td className="py-1.5 pr-3 font-mono text-ink">{d.event}</td>
                          <td className="py-1.5 pr-3">
                            {d.ok ? (
                              <span className="font-bold text-emerald-700">
                                {m.statusOk} {d.status_code}
                              </span>
                            ) : (
                              <span className="font-bold text-red-600">
                                {m.statusFail} {d.error ?? d.status_code}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 text-ink-soft">
                            {d.duration_ms != null ? `${d.duration_ms} ms` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(deliveries[ep.id] ?? []).length === 0 && (
                    <p className="py-3 text-center text-[12.5px] text-muted">{m.emptyDeliveries}</p>
                  )}
                </div>
              )}
            </div>
          ))}
          {endpoints.length === 0 && (
            <p className="py-6 text-center text-[13.5px] text-muted">{m.emptyWh}</p>
          )}
        </div>
      </div>
    </div>
  );
}
