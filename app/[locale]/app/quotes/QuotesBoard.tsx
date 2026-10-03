"use client";

import { useCallback, useEffect, useState } from "react";

/* GRI-001 V4a — unified quote + HTS-verification triage board (login only).
   Follows the InsuranceBoard pattern: tabbed tables, claim / mark states,
   quoted amount + internal note dialog. Props carry pre-translated strings
   (plain object — never a function — per the RSC lesson in AGENTS.md). */

type Quote = {
  id: string; created_at: string; service: string;
  name: string | null; company: string | null; email: string | null;
  phone: string | null; origin: string | null; destination: string | null;
  cargo: string | null; value_usd: number | null; currency: string;
  message: string | null; status: string;
  company_id: string | null;
  quoted_amount: number | null; quoted_note: string | null;
};

type Verify = {
  id: string; created_at: string; hts_no: string;
  product_description: string | null; origin: string | null;
  contact_name: string | null; contact_email: string | null;
  contact_phone: string | null; status: string;
  company_id: string | null;
  quoted_amount: number | null; quoted_note: string | null;
};

const SVC_KEY: Record<string, string> = {
  customs: "svc_customs", freight: "svc_freight", drayage: "svc_drayage",
  warehouse: "svc_warehouse", insurance: "svc_insurance", bond: "svc_bond",
};

/* Service → operating entity routing (NIEL GROUP DIGITAL ARCHITECTURE).
   The triage queue is one pool; these badges + filters route each lead
   to the entity that fulfills it. */
const SVCS = ["customs", "freight", "drayage", "warehouse", "insurance", "bond"] as const;
const ENTITY: Record<string, string> = {
  customs: "Niel Customs",
  freight: "Niel Supply Chain",
  drayage: "JOMA Logistics",
  warehouse: "Niel Supply Chain",
  insurance: "Niel Insurance",
  bond: "Niel Insurance",
};

const Q_TONE: Record<string, string> = {
  new: "bg-warn-tint text-warn",
  quoted: "bg-brand-tint/60 text-brand",
  won: "bg-ok-tint text-ok",
  lost: "bg-card-soft text-faint",
  declined: "bg-card-soft text-faint",
};

function fmtDate(iso: string) { return iso.slice(0, 10); }
function fmtMoney(v: number | null) {
  if (v == null) return "—";
  return `USD ${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function QuotesBoard({ messages }: { messages: Record<string, string> }) {
  const t = (k: string) => messages[k] ?? k;
  const [tab, setTab] = useState<"quotes" | "verify">("quotes");
  const [svcFilter, setSvcFilter] = useState<string>("all");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [verifies, setVerifies] = useState<Verify[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [triage, setTriage] = useState<null | { kind: "quote" | "verify"; id: string; cur?: number | null; note?: string | null }>(null);
  const [qAmount, setQAmount] = useState("");
  const [qNote, setQNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qr, vr] = await Promise.all([
        fetch("/api/app/quotes"),
        fetch("/api/app/classify/verifications"),
      ]);
      const qd = await qr.json();
      const vd = await vr.json();
      setQuotes(qd.quotes ?? []);
      setVerifies(vd.verifications ?? []);
    } catch { /* keep old */ }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const patch = async (kind: "quote" | "verify", id: string, body: Record<string, unknown>) => {
    setErr("");
    try {
      const url = kind === "quote" ? "/api/app/quotes" : "/api/app/classify/verifications";
      const r = await fetch(url, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      if (!r.ok) throw new Error();
      await load();
    } catch {
      setErr(t("saveFailed"));
    }
  };

  const openTriage = (kind: "quote" | "verify", row: Quote | Verify) => {
    setTriage({ kind, id: row.id, cur: row.quoted_amount, note: row.quoted_note });
    setQAmount(row.quoted_amount != null ? String(row.quoted_amount) : "");
    setQNote(row.quoted_note ?? "");
  };

  const saveTriage = async () => {
    if (!triage) return;
    const v = parseFloat(qAmount.replace(/[^0-9.\-]/g, ""));
    await patch(triage.kind, triage.id, {
      status: "quoted",
      quoted_amount: Number.isFinite(v) && v >= 0 ? v : null,
      quoted_note: qNote.trim() || null,
    });
    setTriage(null);
  };

  const svcLabel = (s: string) => t(SVC_KEY[s] ?? s);
  const entityOf = (s: string) => ENTITY[s] ?? "";
  const visibleQuotes = svcFilter === "all" ? quotes : quotes.filter((q) => q.service === svcFilter);
  const svcCount = (s: string) => quotes.filter((q) => q.service === s).length;
  const qStatusLabel = (s: string) =>
    ({ new: t("stNew"), quoted: t("stQuoted"), won: t("stWon"), lost: t("stLost"), declined: t("stDeclined") } as Record<string, string>)[s] ?? s;
  const vStatusLabel = (s: string) =>
    ({ requested: t("vRequested"), quoted: t("vQuoted"), verified: t("vVerified"), declined: t("vDeclined") } as Record<string, string>)[s] ?? s;

  const stats = [
    { l: t("statNew"), v: quotes.filter((q) => q.status === "new").length },
    { l: t("statQuoted"), v: quotes.filter((q) => q.status === "quoted").length },
    { l: t("statVerify"), v: verifies.filter((x) => x.status === "requested").length },
  ];

  const th = "px-3 py-2.5 text-left font-bold text-ink-soft whitespace-nowrap";
  const td = "px-3 py-2.5 align-top";

  const actionsFor = (kind: "quote" | "verify", row: Quote | Verify, status: string) => (
    <div className="flex flex-wrap gap-1.5">
      {!row.company_id && (
        <button onClick={() => patch(kind, row.id, { status, claim: true })}
          className="rounded-full bg-brand px-3 py-1 text-[12px] font-bold text-white hover:bg-brand-deep">
          {t("claim")}
        </button>
      )}
      <button onClick={() => openTriage(kind, row)}
        className="rounded-full border border-line px-3 py-1 text-[12px] font-bold text-ink-soft hover:border-brand">
        {kind === "quote" ? t("markQuoted") : t("vMarkQuoted")}
      </button>
      {kind === "quote" ? (
        <>
          <button onClick={() => patch("quote", row.id, { status: "won" })}
            className="rounded-full border border-line px-3 py-1 text-[12px] font-bold text-ok hover:border-ok">
            {t("markWon")}
          </button>
          <button onClick={() => patch("quote", row.id, { status: "lost" })}
            className="rounded-full border border-line px-3 py-1 text-[12px] font-bold text-faint hover:border-faint">
            {t("markLost")}
          </button>
          <button onClick={() => patch("quote", row.id, { status: "declined" })}
            className="rounded-full border border-line px-3 py-1 text-[12px] font-bold text-risk hover:border-risk">
            {t("markDeclined")}
          </button>
        </>
      ) : (
        <>
          <button onClick={() => patch("verify", row.id, { status: "verified" })}
            className="rounded-full border border-line px-3 py-1 text-[12px] font-bold text-ok hover:border-ok">
            {t("vMarkVerified")}
          </button>
          <button onClick={() => patch("verify", row.id, { status: "declined" })}
            className="rounded-full border border-line px-3 py-1 text-[12px] font-bold text-risk hover:border-risk">
            {t("markDeclined")}
          </button>
        </>
      )}
    </div>
  );

  return (
    <div>
      {/* stats */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.l} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-[26px] font-bold text-ink">{s.v}</p>
            <p className="text-[12.5px] text-muted">{s.l}</p>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="mt-5 flex gap-2">
        {(["quotes", "verify"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full px-5 py-2 text-[13.5px] font-bold ${tab === k ? "bg-brand text-white" : "border border-line text-ink-soft hover:border-brand"}`}
          >
            {k === "quotes" ? t("tabQuotes") : t("tabVerify")}
          </button>
        ))}
      </div>

      {err && <p className="mt-3 text-[13px] font-semibold text-risk">{err}</p>}

      {/* service routing filter — one queue, routed per entity */}
      {tab === "quotes" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setSvcFilter("all")}
            className={`rounded-full px-4 py-1.5 text-[12.5px] font-bold ${svcFilter === "all" ? "bg-ink text-white" : "border border-line text-ink-soft hover:border-brand"}`}
          >
            {t("fAll")} ({quotes.length})
          </button>
          {SVCS.map((s) => (
            <button
              key={s}
              onClick={() => setSvcFilter(s)}
              title={entityOf(s)}
              className={`rounded-full px-4 py-1.5 text-[12.5px] font-bold ${svcFilter === s ? "bg-ink text-white" : "border border-line text-ink-soft hover:border-brand"}`}
            >
              {svcLabel(s)} ({svcCount(s)})
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-[14px] text-muted">…</p>
      ) : tab === "quotes" ? (
        visibleQuotes.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-line bg-white p-8 text-center text-[14px] text-muted">{t("emptyQuotes")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead>
                <tr className="border-b border-line bg-slate-50/60">
                  <th className={th}>{t("thDate")}</th><th className={th}>{t("thService")}</th>
                  <th className={th}>{t("thContact")}</th><th className={th}>{t("thRoute")}</th>
                  <th className={th}>{t("thCargo")}</th><th className={th}>{t("thStatus")}</th>
                  <th className={th}>{t("thActions")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleQuotes.map((q) => (
                  <tr key={q.id} className="border-b border-line last:border-0">
                    <td className={td}>{fmtDate(q.created_at)}</td>
                    <td className={td}>
                      <span className="font-bold text-ink">{svcLabel(q.service)}</span>
                      {entityOf(q.service) && (
                        <p className="mt-0.5 text-[11px] font-semibold text-brand-deep">→ {entityOf(q.service)}</p>
                      )}
                    </td>
                    <td className={td}>
                      <p className="font-semibold text-ink">{q.name ?? "—"}</p>
                      <p className="text-[12px] text-muted">{q.company ?? ""}</p>
                      <p className="text-[12px] text-brand">{q.email ?? ""}</p>
                      {q.company_id ? (
                        <p className="mt-1 text-[11px] font-bold text-ok">● {t("claimedByYou")}</p>
                      ) : (
                        <p className="mt-1 text-[11px] font-bold text-warn">○ {t("unclaimed")}</p>
                      )}
                    </td>
                    <td className={td}>{[q.origin, q.destination].filter(Boolean).join(" → ") || "—"}</td>
                    <td className={td}>
                      <p className="max-w-[220px] truncate text-ink">{q.cargo ?? "—"}</p>
                      {q.value_usd != null && <p className="text-[12px] text-muted">{fmtMoney(q.value_usd)}</p>}
                      {q.quoted_amount != null && <p className="text-[12px] font-bold text-brand">{t("qAmount")}: {fmtMoney(q.quoted_amount)}</p>}
                    </td>
                    <td className={td}>
                      <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${Q_TONE[q.status] ?? Q_TONE.new}`}>
                        {qStatusLabel(q.status)}
                      </span>
                    </td>
                    <td className={td}>{actionsFor("quote", q, q.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : verifies.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-line bg-white p-8 text-center text-[14px] text-muted">{t("emptyVerify")}</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[860px] text-[13px]">
            <thead>
              <tr className="border-b border-line bg-slate-50/60">
                <th className={th}>{t("thDate")}</th><th className={th}>{t("thHts")}</th>
                <th className={th}>{t("thProduct")}</th><th className={th}>{t("thContact")}</th>
                <th className={th}>{t("thStatus")}</th><th className={th}>{t("thActions")}</th>
              </tr>
            </thead>
            <tbody>
              {verifies.map((v) => (
                <tr key={v.id} className="border-b border-line last:border-0">
                  <td className={td}>{fmtDate(v.created_at)}</td>
                  <td className={td}><span className="font-mono font-bold text-ink">{v.hts_no}</span>{v.origin && <p className="text-[12px] text-muted">{v.origin}</p>}</td>
                  <td className={td}><p className="max-w-[240px] text-ink">{v.product_description ?? "—"}</p>
                    {v.quoted_amount != null && <p className="text-[12px] font-bold text-brand">{t("qAmount")}: {fmtMoney(v.quoted_amount)}</p>}
                  </td>
                  <td className={td}>
                    <p className="font-semibold text-ink">{v.contact_name ?? "—"}</p>
                    <p className="text-[12px] text-brand">{v.contact_email ?? ""}</p>
                    {v.company_id ? (
                      <p className="mt-1 text-[11px] font-bold text-ok">● {t("claimedByYou")}</p>
                    ) : (
                      <p className="mt-1 text-[11px] font-bold text-warn">○ {t("unclaimed")}</p>
                    )}
                  </td>
                  <td className={td}>
                    <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${Q_TONE[v.status] ?? Q_TONE.new}`}>
                      {vStatusLabel(v.status)}
                    </span>
                  </td>
                  <td className={td}>{actionsFor("verify", v, v.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* triage dialog */}
      {triage && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setTriage(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-[16px] font-bold text-ink">{triage.kind === "quote" ? t("markQuoted") : t("vMarkQuoted")}</p>
            <label className="mt-4 block text-[12.5px] font-bold text-ink-soft">{t("qAmount")}</label>
            <input value={qAmount} onChange={(e) => setQAmount(e.target.value)} inputMode="decimal"
              className="mt-1 w-full rounded-xl border border-line px-4 py-2.5 text-[14px] outline-none focus:border-brand" />
            <label className="mt-3 block text-[12.5px] font-bold text-ink-soft">{t("qNote")}</label>
            <input value={qNote} onChange={(e) => setQNote(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line px-4 py-2.5 text-[14px] outline-none focus:border-brand" />
            <div className="mt-5 flex gap-2">
              <button onClick={() => setTriage(null)}
                className="flex-1 rounded-full border border-line py-2.5 text-[14px] font-bold text-ink-soft">{t("cancel")}</button>
              <button onClick={() => saveTriage()}
                className="flex-1 rounded-full bg-brand py-2.5 text-[14px] font-bold text-white hover:bg-brand-deep">{t("save")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
