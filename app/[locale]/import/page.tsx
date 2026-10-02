import { getTranslations } from "next-intl/server";
import ImportFunnel from "@/components/ImportFunnel";
import Reveal from "@/components/Reveal";

/* GRI-001 Golden Path v1 — the importer entry.
   Describe/Upload -> AI Import Plan -> Duties -> Services -> Quote -> Book.
   Free. Duty figures are real; service prices come from humans, never invented. */

export const dynamic = "force-static";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "golden" });
  return { title: `${t("title")} — NIEL COS`, description: t("sub") };
}

export default async function ImportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "golden" });
  return (
    <main className="bg-page">
      <section className="mx-auto max-w-5xl px-5 pt-16 pb-8 sm:pt-20">
        <Reveal>
          <div className="text-center">
            <p className="eyebrow justify-center text-brand">{t("eyebrow")}</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">{t("title")}</h1>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{t("sub")}</p>
          </div>
        </Reveal>
      </section>
      <section className="mx-auto max-w-5xl px-5 pb-20">
        <ImportFunnel locale={locale} />
      </section>
    </main>
  );
}
