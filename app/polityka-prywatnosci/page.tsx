import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { logoFont } from "@/lib/logo-font";

export default function PolitykaPrywatnosciPage() {
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
        <h1 className="text-2xl font-bold tracking-tight">Polityka prywatności</h1>
        <p className="text-muted mt-4 text-sm leading-relaxed">
          Administratorem danych jest {COMPANY.name} (NIP {COMPANY.nip}), {COMPANY.address}.
          Kontakt: <a className="font-semibold underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
        </p>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-depths/90">
          <p>
            Przetwarzamy dane podane w formularzach kontaktowych oraz dane kont użytkowników panelu
            (nauczycieli) w celu realizacji usług edukacyjnych, rozliczeń i komunikacji.
          </p>
          <p>
            Podstawą są art. 6 ust. 1 lit. b i f RODO (umowa / prawnie uzasadniony interes). Dane nie są
            sprzedawane.
          </p>
          <p>
            Przysługuje Ci prawo dostępu, sprostowania, usunięcia i ograniczenia przetwarzania. Możesz
            też wnieść skargę do PUODO.
          </p>
          <p>
            To jest wersja robocza polityki. Przed uruchomieniem serwisu uzupełnij ją o pełną treść
            prawną.
          </p>
        </div>
      </main>
    </div>
  );
}
