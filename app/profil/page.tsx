"use client";

import { PageShell } from "@/components/page-shell";

export default function ProfilPage() {
  return (
    <PageShell title="Profil">
      <p className="text-muted mb-6 text-sm font-medium">
        Dane korepetytora, dokumenty i miejsce na pliki — widok demonstracyjny (upload wkrótce).
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-app border-2 border-panel-frame bg-snow/95 p-4">
          <h2 className="text-depths text-base font-semibold tracking-tight">Dane kontaktowe</h2>
          <dl className="text-depths mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted text-xs font-semibold uppercase tracking-wide">Imię i nazwisko</dt>
              <dd className="mt-0.5 font-semibold">Jan Kowalczyk</dd>
            </div>
            <div>
              <dt className="text-muted text-xs font-semibold uppercase tracking-wide">E-mail</dt>
              <dd className="mt-0.5 font-medium">jan.kowalczyk@mail.example</dd>
            </div>
            <div>
              <dt className="text-muted text-xs font-semibold uppercase tracking-wide">Telefon</dt>
              <dd className="mt-0.5 font-medium tabular-nums">+48 500 000 000</dd>
            </div>
            <div>
              <dt className="text-muted text-xs font-semibold uppercase tracking-wide">NIP / działalność</dt>
              <dd className="mt-0.5 font-medium">Białej listy (demo)</dd>
            </div>
            <div>
              <dt className="text-muted text-xs font-semibold uppercase tracking-wide">Opis</dt>
              <dd className="text-depths/85 mt-0.5 leading-relaxed">
                Korepetycje matematyka i fizyka, klasy 4–8 i przygotowanie do egzaminów.
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-app border-2 border-panel-frame bg-jodhpur/80 p-4">
          <h2 className="text-depths text-base font-semibold tracking-tight">Umowy i dokumenty</h2>
          <p className="text-muted mt-1 text-xs font-medium">
            Szablony umów z rodzicem, regulaminy — dodaj pliki PDF (interfejs przygotowany pod upload).
          </p>
          <ul className="mt-4 space-y-2">
            {["Umowa_korepetycje_szablon.pdf", "Regulamin_odwolan.pdf", "RODO_informacja.pdf"].map((name) => (
              <li
                key={name}
                className="text-depths flex items-center justify-between gap-2 rounded-lg border-2 border-panel-frame bg-snow/80 px-3 py-2 text-sm font-medium"
              >
                <span className="truncate">{name}</span>
                <span className="text-muted shrink-0 text-xs">Podgląd</span>
              </li>
            ))}
          </ul>
          <label className="text-depths mt-4 flex cursor-pointer flex-col items-center justify-center rounded-app border-2 border-panel-frame bg-snow/60 px-4 py-8 text-center text-sm font-semibold transition-colors hover:bg-snow/90">
            <span>Upuść plik lub kliknij, aby wybrać</span>
            <span className="text-muted mt-1 text-xs font-normal">PDF, do 10 MB (demo — bez wysyłki)</span>
            <input type="file" className="sr-only" accept=".pdf,application/pdf" disabled />
          </label>
        </section>

        <section className="rounded-app border-2 border-panel-frame bg-luster/90 p-4 lg:col-span-2">
          <h2 className="text-depths text-base font-semibold tracking-tight">Ewidencja godzin</h2>
          <p className="text-muted mt-1 text-xs font-medium">
            Miejsce na eksport ewidencji, zestawienia miesięczne i załączniki do urzędu (UI demonstracyjne).
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-app border-2 border-panel-frame bg-snow/90 p-3">
              <p className="text-depths text-sm font-semibold">Ewidencja_marzec_2026.xlsx</p>
              <p className="text-muted mt-1 text-xs">Ostatnio wygenerowano: 28.03.2026 (demo)</p>
              <button
                type="button"
                className="mt-3 rounded-full bg-[#000C4A] px-3 py-1.5 text-xs font-bold text-lime"
                onClick={() => alert("Pobieranie — demo.")}
              >
                Pobierz
              </button>
            </div>
            <label className="text-depths flex cursor-pointer flex-col justify-center rounded-app border-2 border-panel-frame bg-snow/70 px-4 py-6 text-sm font-semibold">
              Zaimportuj skan podpisanego dokumentu
              <input type="file" className="sr-only" accept="image/*,.pdf" disabled />
              <span className="text-muted mt-2 text-xs font-normal">JPG, PNG, PDF (demo)</span>
            </label>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
