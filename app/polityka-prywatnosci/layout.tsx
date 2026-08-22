import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LegalDocShell } from "@/components/legal/legal-doc-shell";

export const metadata: Metadata = {
  title: "Polityka prywatności | ZALICZONE",
  description: "Polityka prywatności platformy ZALICZONE.",
};

export default function PolitykaPrywatnosciLayout({ children }: { children: ReactNode }) {
  return <LegalDocShell>{children}</LegalDocShell>;
}
