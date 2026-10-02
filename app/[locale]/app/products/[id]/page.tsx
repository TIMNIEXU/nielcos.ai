import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PassportView from "./PassportView";

type Props = { params: Promise<{ locale: string; id: string }> };

// NOTE: no ICU placeholders in these messages — they are pre-translated
// with t(k) and no params. Dynamic banner text uses %NAME% + client replace.
const KEYS = [
  "title","sub","loading","loadFailed",
  "profileTitle","fHts","fOrigin","fMaterial","fNotes",
  "bannerTitle","bannerBody","bannerNote","basisYear","basisPartial",
  "statsImports","statsValue","statsAvgRate","statsLast",
  "chartTitle","chartEmpty","eventsTitle",
  "thDate","thHts","thRate","thValue",
  "emptyTitle","emptyBody","goCustoms",
];

export default async function ProductPassportPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "passport" });
  const ta = await getTranslations({ locale, namespace: "app" });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    redirect({ href: "/login", locale });
  }
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  const dict: Record<string, string> = {};
  for (const k of KEYS) dict[k] = t(k);

  return (
    <section className="min-h-[75vh] bg-brand-tint-soft">
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/app/products`}
            className="text-sm font-semibold text-brand hover:underline"
          >
            ← {ta("back")}
          </Link>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-ink-soft">{t("sub")}</p>
        <div className="mt-6">
          <PassportView productId={id} locale={locale} messages={dict} />
        </div>
      </div>
    </section>
  );
}
