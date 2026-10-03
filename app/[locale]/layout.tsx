import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import localFont from "next/font/local";
import { routing } from "@/i18n/routing";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GroupBar from "@/components/GroupBar";
import PwaRegister from "@/components/PwaRegister";
import { ToastProvider } from "@/components/ui/Toast";
import "../globals.css";

const inter = localFont({
  src: [
    { path: "../../public/inter-400-latin.woff2", weight: "400" },
    { path: "../../public/inter-500-latin.woff2", weight: "500" },
    { path: "../../public/inter-600-latin.woff2", weight: "600" },
    { path: "../../public/inter-700-latin.woff2", weight: "700" },
  ],
  variable: "--font-sans",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    title: t("title"),
    description: t("description"),
    metadataBase: new URL("https://www.nielcos.ai"),
    appleWebApp: {
      capable: true,
      title: "NIEL COS",
      statusBarStyle: "default",
    },
    icons: {
      icon: "/icons/icon-192.png",
      apple: "/apple-touch-icon.png",
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      siteName: "NIEL COS",
      type: "website",
      locale: locale.replace("-", "_"),
    },
    twitter: {
      card: "summary",
      title: t("title"),
      description: t("description"),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body
        className={`${inter.variable} flex min-h-screen flex-col bg-canvas text-ink antialiased`}
      >
        <NextIntlClientProvider>
          <PwaRegister />
          <ToastProvider>
            <GroupBar />
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
