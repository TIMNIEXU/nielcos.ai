"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton({ label }: { label: string }) {
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const sb = createClient();
        await sb.auth.signOut();
        window.location.href = `/${locale}/login`;
      }}
      className="rounded-full border border-line bg-white px-5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
    >
      {label}
    </button>
  );
}
