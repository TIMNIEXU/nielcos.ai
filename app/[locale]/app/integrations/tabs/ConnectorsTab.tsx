"use client";

import { useEffect, useState } from "react";

type Props = { m: Record<string, string>; locale: string; onChange: () => void };

const CARDS = [
  { id: "rest-api", open: "keys" },
  { id: "webhooks", open: "webhooks" },
  { id: "edi", open: "edi" },
  { id: "excel-import", open: null },
  { id: "netsuite", open: null },
  { id: "sap", open: null },
  { id: "quickbooks", open: null },
  { id: "shopify", open: null },
] as const;

const AVAILABLE = new Set(["rest-api", "webhooks", "edi", "excel-import"]);
const OPEN_LABEL: Record<string, string> = {
  keys: "conOpenKeys",
  webhooks: "conOpenWebhooks",
  edi: "conOpenEdi",
};

export default function ConnectorsTab({ m, onChange }: Props) {
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [askFor, setAskFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const load = async () => {
    const r = await fetch("/api/app/integrations/connectors");
    if (r.ok) {
      const j = await r.json();
      setRequested(new Set((j.requests ?? []).map((x: any) => x.connector)));
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async () => {
    if (!askFor || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/app/integrations/connectors/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connector: askFor, note: note.trim() }),
      });
      if (r.ok) {
        setSent(true);
        setRequested((p) => new Set(p).add(askFor));
        onChange();
      }
    } finally {
      setBusy(false);
    }
  };

  const closeAsk = () => {
    setAskFor(null);
    setNote("");
    setSent(false);
  };

  return (
    <div className="dash-card p-6">
      <h2 className="text-lg font-bold text-ink">{m.conTitle}</h2>
      <p className="mt-1 max-w-2xl text-[13.5px] text-muted">{m.conHint}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {CARDS.map((c) => {
          const available = AVAILABLE.has(c.id);
          const wasRequested = requested.has(c.id);
          const label = m[`cn_${c.id}`] ?? c.id;
          const desc = m[`cd_${c.id}`] ?? "";
          return (
            <div key={c.id} className="rounded-xl border border-line p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-ink">{label}</p>
                {available ? (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-bold text-emerald-700">
                    {m.conAvailable}
                  </span>
                ) : wasRequested ? (
                  <span className="shrink-0 rounded-full bg-brand-tint px-2.5 py-1 text-[11.5px] font-bold text-brand-deep">
                    {m.conRequested}
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setAskFor(c.id);
                      setSent(false);
                    }}
                    className="shrink-0 rounded-full border border-brand/40 px-3 py-1 text-[11.5px] font-bold text-brand hover:bg-brand-tint"
                  >
                    {m.conRequest}
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{desc}</p>
              {available && c.open && (
                <p className="mt-2 text-[12.5px] font-bold text-brand">
                  → {m[OPEN_LABEL[c.open]]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {askFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeAsk}>
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-ink">
              {m.conRequest} — {m[`cn_${askFor}`]}
            </h3>
            {sent ? (
              <p className="mt-3 text-[14px] text-ink-soft">{m.conSent}</p>
            ) : (
              <>
                <label className="mt-3 block text-[13px] font-bold text-ink">{m.conNoteLabel}</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={m.conNotePh}
                  rows={3}
                  className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                />
              </>
            )}
            <div className="mt-4 flex gap-2">
              {!sent && (
                <button
                  onClick={send}
                  disabled={busy}
                  className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                >
                  {m.conSend}
                </button>
              )}
              <button
                onClick={closeAsk}
                className="rounded-full border border-line px-4 py-2 text-sm font-bold text-ink-soft"
              >
                {sent ? m.ediClose : m.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
