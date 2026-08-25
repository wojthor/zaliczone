"use client";

import { useEffect, useId, useState, useTransition, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  hireCandidate,
  rejectCandidate,
  setCandidateStatus,
  setCandidateTestsReviewed,
  setCandidateTestsSent,
} from "@/lib/actions/recruitment";
import { parseRequiredTests, parseTestResults } from "@/lib/recruitment/test-links";
import type { Candidate, CandidateStatus, RequiredTest } from "@/lib/types/database";

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

/** Lista testów do wyświetlenia: required + ewentualne wyniki spoza listy. */
function buildTestRows(
  required: RequiredTest[],
  results: ReturnType<typeof parseTestResults>,
): { subject: string; level: string; score: string | null }[] {
  const seen = new Set<string>();
  const rows: { subject: string; level: string; score: string | null }[] = [];

  for (const t of required) {
    seen.add(t.subject);
    rows.push({
      subject: t.subject,
      level: t.level,
      score: results[t.subject]?.score ?? null,
    });
  }

  for (const [subject, entry] of Object.entries(results)) {
    if (seen.has(subject)) continue;
    rows.push({
      subject,
      level: entry.level || "",
      score: entry.score || null,
    });
  }

  return rows;
}

type Props = {
  candidate: Candidate;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
};

export function CandidateProfileModal({ candidate, open, onClose, onChanged }: Props) {
  const titleId = useId();
  const [pending, setPending] = useState<"hire" | "reject" | null>(null);
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
  const testRows = buildTestRows(required, results);
  const expected = Math.max(candidate.tests_expected || required.length, testRows.length, 0);
  const completed = testRows.filter((t) => Boolean(t.score)).length;
  const progressPct = expected > 0 ? Math.min(100, Math.round((completed / expected) * 100)) : 0;
  const closed = candidate.status === "HIRED" || candidate.status === "REJECTED";
  const age = ageFromDob(candidate.dob);
  const fromApplication = Boolean(
    candidate.phone || candidate.dob || candidate.university || candidate.hours_per_week || candidate.cv_url,
  );
  const reviewed = Boolean(candidate.tests_reviewed_manually);

  function runFlag(action: () => Promise<{ ok: true }>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        onChanged();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Nie udało się zapisać.");
      }
    });
  }

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

            {!fromApplication ? (
              <p className="rounded-app border border-toffee/35 bg-toffee/10 px-3 py-2.5 text-xs leading-relaxed text-depths">
                Na razie widać głównie wynik testu. Pełne dane (telefon, uczelnia, CV…) uzupełnią się, gdy ta
                sama osoba wyśle <strong>Formularz rekrutacyjny</strong> (APPLICATION) na webhook.
              </p>
            ) : null}

            <section>
              <h3 className="section-label">Status i checklista</h3>
              <div className="mt-3 space-y-3 rounded-app border border-panel-frame/30 bg-paper p-3.5">
                <label className="flex flex-col gap-1.5">
                  <span className="text-muted text-[10px] font-bold uppercase tracking-[0.12em]">
                    Status
                  </span>
                  <select
                    className="dash-sans text-depths rounded-app border border-panel-frame/40 bg-snow px-3 py-2 text-sm font-semibold disabled:opacity-50"
                    value={candidate.status}
                    disabled={isPending}
                    onChange={(e) => {
                      const next = e.target.value as CandidateStatus;
                      runFlag(() => setCandidateStatus(candidate.id, next));
                    }}
                  >
                    {(Object.keys(STATUS_LABEL) as CandidateStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-[#000C4A]"
                    checked={candidate.test_sent_manually}
                    disabled={isPending || closed}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      runFlag(() => setCandidateTestsSent(candidate.id, checked));
                    }}
                  />
                  <span className="dash-sans text-depths text-sm font-medium leading-snug">
                    Wysłałem / wysłałam linki do testów
                    <span className="text-muted mt-0.5 block text-xs font-normal">
                      Zaznacz przed oczekiwanymi odpowiedziami — bez maila z aplikacji.
                    </span>
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-[#000C4A]"
                    checked={reviewed}
                    disabled={isPending || closed}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      runFlag(() => setCandidateTestsReviewed(candidate.id, checked));
                    }}
                  />
                  <span className="dash-sans text-depths text-sm font-medium leading-snug">
                    Testy sprawdzone samodzielnie
                    <span className="text-muted mt-0.5 block text-xs font-normal">
                      Oznacz, gdy przejrzałeś wyniki w Forms / panelu.
                    </span>
                  </span>
                </label>
              </div>
            </section>

            <section>
              <h3 className="section-label">Dane ze zgłoszenia</h3>
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
                <Field label="Zgłoszenie / wpis">{formatCreated(candidate.created_at)}</Field>
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
                    "—"
                  )}
                </Field>
              </dl>
              {candidate.levels ? (
                <dl className="mt-3">
                  <Field label="Poziomy (opis)">{candidate.levels}</Field>
                </dl>
              ) : null}
            </section>

            <section>
              <h3 className="section-label">Testy wiedzy</h3>
              <div className="mt-3 rounded-app border border-panel-frame/30 bg-paper p-3.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="dash-sans text-depths text-sm font-bold">
                    Wyniki: {completed}/{expected || "—"}
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
                  {testRows.length === 0 ? (
                    <li className="text-muted text-xs">Brak testów na liście.</li>
                  ) : (
                    testRows.map((t) => (
                      <li
                        key={`${t.subject}-${t.level}`}
                        className="flex items-center justify-between gap-3 rounded-lg bg-snow px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="dash-sans text-depths text-sm font-semibold">{t.subject}</p>
                          {t.level ? (
                            <p className="text-muted mt-0.5 text-[0.7rem] font-medium leading-snug">
                              {t.level}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={`dash-mono shrink-0 text-sm font-bold tabular-nums ${
                            t.score ? "text-moss" : "text-muted"
                          }`}
                        >
                          {t.score ?? "Oczekuje"}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
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
        tone={pending === "reject" ? "danger" : "positive"}
        title={pending === "hire" ? "Zatrudnić kandydata?" : "Odrzucić kandydata?"}
        description={
          pending === "hire"
            ? `Utworzymy konto nauczyciela dla ${candidate.full_name} i wyślemy zaproszenie.`
            : `Wyślemy uprzejmą odmowę do ${candidate.full_name} i oznaczymy status „Odrzucony”.`
        }
        confirmLabel={pending === "hire" ? "Zatrudnij" : "Odrzuć"}
        successMessage={pending === "hire" ? "Zatrudniono." : "Odrzucono."}
        onCancel={() => setPending(null)}
        onConfirm={async () => {
          try {
            if (pending === "hire") await hireCandidate(candidate.id);
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
