import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { getSsoClient, redirectAllowed } from "@/lib/sso";

/* /[locale]/sso/consent — One NIEL Account handshake screen.
   The user is already signed in on nielcos.ai; one click continues them
   to the brand site. Plain HTML form POST (no JS needed). */

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ client_id?: string; redirect_uri?: string; state?: string }>;
};

export default async function SsoConsentPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sso");
  const sp = await searchParams;
  const clientId = (sp.client_id || "").slice(0, 64);
  const redirectUri = (sp.redirect_uri || "").slice(0, 500);
  const state = (sp.state || "").slice(0, 128);

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    const back = `/api/sso/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}${state ? `&state=${encodeURIComponent(state)}` : ""}&locale=${locale}`;
    redirect({ href: `/login?next=${encodeURIComponent(back)}`, locale });
    return null; // unreachable at runtime (redirect throws); keeps TS narrowing happy
  }
  const client = clientId ? await getSsoClient(sb, clientId) : null;
  if (!client || !redirectAllowed(client, redirectUri)) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-xl font-bold">{t("badClient")}</h1>
      </main>
    );
  }

  const email = user.email || "";
  const displayName =
    (user.user_metadata?.name as string) || (user.user_metadata?.full_name as string) || email;

  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <div className="rounded-2xl border border-line bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-faint">One NIEL Account</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">{t("consentTitle", { name: client.name })}</h1>
        <p className="mt-2 text-sm text-ink-soft">{t("consentSub")}</p>
        <div className="mt-6 rounded-xl bg-card-soft px-4 py-3">
          <p className="text-xs text-ink-faint">{t("consentAs")}</p>
          <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
          {displayName !== email && <p className="truncate text-xs text-ink-soft">{email}</p>}
        </div>
        <form method="POST" action="/api/sso/ticket" className="mt-6 flex gap-3">
          <input type="hidden" name="client_id" value={client.id} />
          <input type="hidden" name="redirect_uri" value={redirectUri} />
          {state && <input type="hidden" name="state" value={state} />}
          <button
            type="submit"
            className="flex-1 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-deep"
          >
            {t("consentAllow")}
          </button>
          <a
            href={redirectUri.startsWith("https://") ? new URL(redirectUri).origin : "/"}
            className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-ink-soft hover:bg-card-soft"
          >
            {t("consentCancel")}
          </a>
        </form>
        <p className="mt-4 text-xs text-ink-faint">{t("consentSecure", { name: client.name })}</p>
      </div>
    </main>
  );
}
