import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GEO Health",
  description: "How legible is your business to AI answer engines?",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Fonts loaded via <link>, not next/font/google — this sandbox's
            build has no network access to Google's font CDN. Tailwind
            config carries system fallbacks either way. See README. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body">{children}</body>
    </html>
  );
}
