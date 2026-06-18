import type { MetadataRoute } from "next";

// Served by Next at /manifest.webmanifest. Enables "Add to Home Screen" with a
// standalone (chrome-less) launch on Android/Chrome. iOS uses the apple-* tags
// in layout.tsx instead, but having this is harmless and correct.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lead CRM",
    short_name: "Lead CRM",
    description: "Lead tracking with on-device OCR screenshot import.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#4f46e5",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
