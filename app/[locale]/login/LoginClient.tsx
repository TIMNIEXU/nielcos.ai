"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const inputCls =
  "h-12 w-full rounded-xl border border-line bg-white px-4 text-[15px] text-ink placeholder:text-ink-soft/40 focus:border-brand focus:outline-none";

export function AuthShell({
  title,
  sub,
  children,
  switchText,
  switchLink,
  switchLabel,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
  switchText: string;
  switchLink: string;
  switchLabel: string;
}) {
  const locale = useLocale();
  return (
    <section className="bg-brand-tint-soft">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-16">
        <Link href={`/${locale}`} className="mb-8 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-[13px] font-bold text-white">
            N
          </span>
          <span className="text-[17px] font-bold tracking-tight text-ink">
            NIEL
            <span className="ml-1.5 rounded-md bg-brand-tint px-1.5 py-0.5 align-middle text-[10px] font-bold tracking-widest text-brand">
              COS
            </span>
          </span>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 text-ink-soft">{sub}</p>
        <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-[0_12px_40px_-20px_rgba(29,78,216,0.35)]">
          {children}
        </div>
        <p className="mt-5 text-center text-sm text-ink-soft">
          {switchText}{" "}
          <Link href={switchLink} className="font-semibold text-brand hover:underline">
            {switchLabel}
          </Link>
        </p>
      </div>
    </section>
  );
}

export function configured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export default function LoginClient() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const sb = createClient();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setError(true);
      else router.push(`/app`);
    } catch {
      setError(true);
    }
    setBusy(false);
  }

  return (
    <AuthShell
      title={t("loginTitle")}
      sub={t("loginSub")}
      switchText={t("noAccount")}
      switchLink={`/${locale}/signup`}
      switchLabel={t("createAccount")}
    >
      {!configured() ? (
        <p className="text-ink-soft">{t("notConfigured")}</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{t("email")}</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{t("password")}</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          </label>
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{t("error")}</p>}
          <button type="submit" disabled={busy}
            className="h-12 w-full rounded-xl bg-brand text-[15px] font-semibold text-white transition-colors hover:bg-brand-deep disabled:opacity-60">
            {busy ? t("signingIn") : t("signIn")}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
