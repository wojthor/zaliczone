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
      <body className="antialiased ">
        <AppRoot>{children}</AppRoot>
      </body>
    </html>
  );
}
