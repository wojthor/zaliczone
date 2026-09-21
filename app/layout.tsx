import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppRoot } from "@/components/app-root";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZALICZONE",
  description: "Panel korepetytora",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="pl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600;700&family=Poppins:ital,wght@0,700;0,800;1,700;1,800&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <AppRoot>{children}</AppRoot>
      </body>
    </html>
  );
}
