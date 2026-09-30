/* /[locale]/bond — Bond Intelligence: 3-question wizard that recommends a
   customs-bond type, estimates the amount (CBP 10% rule, $50k minimum),
   shows real $50k-tier pricing from our surety partner, and captures the
   lead into the insurance triage workbench. No auto-approval, no instant
   quote, no CBP filing claims anywhere. */

import { getTranslations } from "next-intl/server";
import Link from "next/link";
import BondWizard from "@/components/BondWizard";

const DOCUSIGN_URL =
  "https://apps.docusign.com/webforms/us/568609ffad07efa4d840df45e8bef8a3";

const BOND_KEYS = [
  "eyebrow","title","sub","trust1","trust2","trust3",
  "how1t","how1d","how2t","how2d","how3t","how3d",
  "step1t","fImportValue","fEntries","entriesUnknown",
  "step2t","fDuties","estimateToggle","fAvgRate","estimateNote",
  "step3t","hasNone","hasStb","hasCont",
  "next","back","restart","stepOf",
  "resEyebrow","recContinuous","recContinuousD","recStb","recStbD","recNone","recNoneD",
  "whyTitle","whyCont1","whyCont2","whyCont3","whyStb1","whyStb2",
  "amtTitle","amtNote","perShipment","contPriceNote",
  "finTitle","finBody","stbPriceNote",
  "saveTitle","saveSub","sName","sCompany","sEmail","sPhone",
  "submit","sending","done","fail",
  "attnTitle","docusignTitle","docusignCta","docusignNote","disclaimer",
  "faqT","faq1q","faq1a","faq2q","faq2a","faq3q","faq3a","faq4q","faq4a",
];

export default async function BondPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "bond" });
  const dict: Record<string, string> = {};
  for (const k of BOND_KEYS) dict[k] = t(k);

  const faqs = [
    [t("faq1q"), t("faq1a")],
    [t("faq2q"), t("faq2a")],
    [t("faq3q"), t("faq3a")],
    [t("faq4q"), t("faq4a")],
  ];

  return (
    <main className="bg-white">
      {/* hero */}
      <section className="border-b border-line bg-gradient-to-b from-brand-tint-soft/70 to-white">
        <div className="mx-auto max-w-4xl px-6 pb-10 pt-14 text-center sm:pt-20">
          <p className="text-[12.5px] font-black uppercase tracking-[0.2em] text-brand">
            {t("eyebrow")}
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-ink sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] text-ink-soft">{t("sub")}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            {[t("trust1"), t("trust2"), t("trust3")].map((x) => (
              <span
                key={x}
                className="rounded-full border border-line bg-white px-4 py-1.5 text-[13px] font-bold text-ink-soft shadow-sm"
              >
                ✓ {x}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* wizard */}
      <section className="mx-auto max-w-4xl px-6 py-10 sm:py-14">
        <BondWizard messages={dict} locale={locale} docusignUrl={DOCUSIGN_URL} />

        {/* how it works */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            [t("how1t"), t("how1d")],
            [t("how2t"), t("how2d")],
            [t("how3t"), t("how3d")],
          ].map(([tt, dd], i) => (
            <div key={tt} className="rounded-2xl border border-line bg-white p-5">
              <p className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-[15px] font-black text-white">
                {i + 1}
              </p>
              <p className="mt-3 font-black text-ink">{tt}</p>
              <p className="mt-1 text-[13.5px] text-ink-soft">{dd}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-line bg-brand-tint-soft/40">
        <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
          <h2 className="text-center text-2xl font-black text-ink">{t("faqT")}</h2>
          <div className="mt-8 space-y-4">
            {faqs.map(([q, a]) => (
              <div key={q} className="rounded-2xl border border-line bg-white p-5 sm:p-6">
                <p className="font-black text-ink">{q}</p>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{a}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href={DOCUSIGN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-xl bg-ink px-8 py-3.5 text-[15px] font-black text-white shadow-lg transition hover:brightness-125"
            >
              {t("docusignCta")} ↗
            </Link>
            <p className="mx-auto mt-3 max-w-lg text-[12.5px] text-faint">{t("docusignNote")}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
