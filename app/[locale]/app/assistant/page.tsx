import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AssistantBoard from "./AssistantBoard";
import { isZhLocale } from "@/lib/locale";

export default async function AssistantPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/app/assistant`);

  // Pre-translate without params (plain string lookup, no ICU placeholders).
  // Namespace "assistant" at message root, same convention as other modules.
  const t = await getTranslations({ locale, namespace: "assistant" });
  const keys = [
    "title", "sub",
    "newChat", "inputPh", "send", "sources", "thinking",
    "emptyTitle", "emptySub",
    "sugDuty", "sugTrack", "sugReg", "sugProd",
    "deleteThread", "confirmDelete", "noThreads", "sendFailed",
  ];
  const dict: Record<string, string> = {};
  for (const k of keys) dict[k] = t(k);

  return (
    <main className="min-h-screen bg-page pb-16 pt-8">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link href={`/${locale}/app`}
            className="rounded-full border border-line bg-white px-4 py-1.5 text-sm font-bold text-ink-soft transition-colors hover:border-brand hover:text-brand-deep">
            ← {isZhLocale(locale) ? "工作台" : "Workspace"}
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-ink md:text-3xl">{dict.title}</h1>
            <p className="mt-1 text-sm text-ink-soft">{dict.sub}</p>
          </div>
        </div>
        <AssistantBoard messages={dict} locale={locale} />
      </div>
    </main>
  );
}
