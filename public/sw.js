/* NIEL COS service worker (PWA v1) — conservative by design.
   - Hashed build assets, fonts, icons: cache-first (fast repeat loads).
   - /api/* : never cached (auth + fresh data).
   - Navigations: network only; on failure show a small offline stub.
     Authenticated pages are intentionally NOT cached offline — serving
     stale private data would be worse than an offline notice.
   Bump VERSION to invalidate old caches on deploy. */

const VERSION = "nielcos-pwa-v1";
const STATIC_CACHE = `nielcos-static-${VERSION}`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("nielcos-static-") && k !== STATIC_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function offlineResponse() {
  const zh =
    typeof navigator !== "undefined" && (navigator.language || "").toLowerCase().startsWith("zh");
  const title = zh ? "未连接到网络" : "You're offline";
  const body = zh
    ? "NIEL COS 需要网络连接来加载最新的运价与税率数据。请检查网络后重试。"
    : "NIEL COS needs a network connection to load live rates and duties. Check your connection and try again.";
  const btn = zh ? "重试" : "Retry";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — NIEL COS</title><style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;min-height:100vh;margin:0;align-items:center;justify-content:center;background:#f6f8fc;color:#0f1e3d}main{text-align:center;padding:32px;max-width:420px}.mark{width:56px;height:56px;border-radius:14px;background:#1d4ed8;color:#fff;font-weight:800;font-size:30px;display:grid;place-items:center;margin:0 auto 16px}h1{font-size:20px;margin:0 0 8px}p{font-size:14px;color:#5b6b8c;margin:0 0 20px}button{background:#1d4ed8;color:#fff;border:0;border-radius:10px;padding:12px 28px;font-size:15px;font-weight:700;cursor:pointer}</style></head><body><main><div class="mark">N</div><h1>${title}</h1><p>${body}</p><button onclick="location.reload()">${btn}</button></main></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // never cache API

  // Immutable-ish static assets: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    /\.(woff2|png|svg|ico|jpg|jpeg|webp)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res && res.ok) cache.put(req, res.clone());
              return res;
            })
        )
      )
    );
    return;
  }

  // Navigations: network only, offline stub on failure
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => offlineResponse()));
  }
});
