import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import Reveal from "@/components/Reveal";
import ContainerTracker from "@/components/ContainerTracker";
import { SectionHead } from "@/components/Section";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const KEYS = [
  "typeContainer", "typeBol", "typeBooking", "fNumberPh", "submit", "searching",
  "processingNote", "errProcessingTimeout",
  "errInvalid", "errNotFound", "errNotConfigured", "errRestricted", "errRate", "errGeneric",
  "cardLine", "cardVessel", "cardMbl", "cardRoute", "cardEta", "cardArrived",
  "relCustoms", "relCarrier", "stReleased", "stHold", "stUnknown",
  "pickupReady", "pickupNotReady", "pickupUnknown",
  "holdsOther", "holdPending", "termNoData",
  "lfd", "lfdNone", "lfdPassed", "lfdToday", "daysWord", "feesTitle",
  "timelineTitle",
  "evDischarge", "evGateOut", "evGateIn", "evEmptyOut", "evEmptyReturn",
  "evArrived", "evDeparted", "evLoaded", "evCustomsRelease", "evCustomsHold", "evRail",
  "hold_customs", "hold_usda", "hold_vacis", "hold_freight", "hold_line", "hold_tmf", "hold_other",
  "fee_demurrage", "fee_extended_dwell_time", "fee_exam", "fee_total", "fee_other",
  "sourceNote", "sourceLabel", "updatedAt", "ctaWorkspace", "ctaQuote",
] as const;

export default async function TrackPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "tracking" });

  const labels: Record<string, string> = {};
  for (const k of KEYS) labels[k] = t(k);

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="dotgrid absolute inset-0 opacity-60" />
        <div className="absolute -top-32 left-1/2 h-80 w-[52rem] -translate-x-1/2 rounded-full bg-brand-tint blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 pt-16 pb-4 text-center lg:px-8 lg:pt-24">
          <SectionHead
            eyebrow={t("eyebrow")}
            title={t("title")}
            sub={t("sub")}
            image="/images/heroes/import.jpg"
          />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-20 lg:px-8 lg:pb-24">
        <Reveal>
          <ContainerTracker t={labels} locale={locale} />
        </Reveal>
      </section>
    </>
  );
}
