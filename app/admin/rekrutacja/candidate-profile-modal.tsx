"use client";

import { useEffect, useId, useState, useTransition, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { hireCandidate, markTestsAsSent, rejectCandidate } from "@/lib/actions/recruitment";
import { parseRequiredTests, parseTestResults } from "@/lib/recruitment/test-links";
import type { Candidate, CandidateStatus } from "@/lib/types/database";

const STATUS_LABEL: Record<CandidateStatus, string> = {
  NEW: "Nowy",
  IN_PROGRESS: "W toku",
  REJECTED: "Odrzucony",
  HIRED: "Zatrudniony",
};

const STATUS_BADGE: Record<CandidateStatus, string> = {
  NEW: "bg-[#000C4A]/10 text-depths",
  IN_PROGRESS: "bg-toffee/20 text-toffee",
  REJECTED: "bg-claret/10 text-claret",
  HIRED: "bg-lime/40 text-depths",
};

function ageFromDob(dob: string | null): string | null {
  if (!dob) return null;
  const d = new Date(`${dob.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return `${age} lat`;
}

function formatDob(dob: string | null): string {
  if (!dob) return "—";
  try {
    return new Intl.DateTimeFormat("pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${dob.slice(0, 10)}T12:00:00`));
  } catch {
    return dob;
  }
}

function formatCreated(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pl-PL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

type Props = {
  candidate: Candidate;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
};

export function CandidateProfileModal({ candidate, open, onClose, onChanged }: Props) {
  const titleId = useId();
  const [pending, setPending] = useState<"sent" | "hire" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const required = parseRequiredTests(candidate.required_tests);
  const results = parseTestResults(candidate.test_results);
  const expected = Math.max(candidate.tests_expected || required.length, 0);
  const completed = Math.min(
    Math.max(candidate.tests_completed ?? Object.keys(results).length, 0),
    expected || Object.keys(results).length,
  );
  const progressPct = expected > 0 ? Math.min(100, Math.round((completed / expected) * 100)) : 0;
  const closed = candidate.status === "HIRED" || candidate.status === "REJECTED";
  const age = ageFromDob(candidate.dob);

  return (
    <>
      <div className="fixed inset-0 z-60 flex justify-end">
        <button
          type="button"
          className="absolute inset-0 bg-[#000C4A]/45 backdrop-blur-[1px]"
          aria-label="Zamknij profil"
          onClick={onClose}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative z-10 flex h-full w-full max-w-lg flex-col bg-snow shadow-[-12px_0_40px_rgba(0,12,74,0.18)]"
        >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-panel-frame/30 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <p className="dash-sans text-muted text-[0.65rem] font-bold uppercase tracking-[0.14em]">
                Profil kandydata
              </p>
              <h2 id={titleId} className="dash-sans text-depths mt-1 truncate text-xl font-bold tracking-tight">
                {candidate.full_name}
              </h2>
              <span
                className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-wide ${STATUS_BADGE[candidate.status]}`}
              >
                {STATUS_LABEL[candidate.status]}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="dash-sans text-muted hover:text-depths rounded-full border border-panel-frame/40 px-2.5 py-1 text-xs font-bold"
            >
              Zamknij
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 scrollbar-panel sm:px-5">
            {error ? (
              <p className="rounded-app border border-claret/30 bg-claret/5 px-3 py-2 text-sm text-claret">
                {error}
              </p>
            ) : null}

            <section>
              <h3 className="section-label">Dane podstawowe</h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="E-mail">
                  <a href={`mailto:${candidate.email}`} className="font-semibold text-[#000C4A] hover:underline">
                    {candidate.email}
                  </a>
                </Field>
                <Field label="Telefon">
                  {candidate.phone ? (
                    <a href={`tel:${candidate.phone}`} className="font-semibold hover:underline">
                      {candidate.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Data urodzenia">{formatDob(candidate.dob)}</Field>
                <Field label="Wiek">{age ?? "—"}</Field>
                <Field label="Student">{candidate.student_status ? "Tak" : "Nie"}</Field>
                <Field label="Uczelnia">{candidate.university || "—"}</Field>
                <Field label="Doświadczenie">{candidate.experience ? "Tak" : "Nie"}</Field>
                <Field label="Zgłoszenie">{formatCreated(candidate.created_at)}</Field>
              </dl>
            </section>

            <section>
              <h3 className="section-label">Edukacja i dyspozycyjność</h3>
              <dl className="mt-3 grid gap-3">
                <Field label="Wymagane testy (przedmiot · poziom)">
                  {required.length > 0 ? (
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {required.map((t) => (
                        <li
                          key={`${t.subject}-${t.level}`}
                          className="rounded-full bg-[#000C4A]/8 px-2.5 py-0.5 text-[0.7rem] font-bold text-depths"
                        >
                          {t.subject}
                          {t.level ? ` · ${t.level}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "—"
                  )}
                </Field>
                {candidate.levels ? <Field label="Poziomy (opis)">{candidate.levels}</Field> : null}
                <Field label="Godziny / tydzień">{candidate.hours_per_week || "—"}</Field>
                <Field label="CV">
                  {candidate.cv_url ? (
                    <a
                      href={candidate.cv_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-[#000C4A] hover:underline"
                    >
                      Otwórz CV
                    </a>
                  ) : (
                    "Brak linku"
                  )}
                </Field>
              </dl>
            </section>

            <section>
              <h3 className="section-label">Testy wiedzy</h3>
              <div className="mt-3 rounded-app border border-panel-frame/30 bg-paper p-3.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="dash-sans text-depths text-sm font-bold">
                    Ukończone testy: {completed}/{expected || "—"}
                  </p>
                  <p className="dash-mono text-muted text-xs font-bold tabular-nums">{progressPct}%</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist">
                  <div
                    className="h-full rounded-full bg-[#000C4A] transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <ul className="mt-3 space-y-2">
                  {required.length === 0 ? (
                    <li className="text-muted text-xs">Brak wymaganych testów.</li>
                  ) : (
                    required.map((t) => {
                      const entry = results[t.subject];
                      const score = entry?.score;
                      return (
                        <li
                          key={`${t.subject}-${t.level}`}
                          className="flex items-center justify-between gap-3 rounded-lg bg-snow px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="dash-sans text-depths text-xs font-semibold">
                              {t.subject}
                              {t.level ? (
                                <span className="text-muted font-medium"> — {t.level}</span>
                              ) : null}
                            </p>
                          </div>
                          <span
                            className={`dash-mono shrink-0 text-xs font-bold tabular-nums ${
                              score ? "text-moss" : "text-muted"
                            }`}
                          >
                            {score ?? "Oczekuje"}
                          </span>
                        </li>
                      );
                    })
                  )}
                </ul>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-panel-frame/25 pt-3">
                  <p className="dash-sans text-muted text-xs">
                    {candidate.test_sent_manually
                      ? "Testy wysłane mailem."
                      : "Wyślij linki do testów mailem"}
                  </p>
                  {!closed ? (
                    <button
                      type="button"
                      disabled={isPending || candidate.test_sent_manually}
                      onClick={() => {
                        setError(null);
                        setPending("sent");
                      }}
                      className={`dash-sans rounded-full px-3 py-1.5 text-[0.7rem] font-bold transition disabled:opacity-60 ${
                        candidate.test_sent_manually
                          ? "bg-moss/20 text-moss"
                          : "bg-[#000C4A] text-lime hover:opacity-90"
                      }`}
                    >
                      {candidate.test_sent_manually ? "Wysłane ✓" : "Wyślij testy"}
                    </button>
                  ) : null}
                </div>
              </div>
            </section>
          </div>

          {!closed ? (
            <footer className="flex shrink-0 gap-2 border-t border-panel-frame/30 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setError(null);
                  setPending("reject");
                }}
                className="dash-sans flex-1 rounded-full border border-claret/50 px-4 py-2.5 text-xs font-bold text-claret disabled:opacity-50"
              >
                Odrzuć
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setError(null);
                  setPending("hire");
                }}
                className="dash-sans flex-1 rounded-full bg-moss px-4 py-2.5 text-xs font-extrabold text-snow disabled:opacity-50"
              >
                Zatrudnij
              </button>
            </footer>
          ) : (
            <footer className="shrink-0 border-t border-panel-frame/30 px-4 py-3 text-center text-xs text-muted sm:px-5">
              Kandydat zamknięty — {STATUS_LABEL[candidate.status].toLowerCase()}.
            </footer>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={pending !== null}
        tone={pending === "reject" ? "danger" : pending === "hire" ? "positive" : "neutral"}
        title={
          pending === "sent"
            ? "Oznaczyć testy jako wysłane?"
            : pending === "hire"
              ? "Zatrudnić kandydata?"
              : "Odrzucić kandydata?"
        }
        description={
          pending === "sent"
            ? "Wyślemy maila z linkami do testów (jeden na przedmiot — najwyższy poziom) i oznaczymy status „W toku”."
            : pending === "hire"
              ? `Utworzymy konto nauczyciela dla ${candidate.full_name} i wyślemy zaproszenie.`
              : `Wyślemy uprzejmą odmowę do ${candidate.full_name} i oznaczymy status „Odrzucony”.`
        }
        confirmLabel={
          pending === "sent" ? "Wyślij testy" : pending === "hire" ? "Zatrudnij" : "Odrzuć"
        }
        successMessage={
          pending === "sent" ? "Testy wysłane." : pending === "hire" ? "Zatrudniono." : "Odrzucono."
        }
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          try {
            if (pending === "sent") await markTestsAsSent(candidate.id);
            else if (pending === "hire") await hireCandidate(candidate.id);
            else if (pending === "reject") await rejectCandidate(candidate.id);
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Nie udało się wykonać akcji.";
            setError(msg);
            throw e;
          }
        }}
        onSuccess={() => {
          setPending(null);
          startTransition(() => onChanged());
        }}
      />
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-muted text-[10px] font-bold uppercase tracking-[0.12em]">{label}</dt>
      <dd className="dash-sans text-depths mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}
