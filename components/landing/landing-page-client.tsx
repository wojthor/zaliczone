"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { logoFont } from "@/lib/logo-font";
import { dashboardSans } from "@/lib/dashboard-fonts";
import { SUBJECTS } from "@/lib/subjects";
import { COMPANY } from "@/lib/company";
import { submitTutorWaitlist } from "@/lib/actions/waitlist";
import type { PublicTutorCard } from "@/lib/data/queries";

const DAYS = [
  { id: "pon", label: "Pon" },
  { id: "wt", label: "Wt" },
  { id: "sr", label: "Śr" },
  { id: "czw", label: "Czw" },
  { id: "pt", label: "Pt" },
  { id: "sob", label: "Sob" },
  { id: "nd", label: "Nd" },
] as const;

type TutorWithPhoto = PublicTutorCard & {
  photoUrl?: string | null;
  email?: string | null;
};

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-sm font-bold transition touch-manipulation ${
        active
          ? "bg-lime text-depths"
          : "bg-white/12 text-luster hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}

function TutorPortrait({
  tutor,
  featured = false,
}: {
  tutor: TutorWithPhoto;
  featured?: boolean;
}) {
  const email = tutor.email?.trim() || COMPANY.email;
  const phone = tutor.phone?.trim() || null;

  return (
    <article
      className={`group relative overflow-hidden bg-[#000C4A] ${
        featured ? "aspect-[3/4] sm:aspect-[4/5]" : "aspect-[3/4]"
      }`}
    >
      {tutor.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- podgląd stockowych Unsplash
        <img
          src={tutor.photoUrl}
          alt={tutor.name}
          className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#001a6e] via-[#000C4A] to-[#00082f]"
          aria-hidden
        >
          <span className="text-5xl font-extrabold tracking-tight text-lime/90 sm:text-6xl">
            {tutor.initials}
          </span>
        </div>
      )}
      <div
        className="absolute inset-0 bg-gradient-to-t from-[#00082f]/95 via-[#000C4A]/40 to-transparent"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <h3
          className={`dash-sans font-bold tracking-tight text-snow ${
            featured ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
          }`}
        >
          {tutor.name}
        </h3>
        <p className="mt-1.5 text-xs leading-snug text-luster/85 sm:text-sm">
          {tutor.subjects.length > 0 ? tutor.subjects.join(" · ") : "Przedmioty w uzgodnieniu"}
        </p>
        <div className="mt-3 space-y-1 text-sm text-snow/95">
          {phone ? (
            <p>
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="hover:text-lime">
                {phone}
              </a>
            </p>
          ) : null}
          <p>
            <a href={`mailto:${email}`} className="break-all hover:text-lime">
              {email}
            </a>
          </p>
        </div>
      </div>
    </article>
  );
}

function StarRow({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} na 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`text-sm ${i < count ? "text-lime" : "text-white/20"}`}
          aria-hidden
        >
          ★
        </span>
      ))}
    </div>
  );
}

/** Opinie w panelu „O nas”. Na razie schowane - dane i markup zostają. */
const SHOW_TESTIMONIALS = false;

const TESTIMONIALS = [
  {
    name: "Kasia",
    role: "mama ucznia",
    stars: 5,
    text: "Syn w końcu lubi matematykę - po trzech miesiącach sam siada do zadań.",
  },
  {
    name: "Michał",
    role: "maturzysta",
    stars: 5,
    text: "Fizyka pod maturę bez chaosu. Jasny plan i konkretne zadania.",
  },
  {
    name: "Ola",
    role: "korepetytorka",
    stars: 5,
    text: "Pracuję kiedy chcę, panel ogarnia rozliczenia. Dostaję uczniów i lecę.",
  },
] as const;

export function LandingPageClient({
  tutors,
  priceLevels,
}: {
  tutors: PublicTutorCard[];
  priceLevels: string[];
}) {
  const [heroPanel, setHeroPanel] = useState<"match" | "recruit" | "about">("match");
  const [level, setLevel] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [days, setDays] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showAllTutors, setShowAllTutors] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [waitlistPending, setWaitlistPending] = useState(false);
  const [, startTransition] = useTransition();

  const realTutors = useMemo(
    () => tutors.filter((t) => !t.id.startsWith("demo-")),
    [tutors],
  );
  const hasRealTutors = realTutors.length > 0;

  const pool = useMemo(
    (): TutorWithPhoto[] =>
      realTutors.map((t) => ({
        ...t,
        photoUrl: t.photoUrl ?? null,
        email: t.email ?? null,
        phone: t.phone ?? null,
      })),
    [realTutors],
  );

  /** Tylko realni nauczyciele - bez demo i bez „pokaż wszystkich gdy zero”. */
  const matched = useMemo(() => {
    if (!hasRealTutors) return [];
    return pool.filter((t) => {
      if (subject && !t.subjects.some((s) => s.toLowerCase() === subject.toLowerCase())) {
        return false;
      }
      if (level && !(t.levels ?? []).some((l) => l.toLowerCase() === level.toLowerCase())) {
        return false;
      }
      return Boolean(subject);
    });
  }, [hasRealTutors, pool, subject, level]);

  const needsWaitlist = !hasRealTutors || (Boolean(subject) && matched.length === 0);

  /** Przedmioty z realnych nauczycieli; gdy nikogo nie ma - pełna lista, żeby dało się wysłać zgłoszenie. */
  const availableSubjects = useMemo(() => {
    if (!hasRealTutors) return [...SUBJECTS];
    const present = new Set<string>();
    realTutors.forEach((t) => t.subjects.forEach((s) => present.add(s)));
    const ordered = SUBJECTS.filter((s) => present.has(s));
    const extra = Array.from(present).filter((s) => !(SUBJECTS as readonly string[]).includes(s));
    return [...ordered, ...extra];
  }, [hasRealTutors, realTutors]);

  useEffect(() => {
    if (subject && !availableSubjects.some((s) => s.toLowerCase() === subject.toLowerCase())) {
      setSubject(null);
    }
  }, [availableSubjects, subject]);

  const canSearch = Boolean(level && subject && days.length > 0);

  const selectedDayLabels = useMemo(
    () => DAYS.filter((d) => days.includes(d.id)).map((d) => d.label),
    [days],
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("landing-match-keyframes")) return;
    const style = document.createElement("style");
    style.id = "landing-match-keyframes";
    style.textContent = `
      @keyframes matchPanelIn {
        from { opacity: 0; transform: translateY(18px) scale(0.98); filter: blur(4px); }
        to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
      }
      @keyframes matchCardIn {
        from { opacity: 0; transform: translateY(28px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @media (prefers-reduced-motion: reduce) {
        @keyframes matchPanelIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes matchCardIn {
          from { opacity: 0; } to { opacity: 1; }
        }
      }
    `;
    document.head.appendChild(style);
  }, []);

  function toggleDay(id: string) {
    setDays((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  function openWaitlistModal() {
    setWaitlistError(null);
    setWaitlistDone(false);
    setWaitlistEmail("");
    setWaitlistOpen(true);
  }

  function closeWaitlistModal() {
    if (waitlistPending) return;
    setWaitlistOpen(false);
    setWaitlistError(null);
    setWaitlistDone(false);
  }

  function runSearch() {
    if (!canSearch) return;
    if (needsWaitlist) {
      openWaitlistModal();
      return;
    }
    startTransition(() => {
      setShowAllTutors(false);
      setShowResults(true);
    });
  }

  async function sendWaitlist() {
    if (!level || !subject || days.length === 0) return;
    setWaitlistPending(true);
    setWaitlistError(null);
    try {
      const result = await submitTutorWaitlist({
        email: waitlistEmail,
        level,
        subject,
        days: selectedDayLabels,
      });
      if (!result.ok) {
        setWaitlistError(result.error);
        return;
      }
      setWaitlistDone(true);
    } catch {
      setWaitlistError("Nie udało się wysłać zgłoszenia. Spróbuj ponownie.");
    } finally {
      setWaitlistPending(false);
    }
  }

  function backToForm() {
    setShowResults(false);
    setShowAllTutors(false);
    setHeroPanel("match");
  }

  function openRecruit() {
    setShowResults(false);
    setHeroPanel("recruit");
  }

  function openMatch() {
    setShowResults(false);
    setHeroPanel("match");
  }

  function openAbout() {
    setShowResults(false);
    setHeroPanel("about");
  }

  return (
    <div className={`scroll-smooth bg-paper text-depths ${dashboardSans.variable}`}>
      <div className="pointer-events-none fixed top-3 right-3 z-50 flex flex-row flex-wrap items-center justify-end gap-2 sm:top-5 sm:right-5 sm:gap-3">
        <button
          type="button"
          onClick={openAbout}
          className={`pointer-events-auto inline-flex rounded-full border px-4 py-2 text-xs font-extrabold uppercase tracking-wide transition ${
            heroPanel === "about" && !showResults
              ? "border-lime bg-lime text-depths"
              : "border-transparent bg-lime text-depths hover:brightness-105"
          }`}
        >
          O nas
        </button>
        <a
          href="/login"
          className="pointer-events-auto inline-flex rounded-full bg-lime px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-depths"
        >
          Zaloguj się
        </a>
      </div>

      <section
        id="top"
        className={`relative flex min-h-dvh items-center bg-[#000C4A] px-4 py-16 sm:px-6 sm:py-20 ${
          showResults ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden"
        }`}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 55% at 20% 25%, rgba(213,237,33,0.26), transparent 55%), radial-gradient(ellipse 70% 50% at 85% 75%, rgba(223,253,111,0.16), transparent 50%), linear-gradient(165deg, #000C4A 0%, #001a6e 45%, #00082f 100%)",
          }}
          aria-hidden
        />

        {showResults ? (
          <div
            key={showAllTutors ? "all-tutors" : "match-results"}
            className="relative z-10 mx-auto w-full max-w-6xl animate-[matchPanelIn_0.5s_ease-out]"
          >
            <div className="mb-8 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lime/80">
                  {showAllTutors ? "Wszyscy" : "Dopasowanie"}
                </p>
                <h2 className="dash-sans mt-2 text-2xl font-bold tracking-tight text-snow sm:text-3xl">
                  {showAllTutors ? "Nasi korepetytorzy" : "Dostępni korepetytorzy"}
                </h2>
                <p className="mt-1 text-sm text-luster/75">
                  {showAllTutors ? (
                    <>
                      {pool.length} {pool.length === 1 ? "osoba" : "osób"}
                    </>
                  ) : (
                    <>
                      {matched.length}{" "}
                      {matched.length === 1 ? "osoba" : "osób"}
                      {subject ? ` · ${subject}` : ""}
                      {level ? ` · ${level}` : ""}
                    </>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {showAllTutors ? (
                  <button
                    type="button"
                    onClick={() => setShowAllTutors(false)}
                    className="text-sm font-bold text-luster/80 underline decoration-white/30 underline-offset-4 transition hover:text-lime"
                  >
                    Wróć do dopasowania
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={backToForm}
                  className="text-sm font-bold text-luster/80 underline decoration-white/30 underline-offset-4 transition hover:text-lime"
                >
                  Zmień kryteria
                </button>
              </div>
            </div>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
              {(showAllTutors ? pool : matched).map((t, i) => (
                <li
                  key={t.id}
                  className="animate-[matchCardIn_0.55s_ease-out] overflow-hidden"
                  style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
                >
                  <TutorPortrait tutor={t} featured />
                </li>
              ))}
              {!showAllTutors ? (
                <li
                  className="animate-[matchCardIn_0.55s_ease-out] overflow-hidden"
                  style={{
                    animationDelay: `${matched.length * 80}ms`,
                    animationFillMode: "both",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowAllTutors(true)}
                    className="group relative flex aspect-[3/4] h-full min-h-[16rem] w-full flex-col items-center justify-center border-2 border-lime/40 bg-transparent px-6 text-center transition sm:aspect-[4/5] hover:border-lime/70 hover:bg-white/5"
                  >
                    <span className="dash-sans text-lg font-bold tracking-tight text-luster sm:text-xl">
                      Zobacz wszystkich korepetytorów
                    </span>
                    <span className="mt-3 text-sm font-bold text-lime/70">→</span>
                  </button>
                </li>
              ) : null}
            </ul>
          </div>
        ) : heroPanel === "about" ? (
          <div
            key="about-full"
            className="relative z-10 mx-auto w-full max-w-6xl animate-[matchPanelIn_0.5s_ease-out] pt-10 sm:pt-6"
          >
            <div className="max-w-2xl text-center lg:text-left">
              <button
                type="button"
                onClick={openMatch}
                className="text-sm font-bold text-luster/80 underline decoration-white/30 underline-offset-4 transition hover:text-lime"
              >
                ← Strona główna
              </button>
              <h2 className="dash-sans mt-4 text-3xl font-bold tracking-tight text-snow sm:text-4xl md:text-5xl">
                O nas
              </h2>
              <p className="mt-4 text-base leading-relaxed text-luster/80 sm:text-lg">
                ZALICZONE łączy uczniów z korepetytorami. My pilnujemy terminów i rozliczeń, Ty
                zajmujesz się nauką albo uczeniem.
              </p>
              <div className="mt-5 flex flex-col items-center gap-1.5 text-sm sm:text-base lg:items-start">
                <a
                  href={`mailto:${COMPANY.email}`}
                  className="font-semibold text-lime break-all transition hover:underline"
                >
                  {COMPANY.email}
                </a>
              </div>
            </div>

            {SHOW_TESTIMONIALS ? (
              <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                {TESTIMONIALS.map((item, i) => (
                  <li
                    key={item.name}
                    className="animate-[matchCardIn_0.55s_ease-out] border border-white/12 bg-white/[0.06] p-4"
                    style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
                  >
                    <StarRow count={item.stars} />
                    <p className="mt-2.5 text-sm leading-snug text-snow/90">„{item.text}”</p>
                    <p className="mt-3 text-xs font-bold text-lime/85">
                      {item.name}
                      <span className="font-medium text-luster/60"> · {item.role}</span>
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="text-center lg:text-left">
              <p
                className={`${logoFont.className} text-lime text-4xl font-extrabold italic uppercase leading-none tracking-tighter sm:text-5xl md:text-6xl`}
              >
                Zaliczone
              </p>
              <h1 className="dash-sans mt-5 text-3xl font-bold leading-[1.05] tracking-tight text-snow sm:text-4xl md:text-5xl">
                Szukasz korepetycji?
              </h1>
              <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-luster/80 lg:mx-0 sm:text-lg">
                Wybierz poziom, przedmiot i dni, kiedy możesz się uczyć. Pokażemy, kto jest wolny.
              </p>

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap lg:justify-start">
                <button
                  type="button"
                  onClick={openMatch}
                  className={`inline-flex min-h-[2.75rem] items-center justify-center rounded-full border px-6 py-3 text-sm font-extrabold uppercase tracking-wide transition ${
                    heroPanel === "match"
                      ? "border-lime bg-lime text-depths"
                      : "border-white/30 bg-transparent text-luster hover:border-lime/60 hover:text-lime"
                  }`}
                >
                  Znajdź coś dla siebie
                </button>
                <button
                  type="button"
                  onClick={openRecruit}
                  className={`inline-flex min-h-[2.75rem] items-center justify-center rounded-full border px-6 py-3 text-sm font-extrabold uppercase tracking-wide transition ${
                    heroPanel === "recruit"
                      ? "border-lime bg-lime text-depths"
                      : "border-white/30 bg-transparent text-luster hover:border-lime/60 hover:text-lime"
                  }`}
                >
                  Chcę udzielać korepetycji
                </button>
              </div>
            </div>

            <div id="quiz-panel">
              {heroPanel === "match" ? (
                <div key="form" className="animate-[matchPanelIn_0.45s_ease-out] space-y-7">
                  <div>
                    <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-lime/75">
                      Jaki poziom?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {priceLevels.map((l) => (
                        <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
                          {l}
                        </Chip>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-lime/75">
                      Jaki przedmiot?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {availableSubjects.map((s) => (
                        <Chip key={s} active={subject === s} onClick={() => setSubject(s)}>
                          {s}
                        </Chip>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-lime/75">
                      Preferowane dni (możesz kilka)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map((d) => (
                        <Chip
                          key={d.id}
                          active={days.includes(d.id)}
                          onClick={() => toggleDay(d.id)}
                        >
                          {d.label}
                        </Chip>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={runSearch}
                    disabled={!canSearch}
                    className="inline-flex w-full items-center justify-center rounded-full bg-lime px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-depths transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                  >
                    {needsWaitlist ? "Wyślij zgłoszenie" : "Dobierz korepetytora"}
                  </button>
                </div>
              ) : (
                <div key="recruit" className="animate-[matchPanelIn_0.45s_ease-out] space-y-7">
                  <div>
                    <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-lime/75">
                      Wystarczy, że
                    </p>
                    <ul className="space-y-2.5 text-base leading-relaxed text-snow/90 sm:text-lg">
                      {[
                        "jesteś studentem poniżej 26 lat",
                        "znasz przedmiot, którego chcesz uczyć",
                        "masz dostęp do internetu",
                      ].map((item) => (
                        <li key={item} className="flex gap-2.5">
                          <span className="text-lime" aria-hidden>
                            •
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-lime/75">
                      W zamian dostajesz
                    </p>
                    <ul className="space-y-2.5 text-base leading-relaxed text-snow/90 sm:text-lg">
                      {[
                        "elastyczne godziny - sam ustalasz, kiedy prowadzisz zajęcia",
                        "40-60 zł/h + premie (w zależności od poziomu)",
                        "dostęp do panelu korepetytora (terminarz, rozliczenia, ewidencja)",
                      ].map((item) => (
                        <li key={item} className="flex gap-2.5">
                          <span className="text-lime" aria-hidden>
                            •
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <a
                      href="https://docs.google.com/forms/d/e/1FAIpQLSf503Taccb7QHgKZVqVb6KmMlpcTJiLTSSiHFHLvl523zpXhA/viewform"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center rounded-full bg-lime px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-depths transition hover:brightness-105 sm:w-auto"
                    >
                      Aplikuj
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {waitlistOpen ? (
        <div className="fixed inset-0 z-70 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[#000C4A]/55 backdrop-blur-[2px]"
            aria-label="Zamknij zgłoszenie"
            onClick={closeWaitlistModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Zgłoszenie zapotrzebowania"
            className="confirm-dialog-in relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-t-[1.75rem] border border-white/10 bg-[#000C4A] text-luster sm:rounded-[1.75rem]"
          >
            <span className="mx-auto mt-2 mb-1 block h-1 w-10 shrink-0 rounded-full bg-white/25 sm:hidden" />
            <div className="relative px-5 pt-4 pb-5 sm:px-6 sm:pt-6">
              <button
                type="button"
                onClick={closeWaitlistModal}
                disabled={waitlistPending}
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-xl font-light leading-none text-luster/60 transition hover:bg-white/10 hover:text-luster disabled:opacity-40"
                aria-label="Zamknij"
              >
                ×
              </button>

              {waitlistDone ? (
                <div className="pr-8">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lime/80">
                    Wysłane
                  </p>
                  <h2 className="dash-sans mt-2 text-xl font-bold tracking-tight text-snow">
                    Dziękujemy
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-luster/80">
                    Dostaliśmy Twoje zgłoszenie. Napiszemy na{" "}
                    <span className="font-semibold text-snow">{waitlistEmail.trim()}</span>, gdy
                    pojawi się pasujący korepetytor.
                  </p>
                  <button
                    type="button"
                    onClick={closeWaitlistModal}
                    className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-lime px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-depths"
                  >
                    Zamknij
                  </button>
                </div>
              ) : (
                <div className="pr-8">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lime/80">
                    Zgłoszenie
                  </p>
                  <h2 className="dash-sans mt-2 text-xl font-bold tracking-tight text-snow">
                    Wyślij zapotrzebowanie
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-luster/75">
                    Potwierdź kryteria i podaj e-mail. Wyślemy zgłoszenie do zespołu ZALICZONE.
                  </p>

                  <dl className="mt-5 space-y-2.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-lime/70">
                        Poziom
                      </dt>
                      <dd className="text-right font-semibold text-snow">{level}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-lime/70">
                        Przedmiot
                      </dt>
                      <dd className="text-right font-semibold text-snow">{subject}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-lime/70">
                        Dni
                      </dt>
                      <dd className="text-right font-semibold text-snow">
                        {selectedDayLabels.join(", ")}
                      </dd>
                    </div>
                  </dl>

                  <label className="mt-5 grid gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-lime/75">
                      Twój e-mail
                    </span>
                    <input
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      placeholder="np. jan@email.pl"
                      className="rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm text-snow placeholder:text-luster/40 focus:border-lime/60 focus:outline-none"
                    />
                  </label>

                  {waitlistError ? (
                    <p className="mt-3 text-sm font-semibold text-[#ffb4a8]">{waitlistError}</p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void sendWaitlist()}
                    disabled={waitlistPending || !waitlistEmail.trim()}
                    className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-lime px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-depths transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {waitlistPending ? "Wysyłanie…" : "Wyślij zgłoszenie"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <footer id="kontakt" className="scroll-mt-8 border-t border-mist bg-paper px-4 py-10 text-depths sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3 sm:items-center">
          <div>
            <p className={`${logoFont.className} text-xl font-extrabold italic uppercase text-[#000C4A]`}>
              Zaliczone
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              Korepetycje z jasnymi zasadami. Łączymy uczniów z nauczycielami.
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-semibold text-[#000C4A]">{COMPANY.owner}</p>
            <p className="text-[#000C4A]">{COMPANY.address}</p>
          </div>

          <div className="space-y-2 text-sm sm:text-right">
            <a
              href={`mailto:${COMPANY.email}`}
              className="block font-semibold text-[#000C4A] break-all hover:text-[#000C4A]/80"
            >
              {COMPANY.email}
            </a>
          </div>
        </div>

        <div className="mx-auto mt-8 flex max-w-6xl flex-col items-center gap-2 border-t border-mist pt-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-xs font-semibold text-[#000C4A]">
            <Link href="/polityka-prywatnosci" className="hover:underline">
              Polityka prywatności
            </Link>
            <span className="mx-2 font-medium text-steel">|</span>
            <Link href="/regulamin" className="hover:underline">
              Regulamin
            </Link>
          </p>
          <p className="text-[11px] text-steel">
            © {new Date().getFullYear()} {COMPANY.name}. Wszelkie prawa zastrzeżone.
          </p>
        </div>
      </footer>
    </div>
  );
}
