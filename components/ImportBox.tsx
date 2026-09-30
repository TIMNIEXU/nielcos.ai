"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

/* GRI-001 V1 — Universal Import Box (shell).
   Big central AI box on the homepage: free-text import description +
   document upload. V1 routes into the landed-cost estimator via ?q=
   (text is used as the estimator's keyword search; uploaded docs are
   extracted with /api/public/extract first). V2 upgrades this component
   to call /api/ai/import-box for a full Import Plan. */

export default function ImportBox({ locale }: { locale: string }) {
  const t = useTranslations("importbox");
  const router = useRouter();
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const chips = [0, 1, 2].map((i) => t(`chips.${i}`));

  const go = (q: string) => {
    const s = q.trim();
    if (!s) return;
    router.push(`/${locale}/landed-cost?q=${encodeURIComponent(s)}`);
  };

  const onUpload = async (f: File | undefined) => {
    if (!f) return;
    setUploading(true);
    setErr("");
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch("/api/public/extract", { method: "POST", body: form });
      const data = await res.json();
      if (data.ok && (data.productName || data.hts)) {
        go(String(data.productName || data.hts));
        return;
      }
      setErr(t("uploadFail"));
    } catch {
      setErr(t("uploadFail"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-3xl border border-line bg-white p-6 shadow-[0_24px_60px_-24px_rgba(29,78,216,0.35)] sm:p-8">
        <label
          htmlFor="importbox-input"
          className="block text-center text-[19px] font-bold tracking-tight text-ink sm:text-[22px]"
        >
          {t("title")}
        </label>
        <p className="mx-auto mt-2 max-w-xl text-center text-[13.5px] leading-relaxed text-muted">
          {t("sub")}
        </p>
        <textarea
          id="importbox-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("placeholder")}
          rows={2}
          className="mt-5 w-full resize-none rounded-2xl border border-line bg-canvas/60 px-5 py-4 text-[15px] text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              go(text);
            }
          }}
        />
        <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => go(text)}
            disabled={!text.trim() || uploading}
            className="w-full rounded-full bg-brand px-8 py-3 text-[15px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(29,78,216,0.8)] transition-all hover:-translate-y-0.5 hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 sm:w-auto"
          >
            {t("button")} →
          </button>
          <span className="text-[13px] font-medium text-faint">{t("uploadLabel")}</span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-[14px] font-semibold text-ink-soft shadow-card transition-all hover:-translate-y-0.5 hover:border-brand disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" />
            </svg>
            {uploading ? t("uploading") : t("fileTypes")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.docx,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => onUpload(e.target.files?.[0])}
          />
        </div>
        {err && (
          <p className="mt-3 text-center text-[13px] font-semibold text-risk">{err}</p>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => go(c)}
              className="rounded-full bg-brand-tint/60 px-4 py-1.5 text-[12.5px] font-semibold text-brand transition-colors hover:bg-brand-tint"
            >
              {c}
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-[12px] font-semibold text-faint">{t("hint")}</p>
      </div>
    </div>
  );
}
