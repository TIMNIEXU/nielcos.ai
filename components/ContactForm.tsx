"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function ContactForm() {
  const t = useTranslations("contact.form");
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const subject = encodeURIComponent(
      `NIEL COS demo request — ${fd.get("name")} (${fd.get("company")})`
    );
    const body = encodeURIComponent(
      `Name: ${fd.get("name")}\nCompany: ${fd.get("company")}\nEmail: ${fd.get("email")}\n\n${fd.get("message")}`
    );
    window.location.href = `mailto:sales@nielcos.ai?subject=${subject}&body=${body}`;
    setSent(true);
  }

  const inputCls =
    "w-full rounded-xl border border-line bg-white px-4 py-3 text-[14.5px] text-ink placeholder:text-faint outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/20";

  return (
    <form onSubmit={onSubmit} className="dash-card space-y-4 p-7 sm:p-8">
      <p className="text-xl font-bold tracking-tight text-ink">{t("title")}</p>
      <p className="text-[13.5px] text-muted">{t("sub")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-bold text-ink-soft">{t("name")}</span>
          <input name="name" required className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-bold text-ink-soft">{t("company")}</span>
          <input name="company" required className={inputCls} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[12.5px] font-bold text-ink-soft">{t("email")}</span>
        <input name="email" type="email" required className={inputCls} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[12.5px] font-bold text-ink-soft">{t("message")}</span>
        <textarea name="message" rows={4} required className={`${inputCls} resize-none`} />
      </label>
      <button
        type="submit"
        className="w-full rounded-xl bg-brand py-3.5 text-[15px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(29,78,216,0.8)] transition-all hover:-translate-y-px hover:bg-brand-deep"
      >
        {t("submit")}
      </button>
      {sent && (
        <p className="rounded-lg bg-ok-tint px-4 py-2.5 text-center text-[13px] font-semibold text-ok">
          ✓
        </p>
      )}
      <p className="text-center text-[12.5px] text-faint">{t("note")}</p>
    </form>
  );
}
