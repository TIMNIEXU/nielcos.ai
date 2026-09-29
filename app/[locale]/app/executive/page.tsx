import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ExecutiveBoard from "./ExecutiveBoard";

export default async function ExecutivePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/app/executive`);

  // Pre-translate without params (plain string lookup, no ICU placeholders).
  // Namespace "executive" at message root, same convention as other modules.
  const t = await getTranslations({ locale, namespace: "executive" });
  const keys = [
    "title", "sub",
    "kpiDuty", "kpiDutyCount", "kpiClearance", "kpiClearanceCount",
    "kpiSuppliers", "kpiSuppliersCount",
    "secDuty", "secDutyDesc", "secClearance", "secClearanceDesc",
    "secSuppliers", "secSuppliersDesc",
    "emptyDuty", "emptyClearance", "emptySuppliers", "emptyAll",
    "analyzeCta",
    "docCommercialInvoice", "docPackingList", "docBL",
    "docBusinessLicense", "docIso", "docBank", "docTax",
    "docCompliance", "docInsurance",
    "stMissing", "stPending", "etaLabel", "missingLabel",
    "loadFailed", "retry",
  ];
  const dict: Record<string, string> = {};
  for (const k of keys) dict[k] = t(k);

  return (
    <main className="min-h-screen bg-page pb-16 pt-8">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link href={`/${locale}/app`}
            className="rounded-full border border-line bg-white px-4 py-1.5 text-sm font-bold text-ink-soft transition-colors hover:border-brand hover:text-brand-deep">
            ← {locale === "zh-CN" ? "工作台" : "Workspace"}
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-ink md:text-3xl">{dict.title}</h1>
            <p className="mt-1 text-sm text-ink-soft">{dict.sub}</p>
          </div>
          <img
            src="/images/modules/executive.png"
            alt={dict.title}
            className="hidden h-20 w-32 rounded-2xl object-cover ring-1 ring-line md:block"
          />
        </div>
        <ExecutiveBoard messages={dict} locale={locale} />
      </div>
    </main>
  );
}
