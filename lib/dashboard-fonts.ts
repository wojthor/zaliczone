import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";

/**
 * Typografia panelu finansowego admina — świadomie osobna od fontu body (system-ui)
 * i od logo (Poppins). Space Grotesk niesie „inżynierski” charakter nagłówków/etykiet;
 * IBM Plex Mono to ledger dla wszystkich liczb (kwoty, godziny, liczniki) — tabular-nums.
 */
export const dashboardSans = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dash-sans",
  display: "swap",
});

export const dashboardMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-dash-mono",
  display: "swap",
});
