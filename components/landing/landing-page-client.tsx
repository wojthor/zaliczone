"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { logoFont } from "@/lib/logo-font";
import { dashboardSans } from "@/lib/dashboard-fonts";
import { SUBJECTS } from "@/lib/subjects";
import { COMPANY } from "@/lib/company";
import type { PublicTutorCard } from "@/lib/data/queries";

const LEVELS = ["Szkoła podstawowa", "Liceum / technikum", "Matura", "Studia"] as const;
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

/** Stockowe portrety (Unsplash) — podgląd kafelków do czasu własnych zdjęć. */
const STOCK_PHOTOS = [
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=900&q=80",
] as const;

function stockPhotoFor(id: string, index: number): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % STOCK_PHOTOS.length;
  return STOCK_PHOTOS[(hash + index) % STOCK_PHOTOS.length]!;
}

/** Demo — zawsze widać kogoś na liście (dopóki nie ma zdjęć / pełnych profili). */
const DEMO_TUTORS: TutorWithPhoto[] = [
  {
    id: "demo-1",
    name: "Anna Kowalska",
    subjects: ["Matematyka", "Fizyka"],
    phone: "+48 501 234 567",
    email: "anna.kowalska@zaliczone.pl",
    olxUrl: null,
    photoUrl: null,
    initials: "AK",
  },
  {
    id: "demo-2",
    name: "Piotr Nowak",
    subjects: ["Angielski", "Niemiecki"],
    phone: "+48 502 345 678",
    email: "piotr.nowak@zaliczone.pl",
    olxUrl: null,
    photoUrl: null,
    initials: "PN",
  },
  {
    id: "demo-3",
    name: "Maja Wiśniewska",
    subjects: ["Chemia", "Biologia"],
    phone: "+48 503 456 789",
    email: "maja.wisniewska@zaliczone.pl",
    olxUrl: null,
    photoUrl: null,
    initials: "MW",
  },
  {
    id: "demo-4",
    name: "Jakub Zieliński",
    subjects: ["Polski", "Historia"],
    phone: "+48 504 567 890",
    email: "jakub.zielinski@zaliczone.pl",
    olxUrl: null,
    photoUrl: null,
    initials: "JZ",
  },
  {
    id: "demo-5",
    name: "Zofia Lewandowska",
    subjects: ["Matematyka", "Informatyka"],
    phone: "+48 505 678 901",
    email: "zofia.lewandowska@zaliczone.pl",
    olxUrl: null,
    photoUrl: null,
    initials: "ZL",
  },
  {
    id: "demo-6",
    name: "Tomasz Kamiński",
    subjects: ["Fizyka", "Chemia"],
    phone: "+48 506 789 012",
    email: "tomasz.kaminski@zaliczone.pl",
    olxUrl: null,
    photoUrl: null,
    initials: "TK",
  },
];

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

const TESTIMONIALS = [
  {
    name: "Kasia",
    role: "mama ucznia",
    stars: 5,
    text: "Syn w końcu lubi matematykę — po trzech miesiącach sam siada do zadań.",
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

export function LandingPageClient({ tutors }: { tutors: PublicTutorCard[] }) {
  const [heroPanel, setHeroPanel] = useState<"match" | "recruit" | "about">("match");
  const [level, setLevel] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [days, setDays] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showAllTutors, setShowAllTutors] = useState(false);
  const [, startTransition] = useTransition();

  const pool = useMemo((): TutorWithPhoto[] => {
    const real = tutors.filter((t) => !t.id.startsWith("demo-"));
    const useDemo = real.length === 0;
    const base: TutorWithPhoto[] = useDemo ? DEMO_TUTORS : real;
    return base.map((t, i) => ({
      ...t,
      photoUrl: t.photoUrl || (useDemo ? stockPhotoFor(t.id, i) : null),
      email: t.email ?? null,
      phone: t.phone || (useDemo ? (DEMO_TUTORS[i % DEMO_TUTORS.length]?.phone ?? null) : t.phone),
    }));
  }, [tutors]);

  const matched = useMemo(() => {
    const bySubject = subject
      ? pool.filter((t) => t.subjects.some((s) => s.toLowerCase() === subject.toLowerCase()))
      : pool;
    return bySubject.length > 0 ? bySubject : pool;
  }, [pool, subject]);

  const canSearch = Boolean(level && subject && days.length > 0);

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

  function runSearch() {
    if (!canSearch) return;
    startTransition(() => {
      setShowAllTutors(false);
      setShowResults(true);
    });
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
                ← Strona Główna
              </button>
              <h2 className="dash-sans mt-4 text-3xl font-bold tracking-tight text-snow sm:text-4xl md:text-5xl">
                O nas
              </h2>
              <p className="mt-4 text-base leading-relaxed text-luster/80 sm:text-lg">
                ZALICZONE łączy uczniów z korepetytorami. Uczymy konkretnie, pilnujemy terminów —
                Ty skupiasz się na nauce albo na prowadzeniu zajęć.
              </p>
              <div className="mt-5 flex flex-col items-center gap-1.5 text-sm sm:text-base lg:items-start">
                <a
                  href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}
                  className="font-semibold text-snow transition hover:text-lime"
                >
                  {COMPANY.phone}
                </a>
                <a
                  href={`mailto:${COMPANY.email}`}
                  className="font-semibold text-lime break-all transition hover:underline"
                >
                  {COMPANY.email}
                </a>
              </div>
            </div>

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
                Dobierz poziom, przedmiot i dni — pokażemy dostępnych nauczycieli ZALICZONE.
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
                      {LEVELS.map((l) => (
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
                      {SUBJECTS.map((s) => (
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
                    Dobierz korepetytora
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
                        "elastyczne godziny — sam ustalasz, kiedy prowadzisz zajęcia",
                        "40–60 zł/h + premie (w zależności od poziomu)",
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
                      href={`mailto:${COMPANY.email}?subject=${encodeURIComponent("Rekrutacja — chcę udzielać korepetycji")}`}
                      className="inline-flex w-full items-center justify-center rounded-full bg-lime px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-depths transition hover:brightness-105 sm:w-auto"
                    >
                      Aplikuj mailowo
                    </a>
                    <p className="mt-3 text-sm text-luster/75">
                      Napisz na {COMPANY.email} — odezwiemy się z kolejnymi krokami.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <footer id="kontakt" className="scroll-mt-8 border-t border-mist bg-paper px-4 py-10 text-depths sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-[1.2fr_1fr_auto] sm:items-start">
          <div>
            <p className={`${logoFont.className} text-xl font-extrabold italic uppercase text-[#000C4A]`}>
              Zaliczone
            </p>
            <p className="mt-2 text-xs text-steel">NIP {COMPANY.nip}</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
              Korepetycje z jasnymi zasadami — łączymy uczniów z nauczycielami ZALICZONE.
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-steel">Kontakt</p>
            <a
              href={`mailto:${COMPANY.email}`}
              className="block font-semibold text-[#000C4A] break-all hover:text-[#000C4A]/80"
            >
              {COMPANY.email}
            </a>
            <a
              href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}
              className="block font-semibold text-[#000C4A] hover:text-[#000C4A]/80"
            >
              {COMPANY.phone}
            </a>
            <p className="font-semibold text-[#000C4A]">{COMPANY.address}</p>
          </div>

          <div className="flex flex-col gap-2 text-xs font-semibold text-[#000C4A] sm:items-end">
            <Link href="/polityka-prywatnosci" className="hover:underline">
              Polityka prywatności
            </Link>
            <Link href="/regulamin" className="hover:underline">
              Regulamin
            </Link>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-6xl text-[11px] text-steel">
          © {new Date().getFullYear()} {COMPANY.name}. Wszelkie prawa zastrzeżone.
        </p>
      </footer>
    </div>
  );
}
