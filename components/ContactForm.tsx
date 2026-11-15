"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

/* Demo request form. Submits server-side to /api/public/demo-request,
   which stores the lead in Supabase and emails the operator. If the
   server submission fails (table/key not ready yet, or offline), falls
   back to the visitor's own mail client (mailto sales@nielcos.ai) so
   the request still has a chance to arrive. */
export default function ContactForm({ locale = "en" }: { locale?: string }) {
  const t = useTranslations("contact.form");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "fallback"
  >("idle");
  // Time trap: the API rejects submissions faster than 3s after render.
  const startedAtRef = useRef(Date.now());

  function openMailto(fd: FormData) {
    const subject = encodeURIComponent(
      `NIEL COS demo request — ${fd.get("name")} (${fd.get("company")})`
    );
    const body = encodeURIComponent(
      `Name: ${fd.get("name")}\nCompany: ${fd.get("company")}\nEmail: ${fd.get("email")}\n\n${fd.get("message")}`
    );
    window.location.href = `mailto:sales@nielcos.ai?subject=${subject}&body=${body}`;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending" || status === "sent") return;
    const fd = new FormData(e.currentTarget);
    setStatus("sending");
    try {
      const res = await fetch("/api/public/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          company: fd.get("company"),
          email: fd.get("email"),
          message: fd.get("message"),
          website: fd.get("website"),
          startedAt: startedAtRef.current,
          locale,
        }),
      });
      if (!res.ok) throw new Error(`demo request failed: ${res.status}`);
      setStatus("sent");
    } catch {
      openMailto(fd);
      setStatus("fallback");
    }
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
      {/* Honeypot: hidden from humans, bots fill it and get a fake success. */}
      <div aria-hidden="true" className="pointer-events-none absolute h-0 overflow-hidden opacity-0">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <button
        type="submit"
        disabled={status === "sending" || status === "sent"}
        className="w-full rounded-xl bg-brand py-3.5 text-[15px] font-bold text-white shadow-[0_10px_24px_-8px_rgba(29,78,216,0.8)] transition-all hover:-translate-y-px hover:bg-brand-deep disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {t("submit")}
      </button>
      {status === "sent" && (
        <p className="rounded-lg bg-ok-tint px-4 py-2.5 text-center text-[13px] font-semibold text-ok">
          {t("sent")}
        </p>
      )}
      {status === "fallback" && (
        <p className="rounded-lg bg-brand-tint px-4 py-2.5 text-center text-[13px] font-semibold text-brand">
          {t("fallback")}
        </p>
      )}
      <p className="text-center text-[12.5px] text-faint">{t("note")}</p>
    </form>
  );
}
