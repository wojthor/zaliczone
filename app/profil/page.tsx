"use client";

import { useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { DEMO_ACTIVE_SUBJECTS } from "@/lib/demo-data";

const SUBJECT_SUGGESTIONS = [
  "Informatyka",
  "Geografia",
  "Hiszpański",
  "WOS",
  "Chemia organiczna",
] as const;

export default function ProfilPage() {
  const [activeSubjects] = useState<string[]>(() => [...DEMO_ACTIVE_SUBJECTS]);
  const [pendingSubjects, setPendingSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");

  const availableSuggestions = useMemo(
    () =>
      SUBJECT_SUGGESTIONS.filter(
        (subject) => !activeSubjects.includes(subject) && !pendingSubjects.includes(subject),
      ),
    [activeSubjects, pendingSubjects],
  );

  function submitSubject() {
    if (!selectedSubject) return;
    setPendingSubjects((prev) => [...prev, selectedSubject]);
    setSelectedSubject("");
  }

  return (
    <PageShell title="Profil">
      <p className="text-muted mb-6 text-sm font-medium">
        Dane korepetytora, aktywne przedmioty oraz zgłoszenia do akceptacji administratora.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-app bg-snow/95 p-4 shadow-sm">
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
              <dt className="text-muted text-xs font-semibold uppercase tracking-wide">Ogłoszenie</dt>
              <dd className="mt-0.5">
                <a
                  href="https://www.olx.pl/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[#000C4A] underline underline-offset-2"
                >
                  Demo link do ogłoszenia OLX
                </a>
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-app bg-jodhpur/80 p-4 shadow-sm">
          <h2 className="text-depths text-base font-semibold tracking-tight">Przedmioty</h2>
          <p className="text-muted mt-1 text-xs font-medium">
            Lista aktywnych przedmiotów oraz zgłoszenia oczekujące na akceptację.
          </p>

          <div className="mt-4">
            <p className="text-muted text-xs font-semibold uppercase tracking-wide">Aktywne</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeSubjects.map((subject) => (
                <span
                  key={subject}
                  className="rounded-full bg-[#000C4A] px-3 py-1.5 text-xs font-semibold text-lime"
                >
                  {subject}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            <label className="grid gap-1">
              <span className="text-muted text-xs font-semibold uppercase tracking-wide">Zgłoś nowy przedmiot</span>
              <div className="relative">
                <select
                  className="text-depths w-full appearance-none rounded-app bg-snow px-3 py-2 pr-12 text-sm font-medium"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  <option value="">Wybierz</option>
                  {availableSuggestions.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-4.5 top-1/2 -translate-y-1/2 text-depths">
                  <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden>
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </label>
            <button
              type="button"
              onClick={submitSubject}
              className="w-fit rounded-full bg-[#000C4A] px-4 py-2 text-sm font-semibold text-lime disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!selectedSubject}
            >
              Zgłoś do akceptacji
            </button>
          </div>

          <div className="mt-4">
            <p className="text-muted text-xs font-semibold uppercase tracking-wide">Oczekujące</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pendingSubjects.length > 0 ? (
                pendingSubjects.map((subject) => (
                  <span
                    key={subject}
                    className="rounded-full border border-panel-frame/50 bg-snow px-3 py-1.5 text-xs font-semibold text-depths"
                  >
                    {subject} · oczekuje
                  </span>
                ))
              ) : (
                <p className="text-muted text-sm">Brak zgłoszeń oczekujących.</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-app bg-luster/90 p-4 shadow-sm lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-app bg-snow/90 p-4 shadow-sm">
              <h2 className="text-depths text-base font-semibold tracking-tight">Umowy i dokumenty</h2>
              <p className="text-muted mt-1 text-xs font-medium">Widok demonstracyjny. Upload wróci w kolejnej iteracji.</p>
              <ul className="mt-4 space-y-2 text-sm">
                {["Umowa_wspolpracy.pdf", "Regulamin_odwolan.pdf", "RODO_informacja.pdf"].map((name) => (
                  <li key={name} className="rounded-app bg-luster px-3 py-2 font-medium text-depths">
                    {name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-app bg-snow/90 p-4 shadow-sm">
              <h2 className="text-depths text-base font-semibold tracking-tight">Ewidencja godzin</h2>
              <p className="text-muted mt-1 text-xs font-medium">
                Eksport i załączniki pozostają w trybie demo, ale układ jest gotowy pod dalszy rozwój.
              </p>
              <div className="mt-4 rounded-app bg-luster px-3 py-3">
                <p className="text-depths text-sm font-semibold">Ewidencja_marzec_2026.xlsx</p>
                <p className="text-muted mt-1 text-xs">Ostatnio wygenerowano: 28.03.2026</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
