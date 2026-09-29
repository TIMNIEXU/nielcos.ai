"use client";

import { useEffect, useState } from "react";

type Match = { name: string; via: string; source: string; program: string | null; score: number };
type ScreenRes = {
  ok: boolean; result: "clear" | "review" | "hit"; matches: Match[];
  screened_at: string; watchlist_size: number;
};
type Log = { id: string; query_name: string; query_country: string | null; result: string; match_detail: string | null; created_at: string };
type Update = { id: string; title: string; title_zh: string | null; body: string; body_zh: string | null; source: string | null; effective_date: string | null; url: string | null; auto_imported: boolean; created_at: string };

const RES_STYLE: Record<string, string> = {
  clear: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  review: "bg-amber-50 text-amber-800 ring-amber-200",
  hit: "bg-red-50 text-red-700 ring-red-200",
};

export default function ComplianceBoard({ t }: { t: Record<string, string> }) {
  const [tab, setTab] = useState<"screen" | "logs" | "updates">("screen");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [res, setRes] = useState<ScreenRes | null>(null);
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [stats, setStats] = useState<{ total: number; bySource: Record<string, number> } | null>(null);
  const [importMsg, setImportMsg] = useState("");
  const [intName, setIntName] = useState("");
  const [intCountry, setIntCountry] = useState("");
  const [nt, setNt] = useState({ title: "", body: "", source: "", date: "" });
  const [syncMsg, setSyncMsg] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [zhOn, setZhOn] = useState(
    () => typeof document !== "undefined" && document.documentElement.lang.startsWith("zh")
  );

  async function refreshMeta() {
    const [s, l, u] = await Promise.all([
      fetch("/api/app/compliance/watchlist").then((r) => r.json()),
      fetch("/api/app/compliance/logs?limit=100").then((r) => r.json()),
      fetch("/api/app/compliance/updates").then((r) => r.json()),
    ]);
    if (s.total != null) setStats(s);
    if (l.logs) setLogs(l.logs);
    if (u.updates) setUpdates(u.updates);
  }
  useEffect(() => { refreshMeta(); }, []);

  async function doScreen(e?: React.FormEvent) {
    e?.preventDefault();
    if (name.trim().length < 3 || busy) return;
    setBusy(true);
    setRes(null);
    try {
      const r = await fetch("/api/app/compliance/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), country: country.trim() || undefined }),
      });
      const j = await r.json();
      if (j.ok) setRes(j);
    } finally {
      setBusy(false);
      refreshMeta();
    }
  }

  async function importSeed() {
    setImportMsg(t.importing);
    try {
      const seed = await fetch("/data/sdn_seed.json").then((r) => r.json());
      const entries = (seed.entries ?? []).map((e: any) => ({
        name: e.name, aliases: e.aliases, source: "OFAC SDN", program: e.program || null,
      }));
      let done = 0;
      for (let i = 0; i < entries.length; i += 800) {
        const r = await fetch("/api/app/compliance/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries: entries.slice(i, i + 800) }),
        });
        const j = await r.json();
        if (!j.ok) throw new Error(j.detail || "import failed");
        done += entries.slice(i, i + 800).length;
        setImportMsg(`${t.importing} ${done}/${entries.length}`);
      }
      setImportMsg(`${t.importDone} · OFAC SDN ${t.seedAsOf} ${seed.as_of}`);
    } catch (e) {
      setImportMsg(String((e as Error).message || e));
    }
    refreshMeta();
  }

  async function addInternal(e: React.FormEvent) {
    e.preventDefault();
    if (intName.trim().length < 2) return;
    await fetch("/api/app/compliance/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries: [{ name: intName.trim(), source: "internal", country: intCountry.trim() || null }],
        companyScoped: true,
      }),
    });
    setIntName(""); setIntCountry("");
    refreshMeta();
  }

  async function syncFederalRegister() {
    if (syncing) return;
    setSyncing(true);
    setSyncMsg(t.syncing);
    try {
      const r = await fetch("/api/app/compliance/updates/refresh", { method: "POST" });
      const j = await r.json();
      if (j.ok) setSyncMsg(`${t.synced}: ${j.inserted} new / ${j.relevant} relevant / ${j.scanned} scanned`);
      else setSyncMsg(j.detail || j.error || "failed");
    } catch (e) {
      setSyncMsg(String((e as Error).message || e));
    } finally {
      setSyncing(false);
      refreshMeta();
    }
  }

  async function publishUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!nt.title.trim()) return;
    const r = await fetch("/api/app/compliance/updates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: nt.title.trim(), body: nt.body.trim(), source: nt.source.trim() || null, effective_date: nt.date || null }),
    });
    if ((await r.json()).ok) {
      setNt({ title: "", body: "", source: "", date: "" });
      refreshMeta();
    }
  }

  const tabs: { id: "screen" | "logs" | "updates"; label: string }[] = [
    { id: "screen", label: t.tabScreen },
    { id: "logs", label: t.tabLogs },
    { id: "updates", label: t.tabUpdates },
  ];

  return (
    <div>
      <div className="flex gap-2">
        {tabs.map((x) => (
          <button
            key={x.id}
            onClick={() => setTab(x.id)}
            className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${
              tab === x.id ? "bg-brand text-white shadow" : "bg-white text-ink-soft ring-1 ring-line hover:text-ink"
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      {tab === "screen" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
            <form onSubmit={doScreen} className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-line">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-ink">{t.screenName}</span>
                  <input
                    value={name} onChange={(e) => setName(e.target.value)}
                    placeholder={t.screenNamePh}
                    className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-ink">{t.screenCountry}</span>
                  <input
                    value={country} onChange={(e) => setCountry(e.target.value)}
                    placeholder={t.screenCountryPh}
                    className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand"
                  />
                </label>
              </div>
              <button
                type="submit" disabled={busy || name.trim().length < 3}
                className="mt-4 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white disabled:opacity-40"
              >
                {busy ? t.screening : t.screenBtn}
              </button>
            </form>

            {res && (
              <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-line">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-4 py-1.5 text-sm font-bold ring-1 ${RES_STYLE[res.result]}`}>
                    {res.result === "clear" ? t.resultClear : res.result === "review" ? t.resultReview : t.resultHit}
                  </span>
                  <span className="text-xs text-faint">
                    {t.watchlistSize}: {res.watchlist_size.toLocaleString()} · {new Date(res.screened_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {res.result === "clear" ? t.resultClearNote : res.result === "review" ? t.resultReviewNote : t.resultHitNote}
                </p>
                {res.matches.length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {res.matches.map((m, i) => (
                      <li key={i} className="rounded-xl bg-card-soft p-3 text-sm ring-1 ring-line-soft">
                        <span className="font-bold text-ink">{m.name}</span>
                        <span className="ml-2 text-xs text-faint">{m.source}{m.program ? ` · ${m.program}` : ""}</span>
                        <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-ink-soft ring-1 ring-line">
                          {Math.round(m.score * 100)}%
                        </span>
                        {m.via !== m.name && <span className="block text-xs text-faint">{t.matchedVia}: {m.via}</span>}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-xs text-faint">{t.loggedNote}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-line">
              <h3 className="font-bold text-ink">{t.watchlist}</h3>
              {stats ? (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {Object.entries(stats.bySource).map(([s, n]) => (
                    <li key={s} className="flex justify-between">
                      <span className="text-ink-soft">{s}</span>
                      <span className="font-bold text-ink">{n.toLocaleString()}</span>
                    </li>
                  ))}
                  <li className="flex justify-between border-t border-line-soft pt-1.5">
                    <span className="font-bold text-ink">Total</span>
                    <span className="font-bold text-brand">{stats.total.toLocaleString()}</span>
                  </li>
                </ul>
              ) : (
                <p className="mt-3 text-sm text-faint">…</p>
              )}
              <button
                onClick={importSeed}
                className="mt-4 w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white"
              >
                {t.importSeed}
              </button>
              {importMsg && <p className="mt-2 text-xs text-ink-soft">{importMsg}</p>}
            </div>

            <form onSubmit={addInternal} className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-line">
              <h3 className="font-bold text-ink">{t.addInternal}</h3>
              <input
                value={intName} onChange={(e) => setIntName(e.target.value)}
                placeholder={t.intNamePh}
                className="mt-3 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand"
              />
              <input
                value={intCountry} onChange={(e) => setIntCountry(e.target.value)}
                placeholder={t.intCountryPh}
                className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand"
              />
              <button type="submit" className="mt-3 w-full rounded-xl bg-card-soft px-4 py-2.5 text-sm font-bold text-ink ring-1 ring-line">
                {t.add}
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === "logs" && (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line">
          {logs.length === 0 ? (
            <p className="p-8 text-center text-sm text-faint">{t.logsEmpty}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-card-soft text-left text-xs uppercase tracking-wide text-faint">
                  <th className="px-5 py-3">{t.logTime}</th>
                  <th className="px-5 py-3">{t.logQuery}</th>
                  <th className="px-5 py-3">{t.logResult}</th>
                  <th className="px-5 py-3">{t.logMatch}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-line-soft last:border-0">
                    <td className="whitespace-nowrap px-5 py-3 text-faint">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="px-5 py-3 font-semibold text-ink">
                      {l.query_name}
                      {l.query_country && <span className="ml-2 text-xs font-normal text-faint">{l.query_country}</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${RES_STYLE[l.result] ?? ""}`}>
                        {l.result === "clear" ? t.resultClear : l.result === "review" ? t.resultReview : t.resultHit}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-ink-soft">{l.match_detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "updates" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex rounded-full bg-white p-1 ring-1 ring-line">
                {(["en", "zh"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setZhOn(v === "zh")}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                      (v === "zh") === zhOn ? "bg-brand text-white" : "text-muted hover:text-ink"
                    }`}
                  >
                    {v === "zh" ? t.zhToggle : t.enToggle}
                  </button>
                ))}
              </div>
            </div>
            {zhOn && (
              <p className="text-xs text-faint">{t.mtNote}</p>
            )}
            {updates.length === 0 ? (
              <p className="rounded-2xl bg-white p-8 text-center text-sm text-faint shadow-card ring-1 ring-line">{t.updatesEmpty}</p>
            ) : (
              updates.map((u) => {
                const showZh = zhOn && u.title_zh;
                return (
                <article key={u.id} className="rounded-2xl bg-white p-6 shadow-card ring-1 ring-line">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-faint">
                    {u.effective_date && (
                      <span className="rounded-full bg-brand-tint px-2.5 py-1 font-bold text-brand">
                        {t.effective} {u.effective_date}
                      </span>
                    )}
                    {u.source && <span>{u.source}</span>}
                  </div>
                  <h3 className="mt-2 font-bold text-ink">
                    {u.url ? (
                      <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-brand-deep hover:underline">
                        {showZh ? u.title_zh : u.title} ↗
                      </a>
                    ) : (
                      showZh ? u.title_zh : u.title
                    )}
                  </h3>
                  {u.auto_imported && (
                    <span className="mt-1.5 inline-block rounded-full bg-brand-tint px-2.5 py-0.5 text-[11px] font-bold text-brand">
                      {t.autoBadge}
                    </span>
                  )}
                  {(showZh ? u.body_zh : u.body) && <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{showZh ? u.body_zh : u.body}</p>}
                </article>
                );
              })
            )}
          </div>
          <form onSubmit={publishUpdate} className="lg:col-span-2 h-fit rounded-2xl bg-white p-6 shadow-card ring-1 ring-line">
            <h3 className="font-bold text-ink">{t.newUpdate}</h3>
            <button
              type="button" onClick={syncFederalRegister} disabled={syncing}
              className="mt-3 w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              {syncing ? t.syncing : t.syncNow}
            </button>
            {syncMsg && <p className="mt-2 text-xs text-ink-soft">{syncMsg}</p>}
            <input
              value={nt.title} onChange={(e) => setNt({ ...nt, title: e.target.value })}
              placeholder={t.upTitlePh}
              className="mt-3 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand"
            />
            <textarea
              value={nt.body} onChange={(e) => setNt({ ...nt, body: e.target.value })}
              placeholder={t.upBodyPh} rows={4}
              className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand"
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                value={nt.source} onChange={(e) => setNt({ ...nt, source: e.target.value })}
                placeholder={t.upSourcePh}
                className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand"
              />
              <input
                type="date" value={nt.date} onChange={(e) => setNt({ ...nt, date: e.target.value })}
                className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-brand"
              />
            </div>
            <button type="submit" className="mt-3 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white">
              {t.publish}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
