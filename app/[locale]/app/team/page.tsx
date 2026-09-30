import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { intlLocale } from "@/lib/locale";

type Props = { params: Promise<{ locale: string }> };

/* Team is intentionally read-only:
   - profiles RLS (supabase/saas.sql) grants SELECT on own row only
     ("read own profile" using id = auth.uid()); there is no UPDATE or
     DELETE policy, so role changes and member removal would 403.
   - There is no invite mechanism: handle_new_user() creates a fresh
     company + owner profile on every signup. */

export default async function TeamPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("team");
  const ta = await getTranslations("app");

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16 text-center text-sm text-ink-soft">
        Supabase 未配置 / Supabase not configured.
      </div>
    );
  }
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect({ href: "/login", locale });
  const uid = user!.id;

  const { data: companyId } = await sb.rpc("own_company_id");
  const { data: company } = companyId
    ? await sb.from("companies").select("name").eq("id", companyId).single()
    : { data: null };
  const { data: profile } = await sb
    .from("profiles")
    .select("role, created_at")
    .eq("id", uid)
    .single();
  // RLS: only the signed-in user's own row is visible.
  const { data: members } = companyId
    ? await sb
        .from("profiles")
        .select("id, role, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: true })
    : { data: [] };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(intlLocale(locale), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  const roleLabel = (role: string) =>
    role === "owner" ? t("roleOwner") : t("roleMember");

  return (
    <section className="min-h-[75vh] bg-brand-tint-soft">
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <Link
          href={`/${locale}/app`}
          className="text-[13.5px] font-semibold text-brand hover:underline"
        >
          ← {ta("back")}
        </Link>
        <p className="mt-4 text-xs font-bold tracking-[0.22em] text-brand uppercase">
          {ta("workspace")}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-2 text-[14.5px] text-muted">{t("sub")}</p>

        {/* Company card */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="text-[12px] font-bold tracking-wider text-faint uppercase">
              {t("companyLabel")}
            </p>
            <p className="mt-2 text-[17px] font-bold text-ink">
              {company?.name ?? "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="text-[12px] font-bold tracking-wider text-faint uppercase">
              {t("yourRole")}
            </p>
            <p className="mt-2 text-[17px] font-bold text-ink">
              {profile ? roleLabel(profile.role) : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="text-[12px] font-bold tracking-wider text-faint uppercase">
              {t("memberSince")}
            </p>
            <p className="mt-2 text-[17px] font-bold text-ink">
              {profile?.created_at ? fmtDate(profile.created_at) : "—"}
            </p>
          </div>
        </div>

        {/* Members (read-only) */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-ink">{t("membersTitle")}</h2>
          <p className="mt-1 text-[13.5px] text-muted">{t("membersSub")}</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-line bg-brand-tint-soft/60 text-[12px] uppercase tracking-wider text-faint">
                  <th className="px-5 py-3 font-bold">{t("thMember")}</th>
                  <th className="px-5 py-3 font-bold">{t("thRole")}</th>
                  <th className="px-5 py-3 font-bold">{t("thJoined")}</th>
                </tr>
              </thead>
              <tbody>
                {(members ?? []).map((m) => (
                  <tr key={m.id} className="border-b border-line-soft last:border-0">
                    <td className="px-5 py-3.5 font-semibold text-ink">
                      {m.id === uid ? (
                        <span className="inline-flex items-center gap-2">
                          {t("you")}
                          <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-bold text-brand">
                            {t("you")}
                          </span>
                        </span>
                      ) : (
                        <span className="font-mono text-[12.5px] text-muted">
                          {m.id.slice(0, 8)}…
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-[12.5px] font-bold ${
                          m.role === "owner"
                            ? "bg-brand-tint text-brand"
                            : "bg-line-soft text-ink-soft"
                        }`}
                      >
                        {roleLabel(m.role)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-ink-soft">
                      {m.created_at ? fmtDate(m.created_at) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[13px] text-faint">{t("membersNote")}</p>
          <p className="mt-1 text-[13px] text-faint">{t("rolesNote")}</p>
        </div>

        {/* Invite */}
        <div className="mt-10 rounded-2xl border border-line bg-white p-6 sm:p-8">
          <h2 className="text-xl font-bold text-ink">{t("inviteTitle")}</h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">{t("inviteP1")}</p>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{t("inviteP2")}</p>
          <Link
            href={`/${locale}/contact`}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-[14px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(29,78,216,0.8)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep"
          >
            {t("inviteCta")} →
          </Link>
        </div>
      </div>
    </section>
  );
}
