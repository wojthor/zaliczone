"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LessonCompletionProvider } from "@/components/dashboard/lesson-completion-context";
import { WeeklySchedule } from "@/components/dashboard/weekly-schedule";
import {
  dayLabel,
  type Lesson,
} from "@/components/dashboard/lesson-data";
import { LessonStatusBadge, resolveLessonStatus } from "@/components/lesson/lesson-status-badge";
import { MonthNavigator, formatMonthLongFromKey, useMonthKey } from "@/components/month-navigator";
import { useWeekMondayIso } from "@/components/week-navigator";
import { Spinner, useToast } from "@/components/ui/toast";
import { subjectsFromLine } from "@/lib/data/mappers";
import {
  deleteLesson,
  insertLessons,
  lessonDatesFromDraft,
  updateLesson,
} from "@/lib/data/mutations";
import type { StudentUi } from "@/lib/types/database";

type RecurrenceMode = "once" | "weekly" | "custom";

type LessonDraft = {
  subject: string;
  studentId: string;
  studentName: string;
  initials: string;
  classLabel: string;
  dateIso: string;
  start: string;
  end: string;
  recurrence: RecurrenceMode;
  selectedWeekdays: number[];
  notes: string;
};

const DAY_LABELS_NARROW = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"] as const;

function todayIso(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function makeEmptyDraft(): LessonDraft {
  return {
    subject: "",
    studentId: "",
    studentName: "",
    initials: "",
    classLabel: "",
    dateIso: todayIso(),
    start: "15:00",
    end: "16:00",
    recurrence: "once",
    selectedWeekdays: [],
    notes: "",
  };
}

function buildDraftFromLesson(lesson: Lesson): LessonDraft {
  return {
    subject: lesson.subject,
    studentId: lesson.studentId ?? "",
    studentName: lesson.studentName,
    initials: lesson.initials,
    classLabel: lesson.classLabel,
    dateIso: lesson.date ?? todayIso(),
    start: lesson.start,
    end: lesson.end,
    recurrence: "once",
    selectedWeekdays: [lesson.dayIndex],
    notes: lesson.notes ?? "",
  };
}

function formatDateChip(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00`);
  return new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long" }).format(d);
}

function monthLabelFor(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00`);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

function formatLessonDatePl(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00`);
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

function MiniCalendar({
  value,
  onChange,
}: {
  value: string;
  onChange: (dateIso: string) => void;
}) {
  const selected = new Date(`${value}T12:00:00`);
  const [view, setView] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1, 12, 0, 0, 0));

  const { cells, month0, year } = useMemo(() => {
    const y = view.getFullYear();
    const m0 = view.getMonth();
    const first = new Date(y, m0, 1);
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m0 + 1, 0).getDate();
    const list: (number | null)[] = [];
    for (let i = 0; i < startPad; i++) list.push(null);
    for (let day = 1; day <= daysInMonth; day++) list.push(day);
    return { cells: list, month0: m0, year: y };
  }, [view]);

  return (
    <div className="rounded-app border border-panel-frame/35 bg-snow/90 p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setView((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1, 12, 0, 0, 0))}
          className="text-depths flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold hover:bg-luster"
          aria-label="Poprzedni miesiąc"
        >
          ‹
        </button>
        <p className="text-depths text-center text-[0.7rem] font-semibold capitalize">
          {monthLabelFor(todayIso(new Date(year, month0, 15)))}
        </p>
        <button
          type="button"
          onClick={() => setView((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1, 12, 0, 0, 0))}
          className="text-depths flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold hover:bg-luster"
          aria-label="Następny miesiąc"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {DAY_LABELS_NARROW.map((label) => (
          <span key={label} className="text-muted py-0.5 text-center text-[0.6rem] font-semibold uppercase">
            {label}
          </span>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <span key={`empty-${index}`} className="block h-6" aria-hidden />;
          const dateIso = todayIso(new Date(year, month0, day));
          const active = dateIso === value;
          return (
            <button
              key={dateIso}
              type="button"
              onClick={() => onChange(dateIso)}
              className={`flex h-6 items-center justify-center rounded-full text-[0.65rem] font-semibold transition ${
                active ? "bg-[#000C4A] text-lime" : "bg-luster text-depths hover:bg-jodhpur"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LessonModal({
  mode,
  draft,
  setDraft,
  students,
  activeSubjects,
  onClose,
  onSave,
  saving,
}: {
  mode: "add" | "edit";
  draft: LessonDraft;
  setDraft: Dispatch<SetStateAction<LessonDraft>>;
  students: StudentUi[];
  activeSubjects: string[];
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const eligibleStudents = useMemo(() => {
    if (!draft.subject) return [];
    return students.filter((student) => subjectsFromLine(student.subjectsLine).includes(draft.subject));
  }, [draft.subject, students]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-[#000C4A]/50" aria-label="Zamknij" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-[min(40rem,94vw)] rounded-app border-2 border-panel-frame bg-snow p-5 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-modal-title"
      >
        <h2 id="lesson-modal-title" className="text-depths text-lg font-semibold tracking-tight">
          {mode === "add" ? "Nowa lekcja" : "Edytuj lekcję"}
        </h2>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1">
            <span className="text-depths/80 text-xs font-semibold">Przedmiot</span>
            {activeSubjects.length === 0 ? (
              <p className="text-muted rounded-app bg-luster/60 px-3 py-2 text-sm">
                Brak aktywnych przedmiotów — poproś o dodanie w Profilu
              </p>
            ) : (
              <select
                className="text-depths rounded-app bg-luster px-3 py-2 text-sm"
                value={draft.subject}
                onChange={(e) => {
                  const subject = e.target.value;
                  const activeStudent = students.find((s) => s.id === draft.studentId);
                  const stillMatches = activeStudent
                    ? subjectsFromLine(activeStudent.subjectsLine).includes(subject)
                    : false;
                  setDraft((prev) => ({
                    ...prev,
                    subject,
                    studentId: stillMatches ? prev.studentId : "",
                    studentName: stillMatches ? prev.studentName : "",
                    initials: stillMatches ? prev.initials : "",
                    classLabel: stillMatches ? prev.classLabel : "",
                  }));
                }}
              >
                <option value="">Wybierz przedmiot</option>
                {activeSubjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            )}
          </label>

          <label className="grid gap-1">
            <span className="text-depths/80 text-xs font-semibold">Uczeń</span>
            <select
              className="text-depths rounded-app bg-luster px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              value={draft.studentId}
              disabled={!draft.subject}
              onChange={(e) => {
                const student = students.find((s) => s.id === e.target.value);
                setDraft((prev) => ({
                  ...prev,
                  studentId: student?.id ?? "",
                  studentName: student?.name ?? "",
                  initials: student?.initials ?? "",
                  classLabel: student?.classLabel ?? "",
                }));
              }}
            >
              <option value="">{draft.subject ? "Wybierz ucznia" : "Najpierw wybierz przedmiot"}</option>
              {eligibleStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,13rem)_1fr]">
            <div>
              <span className="text-depths/80 mb-1 block text-xs font-semibold">Dzień zajęć</span>
              <MiniCalendar value={draft.dateIso} onChange={(dateIso) => setDraft((prev) => ({ ...prev, dateIso }))} />
            </div>
            <div className="grid content-start gap-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1">
                  <span className="text-depths/80 text-xs font-semibold">Od</span>
                  <input
                    type="time"
                    className="text-depths rounded-app bg-luster px-3 py-2 text-sm tabular-nums"
                    value={draft.start}
                    onChange={(e) => setDraft((prev) => ({ ...prev, start: e.target.value }))}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-depths/80 text-xs font-semibold">Do</span>
                  <input
                    type="time"
                    className="text-depths rounded-app bg-luster px-3 py-2 text-sm tabular-nums"
                    value={draft.end}
                    onChange={(e) => setDraft((prev) => ({ ...prev, end: e.target.value }))}
                  />
                </label>
              </div>

              <div className="grid gap-2 rounded-app border border-panel-frame/35 bg-luster/45 p-3">
                <span className="text-depths/80 text-xs font-semibold">Powtarzanie</span>
                <label className="text-depths flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={draft.recurrence === "once"}
                    onChange={() => setDraft((prev) => ({ ...prev, recurrence: "once" }))}
                  />
                  Jednorazowo
                </label>
                <label className="text-depths flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={draft.recurrence === "weekly"}
                    onChange={() => setDraft((prev) => ({ ...prev, recurrence: "weekly" }))}
                  />
                  Co tydzień
                </label>
                <label className="text-depths flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={draft.recurrence === "custom"}
                    onChange={() => setDraft((prev) => ({ ...prev, recurrence: "custom" }))}
                  />
                  Własne
                </label>
                {draft.recurrence === "custom" ? (
                  <div className="grid grid-cols-4 gap-1.5 pt-1 sm:grid-cols-7">
                    {DAY_LABELS_NARROW.map((label, dayIndex) => {
                      const active = draft.selectedWeekdays.includes(dayIndex);
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() =>
                            setDraft((prev) => ({
                              ...prev,
                              selectedWeekdays: active
                                ? prev.selectedWeekdays.filter((item) => item !== dayIndex)
                                : [...prev.selectedWeekdays, dayIndex].sort((a, b) => a - b),
                            }))
                          }
                          className={`rounded-full px-1 py-1 text-[0.65rem] font-semibold leading-none ${
                            active ? "bg-[#000C4A] text-lime" : "bg-snow text-depths"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-depths/80 text-xs font-semibold">Inicjały</span>
              <input className="text-depths rounded-app bg-luster px-3 py-2 text-sm uppercase" value={draft.initials} readOnly />
            </label>
            <label className="grid gap-1">
              <span className="text-depths/80 text-xs font-semibold">Poziom ucznia</span>
              <input className="text-depths rounded-app bg-luster px-3 py-2 text-sm" value={draft.classLabel} readOnly />
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted text-xs capitalize">{formatDateChip(draft.dateIso)}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="text-depths rounded-full bg-luster px-4 py-2 text-sm font-semibold"
              onClick={onClose}
            >
              Anuluj
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-[#000C4A] px-4 py-2 text-sm font-semibold text-lime disabled:opacity-60"
              onClick={onSave}
              disabled={saving || activeSubjects.length === 0}
            >
              {saving ? <Spinner /> : null}
              {saving ? "Zapisywanie…" : "Zapisz"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TerminarzInner({
  initialLessons,
  students,
  activeSubjects,
}: {
  initialLessons: Lesson[];
  students: StudentUi[];
  activeSubjects: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const today = useMemo(() => todayIso(), []);

  useEffect(() => {
    setLessons(initialLessons);
  }, [initialLessons]);
  const [modal, setModal] = useState<{ type: "closed" } | { type: "add" } | { type: "edit"; id: string }>({
    type: "closed",
  });
  const [draft, setDraft] = useState<LessonDraft>(() => makeEmptyDraft());
  const [saving, setSaving] = useState(false);
  const [weekMondayIso, setWeekMondayIso] = useWeekMondayIso(0);
  const [listMonthKey, setListMonthKey] = useMonthKey();

  const sortedForMonth = useMemo(() => {
    return [...lessons]
      .filter((lesson) => lesson.date?.startsWith(listMonthKey))
      .sort(
        (a, b) =>
          (a.date ?? "").localeCompare(b.date ?? "") ||
          a.start.localeCompare(b.start) ||
          a.studentName.localeCompare(b.studentName),
      );
  }, [lessons, listMonthKey]);

  const monthStats = useMemo(() => {
    const counts = { planned: 0, pending: 0, verified: 0, unpaid: 0 };
    for (const lesson of sortedForMonth) {
      const s = resolveLessonStatus(lesson.status, lesson.isCompleted);
      if (s === "PLANNED") counts.planned += 1;
      else if (s === "PENDING_VERIFICATION") counts.pending += 1;
      else if (s === "VERIFIED") counts.verified += 1;
      else if (s === "UNPAID") counts.unpaid += 1;
    }
    return counts;
  }, [sortedForMonth]);

  function openAdd() {
    setDraft(makeEmptyDraft());
    setModal({ type: "add" });
  }

  function openEdit(lesson: Lesson) {
    if (lesson.date && lesson.date < today) return;
    setDraft(buildDraftFromLesson(lesson));
    setModal({ type: "edit", id: lesson.id });
  }

  function closeModal() {
    setModal({ type: "closed" });
  }

  async function saveModal() {
    if (!draft.subject || !draft.studentId || !draft.start || !draft.end || saving) return;

    setSaving(true);
    try {
      if (modal.type === "add") {
        const dates = lessonDatesFromDraft({
          dateIso: draft.dateIso,
          recurrence: draft.recurrence,
          selectedWeekdays: draft.selectedWeekdays,
        });
        await insertLessons({
          studentId: draft.studentId,
          subject: draft.subject,
          dates,
          start: draft.start,
          end: draft.end,
        });
        toast.success("Dodano lekcję", draft.subject);
      } else if (modal.type === "edit") {
        await updateLesson(modal.id, {
          studentId: draft.studentId,
          subject: draft.subject,
          date: draft.dateIso,
          start: draft.start,
          end: draft.end,
        });
        toast.success("Zapisano lekcję", draft.subject);
      }
      closeModal();
      router.refresh();
    } catch {
      toast.error("Nie udało się zapisać lekcji");
    } finally {
      setSaving(false);
    }
  }

  async function removeLesson(id: string) {
    if (!confirm("Usunąć tę lekcję z listy?")) return;
    try {
      await deleteLesson(id);
      setLessons((prev) => prev.filter((lesson) => lesson.id !== id));
      toast.success("Usunięto lekcję");
      router.refresh();
    } catch {
      toast.error("Nie udało się usunąć lekcji");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-muted max-w-2xl text-sm font-medium">
          Plan lekcji, kalendarz miesiąca i pełna lista wpisów zsynchronizowana z bazą Supabase.
        </p>
        <button
          type="button"
          className="shrink-0 rounded-full bg-[#000C4A] px-4 py-2 text-sm font-semibold text-lime"
          onClick={openAdd}
        >
          + Dodaj lekcję
        </button>
      </div>

      <div className="flex min-h-[min(280px,46svh)] flex-col lg:min-h-[min(52dvh,32rem)]">
        <WeeklySchedule
          lessons={lessons}
          hideHeader
          weekMondayIso={weekMondayIso}
          onWeekMondayIsoChange={setWeekMondayIso}
        />
      </div>

      <section className="rounded-app border-2 border-panel-frame bg-luster/50 p-4">
        <div>
          <h2 className="text-depths text-base font-semibold tracking-tight">Lista lekcji — miesiąc</h2>
          <p className="text-muted mt-0.5 text-xs capitalize">{formatMonthLongFromKey(listMonthKey)}</p>
        </div>

        <MonthNavigator monthKey={listMonthKey} onMonthKeyChange={setListMonthKey} className="mt-3" />

        <div className="mt-3 flex flex-wrap gap-2 text-[0.65rem] font-semibold">
          <span className="rounded-full bg-luster px-2 py-0.5 text-depths">{monthStats.planned} zaplanowanych</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-950">{monthStats.pending} oczekujących</span>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-900">{monthStats.verified} zatwierdzonych</span>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-900">{monthStats.unpaid} nieopłaconych</span>
        </div>

        <ul className="mt-4 flex flex-col gap-2.5">
          {sortedForMonth.length === 0 ? (
            <li className="text-muted py-6 text-center text-sm">Brak lekcji w wybranym miesiącu.</li>
          ) : (
            sortedForMonth.map((lesson) => {
              const status = resolveLessonStatus(lesson.status, lesson.isCompleted);
              const needsAction = status === "UNPAID" || status === "PLANNED";
              const isPast = Boolean(lesson.date && lesson.date < today);
              return (
                <li
                  key={lesson.id}
                  className={`flex flex-col gap-3 rounded-app border px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${
                    status === "UNPAID"
                      ? "border-red-400/60 bg-red-50"
                      : status === "PLANNED"
                        ? "border-panel-frame/30 bg-snow/95"
                        : "border-panel-frame/30 bg-snow/95"
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        status === "UNPAID" ? "bg-red-800 text-white" : "bg-[#000C4A] text-luster"
                      }`}
                    >
                      {lesson.initials}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-depths">{lesson.studentName}</p>
                        <LessonStatusBadge status={lesson.status} isCompleted={lesson.isCompleted} />
                      </div>
                      <p className="truncate text-xs text-muted">
                        {lesson.subject} · {lesson.classLabel}
                      </p>
                      <p className="text-[0.6875rem] text-muted">
                        {lesson.date ? formatLessonDatePl(lesson.date) : dayLabel(lesson.dayIndex)} · {lesson.start}–{lesson.end}
                      </p>
                      {status === "UNPAID" ? (
                        <p className="mt-1 text-[0.65rem] font-bold text-red-800">
                          Brak wpłaty od rodzica — skontaktuj się i ponów w planie tygodnia.
                        </p>
                      ) : null}
                      {needsAction && status === "PLANNED" ? (
                        <p className="text-muted mt-1 text-[0.65rem]">Po zajęciach zalicz lekcję w planie tygodnia.</p>
                      ) : null}
                      {isPast ? (
                        <p className="text-muted mt-1 text-[0.65rem]">Zajęcia zakończone — bez edycji</p>
                      ) : null}
                    </div>
                  </div>
                  {isPast ? null : (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        className="rounded-full bg-jodhpur px-3 py-1.5 text-xs font-semibold text-depths"
                        onClick={() => openEdit(lesson)}
                      >
                        Edytuj
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-panel-frame/35 bg-snow px-3 py-1.5 text-xs font-semibold text-depths"
                        onClick={() => removeLesson(lesson.id)}
                      >
                        Usuń
                      </button>
                    </div>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </section>

      {modal.type !== "closed" ? (
        <LessonModal
          mode={modal.type}
          draft={draft}
          setDraft={setDraft}
          students={students}
          activeSubjects={activeSubjects}
          onClose={closeModal}
          onSave={saveModal}
          saving={saving}
        />
      ) : null}
    </div>
  );
}

export function TerminarzPageView({
  initialLessons,
  students,
  activeSubjects,
}: {
  initialLessons: Lesson[];
  students: StudentUi[];
  activeSubjects: string[];
}) {
  return (
    <LessonCompletionProvider>
      <TerminarzInner
        initialLessons={initialLessons}
        students={students}
        activeSubjects={activeSubjects}
      />
    </LessonCompletionProvider>
  );
}
