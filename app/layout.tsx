import type { ReactNode } from "react";

/**
 * Root layout intentionally passes children through: the [locale] layout
 * below renders <html> / <body> with the correct lang attribute.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
