"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";

type Doc = {
  id: string;
  file_name: string;
  file_path: string;
  file_size?: number | null;
  created_at: string;
};

const MAX_MB = 20;

export default function DocPanel({
  companyId,
  shipmentId,
  docs,
}: {
  companyId: string;
  shipmentId: string;
  docs: Doc[];
}) {
  const t = useTranslations("app");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(false);
    if (file.size > MAX_MB * 1024 * 1024) {
      setErr(true);
      return;
    }
    setBusy(true);
    try {
      const sb = createClient();
      const path = `${companyId}/${shipmentId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await sb.storage
        .from("shipment-docs")
        .upload(path, file);
      if (upErr) throw upErr;
      const { error: dbErr } = await sb.from("documents").insert({
        company_id: companyId,
        shipment_id: shipmentId,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
      });
      if (dbErr) throw dbErr;
      router.refresh();
    } catch {
      setErr(true);
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function download(doc: Doc) {
    const sb = createClient();
    const { data, error } = await sb.storage
      .from("shipment-docs")
      .createSignedUrl(doc.file_path, 300);
    if (!error && data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function remove(doc: Doc) {
    if (!confirm(doc.file_name)) return;
    const sb = createClient();
    await sb.storage.from("shipment-docs").remove([doc.file_path]);
    await sb.from("documents").delete().eq("id", doc.id);
    router.refresh();
  }

  return (
    <div className="mt-4">
      <input ref={fileRef} type="file" className="hidden" onChange={upload}
        accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.doc,.docx" />
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-deep disabled:opacity-60"
      >
        {busy ? t("uploading") : t("upload")}
      </button>
      <p className="mt-2 text-xs text-ink-soft/70">{t("uploadHint")}</p>
      {err && <p className="mt-2 text-sm text-red-600">{t("error") ?? "Upload failed."}</p>}

      <ul className="mt-4 divide-y divide-line-soft">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{d.file_name}</p>
              <p className="text-xs text-ink-soft/70">
                {t("uploadedBy")} {new Date(d.created_at).toLocaleString()}
                {d.file_size ? ` · ${(d.file_size / 1024).toFixed(0)} KB` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => download(d)}
                className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-brand hover:border-brand">
                {t("download")}
              </button>
              <button type="button" onClick={() => remove(d)}
                className="rounded-full border border-line px-4 py-1.5 text-xs font-semibold text-ink-soft hover:border-red-400 hover:text-red-600">
                {t("delete")}
              </button>
            </div>
          </li>
        ))}
        {docs.length === 0 && (
          <li className="py-4 text-sm text-ink-soft/60">—</li>
        )}
      </ul>
    </div>
  );
}
