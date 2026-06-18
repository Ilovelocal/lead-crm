import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead CRM",
  description: "Lead tracking with on-device OCR screenshot import.",
  applicationName: "Lead CRM",
  // iOS "Add to Home Screen" -> standalone launch + home-screen icon.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lead CRM",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Let the app draw under the iOS notch/home indicator when launched standalone.
  viewportFit: "cover",
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-[100dvh] bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
