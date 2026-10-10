"use client";

import { useCallback, useEffect, useMemo, useState, Fragment } from "react";

type Quote = {
  id: string; created_at: string; name: string; company: string | null;
  email: string; phone: string | null; cargo_value: number | null;
  currency: string; origin: string | null; destination: string | null;
  mode: string; coverage: string; message: string | null; status: string;
  company_id: string | null; quoted_premium: number | null; quoted_note: string | null;
  bond_recommendation: string | null; bond_amount_est: number | null;
  annual_import_value: number | null; entries_per_year: number | null;
  duties_paid: number | null;
};

type Policy = {
  id: string; quote_id: string | null; shipment_id: string | null; gttid: string | null;
  policy_no: string; insurer: string | null; coverage: string;
  cargo_value: number | null; currency: string; premium: number | null;
  effective_date: string | null; expiry_date: string | null; status: string;
  notes: string | null; created_at: string;
};

const COVERAGES = ["marine", "warehouse", "contingent", "stock"] as const;
const P_STATUSES = ["pending", "active", "expired", "cancelled"] as const;

const COV_KEY: Record<string, string> = {
  marine: "covMarine", warehouse: "covWarehouse",
  contingent: "covContingent", stock: "covStock", bond: "covBond",
};

const BOND_REC_LABEL: Record<string, string> = {
  continuous: "Continuous", stb: "Single TX", none_needed: "—",
};

function quoteTone(s: string) {
  if (s === "quoted") return "bg-ok-tint text-ok";
  if (s === "declined") return "bg-card-soft text-faint";
  return "bg-warn-tint text-warn";
}
function policyTone(s: string) {
  if (s === "active") return "bg-ok-tint text-ok";
  if (s === "pending") return "bg-warn-tint text-warn";
  return "bg-card-soft text-faint";
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(0, 10);
}
function fmtMoney(v: number | null, cur: string) {
  if (v == null) return "—";
  return `${cur} ${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function InsuranceBoard({ messages }: { messages: Record<string, string> }) {
  const t = (k: string) => messages[k] ?? k;
  const [tab, setTab] = useState<"quotes" | "policies">("quotes");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [triage, setTriage] = useState<null | { quote: Quote }>(null);
  const [pForm, setPForm] = useState<null | { policy?: Policy; preset?: Partial<Policy> }>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qr, pr] = await Promise.all([
        fetch("/api/app/insurance/quotes"),
        fetch("/api/app/insurance/policies"),
      ]);
      const qd = await qr.json();
      const pd = await pr.json();
      setQuotes(qd.quotes ?? []);
      setPolicies(pd.policies ?? []);
    } catch { /* keep old */ }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const now = Date.now();
    const in30 = now + 30 * 864e5;
    return {
      open: quotes.filter((q) => q.status === "new").length,
      active: policies.filter((p) => p.status === "active").length,
      covered: policies
        .filter((p) => p.status === "active")
        .reduce((a, p) => a + (p.cargo_value ?? 0), 0),
      expiring: policies.filter(
        (p) => p.status === "active" && p.expiry_date && new Date(p.expiry_date).getTime() < in30
      ).length,
    };
  }, [quotes, policies]);

  async function patchQuote(id: string, body: Record<string, unknown>) {
    setErr("");
    const r = await fetch("/api/app/insurance/quotes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    if (!r.ok) { setErr(t("saveFailed")); return false; }
    setTriage(null);
    load();
    return true;
  }

  async function savePolicy(fd: FormData, existing?: Policy) {
    setErr("");
    const payload = {
      id: existing?.id,
      policy_no: fd.get("policy_no"),
      insurer: fd.get("insurer"),
      coverage: fd.get("coverage"),
      cargo_value: fd.get("cargo_value"),
      currency: fd.get("currency"),
      premium: fd.get("premium"),
      effective_date: fd.get("effective_date"),
      expiry_date: fd.get("expiry_date"),
      status: fd.get("status"),
      gttid: fd.get("gttid"),
      notes: fd.get("notes"),
      quote_id: existing?.quote_id ?? (pForm?.preset?.quote_id as string | undefined),
    };
    if (!String(payload.policy_no ?? "").trim()) { setErr(t("policyNoRequired")); return; }
    const r = await fetch("/api/app/insurance/policies", {
      method: existing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(d.error === "dup_policy_no" ? t("dupPolicyNo") : t("saveFailed")); return; }
    setPForm(null);
    load();
  }

  async function delPolicy(p: Policy) {
    if (!window.confirm(t("deleteConfirm"))) return;
    await fetch(`/api/app/insurance/policies?id=${p.id}`, { method: "DELETE" });
    load();
  }

  async function delQuote(q: Quote) {
    if (!window.confirm(t("deleteQuoteConfirm"))) return;
    await fetch(`/api/app/insurance/quotes?id=${q.id}`, { method: "DELETE" });
    load();
  }

  const inputCls =
    "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
  const labelCls = "mb-1 block text-[12px] font-bold text-ink-soft";

  const statCards = [
    { label: t("statNew"), value: String(stats.open) },
    { label: t("statActive"), value: String(stats.active) },
    { label: t("statCovered"), value: `USD ${stats.covered.toLocaleString()}` },
    { label: t("statExpiring"), value: String(stats.expiring) },
  ];

  return (
    <div>
      {/* stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="dash-card px-5 py-4">
            <p className="text-[12px] font-semibold text-faint">{s.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="mt-6 flex gap-2">
        {(["quotes", "policies"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full px-5 py-2 text-[14px] font-bold transition-all ${
              tab === k ? "bg-brand text-white shadow" : "bg-white text-ink-soft ring-1 ring-line hover:text-brand"
            }`}
          >
            {t(k === "quotes" ? "tabQuotes" : "tabPolicies")}
            {k === "quotes" && stats.open > 0 && (
              <span className="ml-2 rounded-full bg-warn px-2 py-0.5 text-[11px] text-white">{stats.open}</span>
            )}
          </button>
        ))}
        {tab === "policies" && (
          <button
            onClick={() => setPForm({})}
            className="ml-auto rounded-full bg-brand px-5 py-2 text-[14px] font-bold text-white shadow hover:bg-brand-deep"
          >
            + {t("addPolicy")}
          </button>
        )}
      </div>

      {err && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-[13px] font-semibold text-red-600">{err}</p>
      )}

      {loading ? (
        <div className="dash-card mt-4 p-10 text-center text-sm text-faint">…</div>
      ) : tab === "quotes" ? (
        /* ---------------- quotes ---------------- */
        <div className="dash-card mt-4 overflow-x-auto">
          {quotes.some((q) => q.coverage === "bond" && q.status === "new") && (
            <div className="m-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900">
              <b>⚠</b> {t("bondHint")}
            </div>
          )}
          {quotes.length === 0 ? (
            <p className="p-10 text-center text-[13.5px] text-faint">{t("emptyQuotes")}</p>
          ) : (
            <table className="w-full min-w-[860px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-[12px] uppercase tracking-wide text-faint">
                  <th className="px-4 py-3 font-semibold">{t("thDate")}</th>
                  <th className="px-4 py-3 font-semibold">{t("thContact")}</th>
                  <th className="px-4 py-3 font-semibold">{t("thCargo")}</th>
                  <th className="px-4 py-3 font-semibold">{t("thRoute")}</th>
                  <th className="px-4 py-3 font-semibold">{t("thMode")}</th>
                  <th className="px-4 py-3 font-semibold">{t("thCoverage")}</th>
                  <th className="px-4 py-3 font-semibold">{t("thStatus")}</th>
                  <th className="px-4 py-3 font-semibold">{t("thActions")}</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <Fragment key={q.id}>
                    <tr className="border-b border-line-soft last:border-0 hover:bg-brand-tint-soft/40">
                      <td className="px-4 py-3 text-faint">{fmtDate(q.created_at)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setExpanded(expanded === q.id ? null : q.id)} className="font-bold text-brand hover:underline">
                          {q.name}
                        </button>
                        <p className="text-[12px] text-faint">{q.company ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">{fmtMoney(q.cargo_value, q.currency)}</td>
                      <td className="px-4 py-3 text-ink-soft">{[q.origin, q.destination].filter(Boolean).join(" → ") || "—"}</td>
                      <td className="px-4 py-3">{t(q.mode === "air" ? "modeAir" : q.mode === "bond" ? "modeBond" : "modeOcean")}</td>
                      <td className="px-4 py-3">
                        {t(COV_KEY[q.coverage] ?? "covMarine")}
                        {q.coverage === "bond" && q.bond_recommendation && q.bond_recommendation !== "none_needed" && (
                          <p className="mt-0.5 text-[11.5px] font-semibold text-faint">
                            {q.bond_recommendation === "continuous" ? t("recContShort") : t("recStbShort")}
                            {q.bond_amount_est != null && ` · ≈ $${Number(q.bond_amount_est).toLocaleString()}`}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${quoteTone(q.status)}`}>
                          {t(q.status === "quoted" ? "stQuoted" : q.status === "declined" ? "stDeclined" : "stNew")}
                        </span>
                        <p className="mt-1 text-[11px] text-faint">{q.company_id ? t("claimedByYou") : t("unclaimed")}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2 text-[12.5px] font-bold">
                          {!q.company_id && (
                            <button onClick={() => patchQuote(q.id, { claim: true })} className="text-brand hover:underline">{t("claim")}</button>
                          )}
                          {q.status === "new" && (
                            <>
                              <button onClick={() => setTriage({ quote: q })} className="text-ok hover:underline">{t("markQuoted")}</button>
                              <button onClick={() => patchQuote(q.id, { status: "declined", claim: !q.company_id || undefined })} className="text-faint hover:underline">{t("markDeclined")}</button>
                            </>
                          )}
                          {q.coverage !== "bond" && (
                          <button
                            onClick={() => setPForm({ preset: {
                              quote_id: q.id, cargo_value: q.cargo_value, currency: q.currency,
                              coverage: q.coverage,
                              notes: `${q.name}${q.company ? ` · ${q.company}` : ""} — ${q.email}`,
                            }})}
                            className="text-vio hover:underline"
                          >{t("toPolicy")}</button>
                          )}
                          <button onClick={() => delQuote(q)} className="text-red-600 hover:underline">{t("delete")}</button>
                        </div>
                      </td>
                    </tr>                    {expanded === q.id && (
                      <tr className="border-b border-line-soft bg-brand-tint-soft/30">
                        <td colSpan={8} className="px-4 py-3 text-[13px] text-ink-soft">
                          <p><b>{q.email}</b>{q.phone ? ` · ${q.phone}` : ""}</p>
                          {q.message && <p className="mt-1">{q.message}</p>}
                          {(q.quoted_premium != null || q.quoted_note) && (
                            <p className="mt-1 text-[12.5px] text-faint">
                              {t("qPremium")}: {fmtMoney(q.quoted_premium, q.currency)}{q.quoted_note ? ` — ${q.quoted_note}` : ""}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* ---------------- policies ---------------- */
        <div className="dash-card mt-4 overflow-x-auto">
          {policies.length === 0 ? (
            <p className="p-10 text-center text-[13.5px] text-faint">{t("emptyPolicies")}</p>
          ) : (
            <table className="w-full min-w-[900px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-[12px] uppercase tracking-wide text-faint">
                  <th className="px-4 py-3 font-semibold">{t("thPolicyNo")}</th>
                  <th className="px-4 py-3 font-semibold">{t("thInsurer")}</th>
                  <th className="px-4 py-3 font-semibold">{t("thCoverage")}</th>
                  <th className="px-4 py-3 font-semibold">{t("thCargo")}</th>
                  <th className="px-4 py-3 font-semibold">{t("thPremium")}</th>
                  <th className="px-4 py-3 font-semibold">{t("thPeriod")}</th>
                  <th className="px-4 py-3 font-semibold">{t("thGttid")}</th>
                  <th className="px-4 py-3 font-semibold">{t("thStatus")}</th>
                  <th className="px-4 py-3 font-semibold">{t("thActions")}</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p.id} className="border-b border-line-soft last:border-0 hover:bg-brand-tint-soft/40">
                    <td className="px-4 py-3 font-bold text-ink">{p.policy_no}</td>
                    <td className="px-4 py-3 text-ink-soft">{p.insurer ?? "—"}</td>
                    <td className="px-4 py-3">{t(COV_KEY[p.coverage] ?? "covMarine")}</td>
                    <td className="px-4 py-3">{fmtMoney(p.cargo_value, p.currency)}</td>
                    <td className="px-4 py-3">{fmtMoney(p.premium, p.currency)}</td>
                    <td className="px-4 py-3 text-ink-soft">{fmtDate(p.effective_date)} → {fmtDate(p.expiry_date)}</td>
                    <td className="px-4 py-3 font-mono text-[12.5px] text-ink-soft">{p.gttid ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${policyTone(p.status)}`}>
                        {t(p.status === "active" ? "pActive" : p.status === "expired" ? "pExpired" : p.status === "cancelled" ? "pCancelled" : "pPending")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 text-[12.5px] font-bold">
                        <button onClick={() => setPForm({ policy: p })} className="text-brand hover:underline">{t("edit")}</button>
                        <button onClick={() => delPolicy(p)} className="text-red-600 hover:underline">{t("delete")}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* triage dialog */}
      {triage && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={() => setTriage(null)}>
          <form
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              patchQuote(triage.quote.id, {
                claim: !triage.quote.company_id || undefined,
                status: "quoted",
                quoted_premium: fd.get("quoted_premium"),
                quoted_note: fd.get("quoted_note"),
              });
            }}
          >
            <p className="text-[16px] font-bold text-ink">{t("qTitle")} — {triage.quote.name}</p>
            <label className="mt-4 block">
              <span className={labelCls}>{t("qPremium")}</span>
              <input name="quoted_premium" type="number" min="0" step="0.01" className={inputCls}
                defaultValue={triage.quote.quoted_premium ?? ""} />
            </label>
            <label className="mt-3 block">
              <span className={labelCls}>{t("qNote")}</span>
              <textarea name="quoted_note" rows={3} maxLength={2000} className={`${inputCls} resize-none`}
                defaultValue={triage.quote.quoted_note ?? ""} />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setTriage(null)} className="rounded-xl px-4 py-2 text-[14px] font-bold text-ink-soft hover:bg-card-soft">{t("cancel")}</button>
              <button type="submit" className="rounded-xl bg-brand px-5 py-2 text-[14px] font-bold text-white hover:bg-brand-deep">{t("save")}</button>
            </div>
          </form>
        </div>
      )}

      {/* policy dialog */}
      {pForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={() => setPForm(null)}>
          <form
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); savePolicy(new FormData(e.currentTarget), pForm.policy); }}
          >
            <p className="text-[16px] font-bold text-ink">
              {pForm.policy ? t("edit") : t("addPolicy")}
            </p>
            {(() => {
              const src = pForm.policy ?? pForm.preset ?? {};
              return (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelCls}>{t("fPolicyNo")} *</span>
                    <input name="policy_no" required maxLength={80} className={inputCls} defaultValue={src.policy_no ?? ""} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>{t("fInsurer")}</span>
                    <input name="insurer" maxLength={160} className={inputCls} defaultValue={src.insurer ?? ""} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>{t("fCoverage")}</span>
                    <select name="coverage" className={inputCls} defaultValue={src.coverage ?? "marine"}>
                      {COVERAGES.map((c) => <option key={c} value={c}>{t(COV_KEY[c])}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelCls}>{t("fStatus")}</span>
                    <select name="status" className={inputCls} defaultValue={(src as Policy).status ?? "pending"}>
                      {P_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {t(s === "active" ? "pActive" : s === "expired" ? "pExpired" : s === "cancelled" ? "pCancelled" : "pPending")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelCls}>{t("fCargoValue")}</span>
                    <input name="cargo_value" type="number" min="0" step="0.01" className={inputCls} defaultValue={src.cargo_value ?? ""} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>{t("fCurrency")}</span>
                    <select name="currency" className={inputCls} defaultValue={src.currency ?? "USD"}>
                      {["USD","CNY","EUR","JPY","KRW","VND","TWD"].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelCls}>{t("fPremium")}</span>
                    <input name="premium" type="number" min="0" step="0.01" className={inputCls} defaultValue={(src as Policy).premium ?? ""} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>{t("fGttid")}</span>
                    <input name="gttid" maxLength={80} className={inputCls} defaultValue={(src as Policy).gttid ?? ""} placeholder="NIEL-2026-000123" />
                  </label>
                  <label className="block">
                    <span className={labelCls}>{t("fEffective")}</span>
                    <input name="effective_date" type="date" className={inputCls} defaultValue={(src as Policy).effective_date ?? ""} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>{t("fExpiry")}</span>
                    <input name="expiry_date" type="date" className={inputCls} defaultValue={(src as Policy).expiry_date ?? ""} />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className={labelCls}>{t("fNotes")}</span>
                    <textarea name="notes" rows={2} maxLength={2000} className={`${inputCls} resize-none`} defaultValue={(src as Policy).notes ?? ""} />
                  </label>
                </div>
              );
            })()}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setPForm(null)} className="rounded-xl px-4 py-2 text-[14px] font-bold text-ink-soft hover:bg-card-soft">{t("cancel")}</button>
              <button type="submit" className="rounded-xl bg-brand px-5 py-2 text-[14px] font-bold text-white hover:bg-brand-deep">{t("save")}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
