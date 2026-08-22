import Link from "next/link";
import type { ReactNode } from "react";
import { logoFont } from "@/lib/logo-font";

export function LegalDocShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper text-depths">
      <header className="border-b border-mist bg-[#000C4A] px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/"
            className={`${logoFont.className} text-lg font-extrabold italic uppercase text-lime`}
          >
            Zaliczone
          </Link>
          <Link href="/" className="text-xs font-semibold text-luster hover:text-lime">
            ← Strona główna
          </Link>
        </div>
      </header>
      <main className="legal-prose mx-auto max-w-3xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
