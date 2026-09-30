import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/shell/AppShell";
import type { NavItem, ShellLabels } from "@/components/shell/types";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/* Flat shell.* keys, pre-translated here (no ICU placeholders inside). */
const SHELL_KEYS = [
  "nav.dashboard", "nav.trades", "nav.shipments", "nav.customs",
  "nav.documents", "nav.products", "nav.suppliers", "nav.logistics",
  "nav.finance", "nav.compliance", "nav.assistant", "nav.tower",
  "nav.executive", "nav.integrations", "nav.team", "nav.settings",
  "collapse", "expand", "openMenu", "closeMenu", "workspace",
  "search.placeholder", "search.noResults", "search.searching",
  "search.groupTrade", "search.groupShipment", "search.groupEntry", "search.groupDocument",
  "quick.title", "quick.newTrade", "quick.newShipment", "quick.uploadDocument", "quick.newEntry",
  "bell.title", "bell.empty", "bell.high", "bell.medium", "bell.low",
  "menu.signOut", "menu.signedInAs",
  "crumbs.dashboard",
];

const NAV_DEFS: { key: string; href: string; icon: string; ownerOnly?: boolean }[] = [
  { key: "dashboard", href: "/app", icon: "dashboard" },
  { key: "trades", href: "/app/trades", icon: "trades" },
  // Shipments shares the workspace root until the IA split lands (track E).
  { key: "shipments", href: "/app", icon: "shipments" },
  { key: "customs", href: "/app/customs", icon: "customs" },
  { key: "documents", href: "/app/documents", icon: "documents" },
  { key: "products", href: "/app/products", icon: "products" },
  { key: "suppliers", href: "/app/suppliers", icon: "suppliers" },
  { key: "logistics", href: "/app/logistics", icon: "logistics" },
  { key: "finance", href: "/app/finance", icon: "finance" },
  { key: "compliance", href: "/app/compliance", icon: "compliance" },
  { key: "assistant", href: "/app/assistant", icon: "assistant" },
  { key: "tower", href: "/app/tower", icon: "tower" },
  { key: "executive", href: "/app/executive", icon: "executive" },
  { key: "integrations", href: "/app/integrations", icon: "integrations" },
  { key: "team", href: "/app/team", icon: "team", ownerOnly: true },
];

export default async function AppLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    redirect({ href: "/login", locale });
  }
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect({ href: "/login", locale });

  const { data: profile } = await sb
    .from("profiles")
    .select("role, companies ( name )")
    .eq("id", user!.id)
    .single();

  const t = await getTranslations("shell");
  const labels: ShellLabels = {};
  for (const k of SHELL_KEYS) labels[k] = t(k);

  const isOwner = (profile as { role?: string } | null)?.role === "owner";
  const navItems: NavItem[] = NAV_DEFS.filter((d) => !d.ownerOnly || isOwner).map(
    (d) => ({ key: d.key, href: d.href, label: t(`nav.${d.key}`), icon: d.icon })
  );

  const companyName =
    (profile?.companies as { name?: string } | null)?.name ?? "";

  return (
    <AppShell
      locale={locale}
      labels={labels}
      navItems={navItems}
      companyName={companyName}
      userEmail={user!.email ?? ""}
      children={children}
    />
  );
}
