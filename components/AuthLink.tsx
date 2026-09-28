"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthLink() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // While checking, render the login link to avoid layout shift.
  if (loggedIn === null || !loggedIn) {
    return (
      <Link
        href={`/${locale}/login`}
        className="hidden text-[14px] font-semibold text-ink-soft transition-colors hover:text-brand sm:block"
      >
        {t("login")}
      </Link>
    );
  }
  return (
    <Link
      href={`/${locale}/app`}
      className="hidden text-[14px] font-semibold text-brand transition-colors hover:text-brand-deep sm:block"
    >
      {t("workspace")}
    </Link>
  );
}
