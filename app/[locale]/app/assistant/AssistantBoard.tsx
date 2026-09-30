"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Thread = { id: string; title: string; updated_at: string };
type Msg = { id: string; role: string; content: string; sources: { label: string; detail?: string }[]; kind?: "lookup" | "forecast" | "recommendation" };

const KIND_TONE: Record<string, string> = {
  lookup: "bg-sky-tint text-sky ring-sky/25",
  forecast: "bg-warn-tint text-warn ring-warn/25",
  recommendation: "bg-vio-tint text-vio ring-vio/25",
};

export default function AssistantBoard({ messages, locale }: { messages: Record<string, string>; locale: string }) {
  const t = (k: string) => messages[k] ?? k;
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async () => {
    try {
      const r = await fetch("/api/app/assistant/threads");
      const d = await r.json();
      setThreads(d.threads ?? []);
    } catch { /* keep old */ }
  }, []);

  const loadMsgs = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/app/assistant/threads/${id}`);
      const d = await r.json();
      setMsgs(d.messages ?? []);
    } catch { /* keep old */ }
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const openThread = (id: string) => {
    setActiveId(id);
    setMsgs([]);
    loadMsgs(id);
    setSideOpen(false);
  };

  const newChat = () => {
    setActiveId(null);
    setMsgs([]);
    setSideOpen(false);
  };

  const delThread = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;
    await fetch(`/api/app/assistant/threads/${id}`, { method: "DELETE" });
    if (activeId === id) newChat();
    loadThreads();
  };

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setBusy(true);
    setInput("");
    const userMsg: Msg = { id: "tmp-u-" + Date.now(), role: "user", content: q, sources: [] };
    setMsgs((m) => [...m, userMsg]);
    try {
      const r = await fetch("/api/app/assistant/ask", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread_id: activeId, question: q, locale }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      if (d.is_new) {
        setActiveId(d.thread_id);
        loadThreads();
      }
      setMsgs((m) => [...m, { id: "tmp-a-" + Date.now(), role: "assistant", content: d.answer, sources: d.sources ?? [], kind: d.kind ?? "lookup" }]);
    } catch {
      setMsgs((m) => [...m, { id: "tmp-e-" + Date.now(), role: "assistant", content: t("sendFailed"), sources: [] }]);
    }
    setBusy(false);
  };

  const suggs = [t("sugDuty"), t("sugTrack"), t("sugReg"), t("sugProd")];

  return (
    <div className="flex overflow-hidden rounded-3xl border border-line bg-white" style={{ height: "calc(100vh - 220px)", minHeight: 480 }}>
      {/* sidebar */}
      <aside className={`${sideOpen ? "absolute inset-y-0 left-0 z-20 w-64" : "hidden"} md:static md:flex w-64 shrink-0 flex-col border-r border-line bg-brand-tint-soft/40`}>
        <div className="p-3">
          <button onClick={newChat}
            className="w-full rounded-full bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5">
            + {t("newChat")}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {threads.length === 0 && <p className="px-3 py-4 text-xs text-ink-soft">{t("noThreads")}</p>}
          {threads.map((th) => (
            <div key={th.id}
              className={`group mb-1 flex items-center rounded-xl px-3 py-2 ${activeId === th.id ? "bg-white shadow-sm ring-1 ring-line" : "hover:bg-white/70"}`}>
              <button onClick={() => openThread(th.id)} className="min-w-0 flex-1 truncate text-left text-sm font-medium text-ink">
                {th.title}
              </button>
              <button onClick={() => delThread(th.id)} className="ml-1 shrink-0 text-xs text-ink-soft opacity-0 hover:text-risk group-hover:opacity-100">✕</button>
            </div>
          ))}
        </div>
      </aside>

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2 md:hidden">
          <button onClick={() => setSideOpen(!sideOpen)} className="rounded-full border border-line px-3 py-1 text-xs font-bold text-ink-soft">☰</button>
          <span className="truncate text-sm font-bold text-ink">{threads.find((x) => x.id === activeId)?.title ?? t("newChat")}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 md:px-8">
          {msgs.length === 0 && !busy ? (
            <div className="mx-auto max-w-xl pt-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-tint text-2xl">🤖</div>
              <h3 className="mt-4 text-lg font-bold text-ink">{t("emptyTitle")}</h3>
              <p className="mt-1 text-sm text-ink-soft">{t("emptySub")}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {suggs.map((s, i) => (
                  <button key={i} onClick={() => send(s)}
                    className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-brand-deep shadow-sm transition-colors hover:border-brand">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    m.role === "user" ? "bg-brand text-white" : "bg-brand-tint-soft/70 text-ink ring-1 ring-line"
                  }`}>
                    {m.role === "assistant" && m.kind && (
                      <span className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${KIND_TONE[m.kind] ?? KIND_TONE.lookup}`}>
                        {t(`aig.${m.kind}`)}
                      </span>
                    )}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                    {m.role === "assistant" && m.sources.length > 0 && (
                      <div className="mt-3 border-t border-line pt-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{t("sources")}</p>
                        <ul className="mt-1 space-y-0.5">
                          {m.sources.map((s, i) => (
                            <li key={i} className="text-xs text-ink-soft">
                              <span className="font-bold text-brand-deep">[{i + 1}] {s.label}</span>
                              {s.detail ? ` — ${s.detail}` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {m.role === "assistant" && m.kind && (
                      <p className="mt-2 text-[11px] italic text-ink-soft/80">ⓘ {t("aig.disclaimer")}</p>
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-brand-tint-soft/70 px-4 py-3 text-sm text-ink-soft ring-1 ring-line">
                    {t("thinking")}<span className="animate-pulse">…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t border-line p-3 md:px-6">
          <div className="mx-auto flex max-w-3xl gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={t("inputPh")}
              disabled={busy}
              className="min-w-0 flex-1 rounded-full border border-line bg-white px-5 py-2.5 text-sm text-ink outline-none placeholder:text-ink-soft/60 focus:border-brand disabled:opacity-60"
            />
            <button onClick={() => send()} disabled={busy || !input.trim()}
              className="shrink-0 rounded-full bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50">
              {t("send")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
