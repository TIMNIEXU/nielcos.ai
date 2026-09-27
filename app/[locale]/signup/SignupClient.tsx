"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AuthShell, configured } from "../login/LoginClient";

const inputCls =
  "h-12 w-full rounded-xl border border-line bg-white px-4 text-[15px] text-ink placeholder:text-ink-soft/40 focus:border-brand focus:outline-none";

export default function SignupClient() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [done, setDone] = useState<"signed-in" | "confirm" | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const sb = createClient();
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: name, company_name: company } },
      });
      if (error) {
        setError(true);
      } else if (data.session) {
        window.location.href = `/${locale}/app`;
      } else {
        setDone("confirm");
      }
    } catch {
      setError(true);
    }
    setBusy(false);
  }

  return (
    <AuthShell
      title={t("signupTitle")}
      sub={t("signupSub")}
      switchText={t("hasAccount")}
      switchLink={`/${locale}/login`}
      switchLabel={t("signIn")}
    >
      {!configured() ? (
        <p className="text-ink-soft">{t("notConfigured")}</p>
      ) : done === "confirm" ? (
        <div className="py-4 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-tint text-2xl text-brand">✓</span>
          <p className="mt-4 text-ink-soft">{t("confirmEmail")}</p>
          <Link href={`/${locale}/login`} className="mt-4 inline-block h-11 rounded-xl bg-brand px-8 leading-[44px] text-[15px] font-semibold text-white">
            {t("signIn")}
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{t("name")}</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{t("company")}</span>
            <input required value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{t("email")}</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{t("password")}</span>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            <span className="mt-1 block text-xs text-ink-soft/70">{t("passwordHint")}</span>
          </label>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{t("error")}</p>}
          <button type="submit" disabled={busy}
            className="h-12 w-full rounded-xl bg-brand text-[15px] font-semibold text-white transition-colors hover:bg-brand-deep disabled:opacity-60">
            {busy ? t("creating") : t("createAccount")}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
