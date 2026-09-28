"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  locale: string;
  shipments: { id: string; gttid: string | null; container_number: string }[];
  labels: Record<string, string>;
};

export default function NewEntryForm({ locale, shipments, labels: t }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [entryNo, setEntryNo] = useState("");
  const [importer, setImporter] = useState("");
  const [shipmentId, setShipmentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setSaving(true);
    setErr("");
    const res = await fetch("/api/app/customs/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entry_no: entryNo,
        importer_name: importer,
        shipment_id: shipmentId || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setErr(data.error === "duplicate_entry_no" ? "Entry no. already exists" : (data.detail || data.error));
      return;
    }
    router.push(`/${locale}/app/customs/${data.id}`);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-deep"
      >
        + {t.newEntry}
      </button>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand";

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold tracking-wider text-ink-soft uppercase">
            {t.entryNo}
          </label>
          <input value={entryNo} onChange={(e) => setEntryNo(e.target.value)} className={inputCls} />
          <p className="mt-1 text-xs text-ink-soft">{t.entryNoHint}</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold tracking-wider text-ink-soft uppercase">
            {t.importer}
          </label>
          <input value={importer} onChange={(e) => setImporter(e.target.value)} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold tracking-wider text-ink-soft uppercase">
            {t.linkedShipment}
          </label>
          <select value={shipmentId} onChange={(e) => setShipmentId(e.target.value)} className={inputCls}>
            <option value="">{t.noShipment}</option>
            {shipments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.gttid ?? s.container_number} — {s.container_number}
              </option>
            ))}
          </select>
        </div>
      </div>
      {err && <p className="mt-3 text-sm font-medium text-red-600">{err}</p>}
      <div className="mt-4 flex gap-3">
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {t.newEntry}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-full border border-line px-5 py-2.5 text-sm font-bold text-ink-soft"
        >
          {t.cancel}
        </button>
      </div>
    </div>
  );
}
