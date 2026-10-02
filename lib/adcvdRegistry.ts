import { createClient } from "@/lib/supabase/server";
import type { RegistryEvidence } from "@/lib/adcvd";

/* Fetch the AD/CVD case registry (Layer 2 evidence). Returns [] when the
   v14 table has not been created yet, so deploys never 500 in the window
   before the SQL is run. */
const COLS =
  "case_number, case_type, country, product_name, scope_summary, exclusions, hts_references, status, commerce_source_url, federal_register_documents, last_verified_at, verification_status";

export async function fetchRegistryEvidence(limit = 300): Promise<RegistryEvidence[]> {
  const sb = await createClient();
  const { data, error } = await sb.from("ad_cvd_cases").select(COLS).limit(limit);
  if (error) return [];
  return (data ?? []) as RegistryEvidence[];
}
