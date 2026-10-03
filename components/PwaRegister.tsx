"use client";

import { useEffect } from "react";

/* Registers /sw.js in production only. The service worker caches static
   assets for fast repeat loads and shows an offline stub when the network
   is down. API responses and pages are never cached. */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* SW unsupported or blocked — site works fine without it */
      });
    }
  }, []);
  return null;
}
