import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LegalDocShell } from "@/components/legal/legal-doc-shell";

export const metadata: Metadata = {
  title: "Regulamin | ZALICZONE",
  description: "Regulamin świadczenia usług platformy ZALICZONE.",
};

export default function RegulaminLayout({ children }: { children: ReactNode }) {
  return <LegalDocShell>{children}</LegalDocShell>;
}
