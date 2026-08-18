import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { logoFont } from "@/lib/logo-font";

export default function RegulaminPage() {
  return (
    <div className="min-h-dvh bg-paper text-depths">
      <header className="border-b border-mist bg-[#000C4A] px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className={`${logoFont.className} text-lime text-lg font-extrabold italic uppercase`}>
            Zaliczone
          </Link>
          <Link href="/" className="text-xs font-semibold text-luster hover:text-lime">
            ← Strona główna
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Regulamin</h1>
        <p className="text-muted mt-4 text-sm leading-relaxed">
          Usługi edukacyjne świadczy {COMPANY.name}. Szczegółowe warunki współpracy z uczniami i
          nauczycielami określa umowa oraz ustalenia indywidualne.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-depths/90">
          To jest wersja robocza. Przed uruchomieniem serwisu wstaw pełny regulamin przygotowany
          przez prawnika.
        </p>
      </main>
    </div>
  );
}
