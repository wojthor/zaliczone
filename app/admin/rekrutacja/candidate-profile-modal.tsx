"use client";

import { useEffect, useId, useState, useTransition, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  hireCandidate,
  rejectCandidate,
  setCandidateTestsReviewed,
  setCandidateTestsSent,
} from "@/lib/actions/recruitment";
import {
  buildCandidateTestDisplayRows,
  parseRequiredTests,
  parseTestResultsList,
  suggestTestsToSend,
} from "@/lib/recruitment/test-links";
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

function formatDatePl(d: Date): string {
  try {
    return new Intl.DateTimeFormat("pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function addBusinessDays(from: Date, days: number): Date {
  const result = dateOnly(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) added += 1;
  }
  return result;
}

/** Liczba dni roboczych między dwiema datami (dodatnia, jeśli `to` jest po `from`). */
function businessDaysBetween(from: Date, to: Date): number {
  const a = dateOnly(from);
  const b = dateOnly(to);
  const sign = b.getTime() >= a.getTime() ? 1 : -1;
  const start = sign === 1 ? a : b;
  const end = sign === 1 ? b : a;
  let count = 0;
  const cur = new Date(start);
  while (cur.getTime() < end.getTime()) {
    cur.setDate(cur.getDate() + 1);
    if (!isWeekend(cur)) count += 1;
  }
  return count * sign;
}

function TestProgressBadge({
  sentAt,
  completed,
  expected,
}: {
  sentAt: string | null;
  completed: number;
  expected: number;
}) {
  if (expected > 0 && completed >= expected) {
    return (
      <p className="dash-sans inline-flex items-center rounded-full border border-moss/30 bg-moss/10 px-2.5 py-1 text-[0.7rem] font-bold text-moss">
        Oddano wszystkie testy ({completed}/{expected})
      </p>
    );
  }

  if (!sentAt || expected <= 0) return null;

  const sent = new Date(`${sentAt.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(sent.getTime())) return null;

  const deadline = addBusinessDays(sent, 3);
  const today = dateOnly(new Date());
  const diff = businessDaysBetween(today, deadline);
  const deadlineLabel = formatDatePl(deadline);
  const pending = Math.max(expected - completed, 0);
  const progressNote = completed > 0 ? ` · oddano ${completed}/${expected}` : "";

  if (pending <= 0) return null;

  if (diff < 0) {
    const overdue = Math.abs(diff);
    return (
      <p className="dash-sans inline-flex items-center rounded-full border border-claret/40 bg-claret/10 px-2.5 py-1 text-[0.7rem] font-bold text-claret">
        Brakuje {pending} {pending === 1 ? "testu" : "testów"} · termin minął {overdue}{" "}
        {overdue === 1 ? "dzień roboczy" : "dni robocze"} temu ({deadlineLabel}){progressNote}
      </p>
    );
  }

  if (diff > 1) {
    return (
      <p className="dash-sans inline-flex items-center rounded-full border border-toffee/40 bg-toffee/10 px-2.5 py-1 text-[0.7rem] font-bold text-toffee">
        Brakuje {pending} · termin {deadlineLabel} · jeszcze {diff} dni robocze{progressNote}
      </p>
    );
  }

  if (diff === 1) {
    return (
      <p className="dash-sans inline-flex items-center rounded-full border border-toffee/40 bg-toffee/10 px-2.5 py-1 text-[0.7rem] font-bold text-toffee">
        Brakuje {pending} · termin jutro ({deadlineLabel}){progressNote}
      </p>
    );
  }

  return (
    <p className="dash-sans inline-flex items-center rounded-full border border-toffee/40 bg-toffee/10 px-2.5 py-1 text-[0.7rem] font-bold text-toffee">
      Brakuje {pending} · termin dziś ({deadlineLabel}){progressNote}
    </p>
  );
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
  const [sentDate, setSentDate] = useState<string>(candidate.test_sent_at?.slice(0, 10) || "");

  useEffect(() => {
    setSentDate(candidate.test_sent_at?.slice(0, 10) || "");
  }, [candidate.id, candidate.test_sent_at]);

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
  const results = parseTestResultsList(candidate.test_results);
  const testRows = buildCandidateTestDisplayRows(required, results);
  const expected = Math.max(candidate.tests_expected || required.length, 0);
  const completed = required.filter((t) =>
    results.some((r) => r.subject.trim().toLowerCase() === t.subject.trim().toLowerCase()),
  ).length;
  const progressPct = expected > 0 ? Math.min(100, Math.round((completed / expected) * 100)) : 0;
  const closed = candidate.status === "HIRED" || candidate.status === "REJECTED";
  const age = ageFromDob(candidate.dob);
  const suggestions = suggestTestsToSend(required);
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

  function handleSentToggle(checked: boolean) {
    if (checked && !sentDate) {
      setError("Najpierw podaj datę wysłania.");
      return;
    }
    runFlag(() => setCandidateTestsSent(candidate.id, checked, checked ? sentDate : null));
  }

  function handleDateChange(value: string) {
    setSentDate(value);
    if (!candidate.test_sent_manually || !value) return;
    runFlag(() => setCandidateTestsSent(candidate.id, true, value));
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
                <Field label="Status studenta">{candidate.student_status ? "Tak" : "Nie"}</Field>
                <Field label="Uczelnia">{candidate.university || "—"}</Field>
                <Field label="Doświadczenie">{candidate.experience ? "Tak" : "Nie"}</Field>
                <Field label="Zgłoszenie / wpis">{formatCreated(candidate.created_at)}</Field>
                <Field label="Godziny / tydzień">{candidate.hours_per_week || "—"}</Field>
              </dl>
            </section>

            <section>
              <h3 className="section-label">Przedmioty i poziomy</h3>
              <p className="text-muted mt-1 text-xs">Zaznaczone w formularzu zgłoszeniowym.</p>
              {required.length === 0 ? (
                <p className="text-muted mt-3 text-xs">Brak przedmiotów w zgłoszeniu.</p>
              ) : (
                <ul className="mt-3 divide-y divide-panel-frame/25 overflow-hidden rounded-app border border-panel-frame/25 bg-snow">
                  {required.map((t) => (
                    <li
                      key={`level-${t.subject}-${t.level}`}
                      className="flex items-baseline justify-between gap-4 px-3 py-2.5"
                    >
                      <span className="dash-sans text-depths text-sm font-semibold">{t.subject}</span>
                      <span className="text-muted shrink-0 text-right text-xs font-medium leading-snug">
                        {t.level || "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="section-label">Testy do wysłania</h3>
              <p className="text-muted mt-1 text-xs leading-relaxed">
                Jeden test na przedmiot — najwyższy poziom do wysłania.
              </p>
              {(() => {
                const toSend = suggestions.filter((t) => t.url);
                if (toSend.length === 0) {
                  return <p className="text-muted mt-3 text-xs">Brak testów do wysłania.</p>;
                }
                return (
                  <ol className="mt-3 space-y-2">
                    {toSend.map((t, index) => (
                      <li
                        key={`suggest-${t.subject}-${t.level}`}
                        className="flex gap-3 rounded-app border border-[#000C4A]/15 border-l-4 border-l-[#000C4A] bg-[#000C4A]/4 px-3 py-2.5"
                      >
                        <span className="dash-mono text-muted mt-0.5 text-[0.65rem] font-bold tabular-nums">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="dash-sans text-depths text-sm font-bold">{t.subject}</p>
                          <p className="text-muted mt-0.5 text-[0.7rem] font-medium leading-snug">{t.level}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                );
              })()}
            </section>

            <section>
              <h3 className="section-label">Wysyłka testów</h3>
              <div className="mt-3 space-y-3 rounded-app border border-panel-frame/30 bg-paper p-3.5">
                <label className="flex flex-wrap items-center gap-2">
                  <span className="text-muted text-[10px] font-bold uppercase tracking-[0.12em]">
                    Data wysłania
                  </span>
                  <input
                    type="date"
                    className="dash-mono text-depths rounded-app border border-panel-frame/40 bg-snow px-2.5 py-1.5 text-sm font-semibold disabled:opacity-50"
                    value={sentDate}
                    disabled={isPending || closed}
                    onChange={(e) => handleDateChange(e.target.value)}
                  />
                </label>

                <label
                  className={`flex items-start gap-3 ${
                    !sentDate || closed ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-[#000C4A]"
                    checked={candidate.test_sent_manually}
                    disabled={isPending || closed || !sentDate}
                    onChange={(e) => handleSentToggle(e.target.checked)}
                  />
                  <span className="dash-sans text-depths text-sm font-medium leading-snug">
                    Test wysłany
                  </span>
                </label>
              </div>
            </section>

            {candidate.test_sent_manually && candidate.test_sent_at ? (
              <section>
                <h3 className="section-label">Wyniki testów</h3>
                <div className="mt-2">
                  <TestProgressBadge
                    sentAt={candidate.test_sent_at}
                    completed={completed}
                    expected={expected}
                  />
                </div>
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
                          key={`${t.kind}-${t.subject}-${t.level}`}
                          className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${
                            t.kind === "retry"
                              ? "bg-paper ring-1 ring-panel-frame/30"
                              : t.kind === "extra"
                                ? "bg-toffee/10 ring-1 ring-toffee/25"
                                : "bg-snow"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="dash-sans text-depths text-sm font-semibold">{t.subject}</p>
                            {t.level ? (
                              <p className="text-muted mt-0.5 text-[0.7rem] font-medium leading-snug">
                                {t.level}
                              </p>
                            ) : null}
                            {t.note ? (
                              <p
                                className={`mt-0.5 text-[0.65rem] font-medium ${
                                  t.kind === "retry" ? "text-muted" : "text-toffee"
                                }`}
                              >
                                {t.note}
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

                  <label className="mt-3 flex cursor-pointer items-start gap-3 border-t border-panel-frame/25 pt-3">
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
                        Oznacz, gdy przejrzałeś wyniki.
                      </span>
                    </span>
                  </label>
                </div>
              </section>
            ) : null}
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
