import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import IntegrationsBoard from "./IntegrationsBoard";

type Props = { params: Promise<{ locale: string }> };

const KEYS = [
  "title","sub","tabKeys","tabWebhooks","tabEdi","tabConnectors","tabAudit",
  "statKeys","statWebhooks","statEdi","statRequests",
  "keysTitle","keysHint","newKey","keyNameLabel","keyNamePh","scopeRead","scopeWrite",
  "create","cancel","keyOnceTitle","keyOnceWarn","copy","copied","revoke","revokeConfirm",
  "thName","thPrefix","thScopes","thCreated","thLastUsed","thStatus","thActions",
  "statusActive","statusRevoked","emptyKeys",
  "apiDocsTitle","apiDocsSub","apiAuthNote","epShipments","epShipmentOne","epDocuments",
  "whTitle","whHint","newEndpoint","whUrlLabel","whUrlPh","whEventsLabel","whSecretLabel",
  "whSecretHint","active","test","testOk","testFail","deliveries","emptyWh",
  "delete","deleteConfirm","save","delThTime","delThEvent","delThStatus","delThLatency",
  "emptyDeliveries","statusOk","statusFail",
  "ev_document_parsed","ev_drayage_move_created","ev_drayage_move_status_changed","ev_webhook_test",
  "ediTitle","ediHint","ediUploadTitle","ediFileLabel","ediPasteLabel","ediPastePh","ediSubmit",
  "ediKind850","ediKind856","ediKind810","ediKindUnknown",
  "ediThFile","ediThKind","ediThSummary","ediThTime","emptyEdi","ediView","ediClose",
  "ediHeader","ediLines","ediTotals","ediRaw","ediWarnings","summaryLines",
  "conTitle","conHint","conAvailable","conRequest","conRequested","conNoteLabel","conNotePh",
  "conSend","conSent","conOpenKeys","conOpenWebhooks","conOpenEdi",
  "cn_rest-api","cd_rest-api","cn_webhooks","cd_webhooks","cn_edi","cd_edi","cn_excel-import","cd_excel-import",
  "cn_netsuite","cd_netsuite","cn_sap","cd_sap","cn_quickbooks","cd_quickbooks",
  "cn_shopify","cd_shopify",
  "auditTitle","auditHint","auditThTime","auditThActor","auditThAction","auditThDetail","emptyAudit",
  "audit_api_key_created","audit_api_key_revoked","audit_webhook_created","audit_webhook_updated",
  "audit_webhook_deleted","audit_webhook_tested","audit_edi_received","audit_connector_requested",
];

const APP_KEYS = ["back"];

export default async function IntegrationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("integrations");
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

  const { data: companyId } = await sb.rpc("own_company_id");
  if (!companyId) redirect({ href: "/login", locale });

  const dict: Record<string, string> = {};
  for (const k of KEYS) dict[k] = t(k);
  const adict: Record<string, string> = {};
  for (const k of APP_KEYS) adict[k] = ta(k);

  return (
    <section className="min-h-[75vh] bg-brand-tint-soft">
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <Link href={`/${locale}/app`} className="text-sm font-semibold text-brand hover:underline">
          ← {ta("back")}
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-ink-soft">{t("sub")}</p>
        <div className="mt-6">
          <IntegrationsBoard messages={dict} appMessages={adict} locale={locale} />
        </div>
      </div>
    </section>
  );
}
