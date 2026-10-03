import type { MetadataRoute } from "next";

/* PWA manifest — served at /manifest.webmanifest.
   Icons are generated from public/icon.svg (brand blue "N"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NIEL COS — AI Global Trade Operating System",
    short_name: "NIEL COS",
    description:
      "AI-powered global trade workspace: duty lookup, landed cost, quotes, shipments, compliance.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1d4ed8",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
