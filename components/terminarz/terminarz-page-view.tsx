"use client";

import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { LessonCompletionProvider } from "@/components/dashboard/lesson-completion-context";
import { MonthlyCalendar } from "@/components/dashboard/monthly-calendar";
import { WeeklySchedule } from "@/components/dashboard/weekly-schedule";
import {
  DASHBOARD_LESSONS,
  DAY_LABELS_SHORT,
  dayLabel,
  type Lesson,
} from "@/components/dashboard/lesson-data";
import { DEMO_ACTIVE_SUBJECTS, DEMO_STUDENTS } from "@/lib/demo-data";

type RecurrenceMode = "once" | "weekly" | "custom";

type LessonDraft = {
  subject: string;
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

function weekdayMon0FromIso(dateIso: string): number {
  const d = new Date(`${dateIso}T12:00:00`);
  return (d.getDay() + 6) % 7;
}

function nearestIsoForWeekday(dayIndex: number, anchor = new Date()): string {
  const base = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 12, 0, 0, 0);
  const baseDay = (base.getDay() + 6) % 7;
  const delta = dayIndex - baseDay;
  base.setDate(base.getDate() + delta);
  return todayIso(base);
}

function subjectsFromLine(subjectsLine: string): string[] {
  return subjectsLine
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function makeEmptyDraft(): LessonDraft {
  return {
    subject: "",
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
    studentName: lesson.studentName,
    initials: lesson.initials,
    classLabel: lesson.classLabel,
    dateIso: nearestIsoForWeekday(lesson.dayIndex),
    start: lesson.start,
    end: lesson.end,
    recurrence: "once",
    selectedWeekdays: [lesson.dayIndex],
    notes: lesson.notes ?? "",
  };
}

function buildLessonFromDraft(draft: LessonDraft, dayIndex: number, id: string): Lesson {
  return {
    id,
    dayIndex,
    start: draft.start,
    end: draft.end,
    subject: draft.subject,
    initials: draft.initials,
    classLabel: draft.classLabel,
    studentName: draft.studentName,
    notes: draft.notes.trim() || undefined,
  };
}

function targetWeekdays(draft: LessonDraft): number[] {
  const dateDay = weekdayMon0FromIso(draft.dateIso);
  if (draft.recurrence === "once" || draft.recurrence === "weekly") {
    return [dateDay];
  }
  return draft.selectedWeekdays.length > 0 ? draft.selectedWeekdays : [dateDay];
}

function formatDateChip(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00`);
  return new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long" }).format(d);
}

function monthLabelFor(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00`);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

function studentForName(name: string) {
  return DEMO_STUDENTS.find((student) => student.name === name) ?? null;
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
        <p className="text-depths text-center text-[0.7rem] font-semibold capitalize">{monthLabelFor(todayIso(new Date(year, month0, 15)))}</p>
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
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  draft: LessonDraft;
  setDraft: Dispatch<SetStateAction<LessonDraft>>;
  onClose: () => void;
  onSave: () => void;
}) {
  const eligibleStudents = useMemo(() => {
    if (!draft.subject) return [];
    return DEMO_STUDENTS.filter((student) => subjectsFromLine(student.subjectsLine).includes(draft.subject));
  }, [draft.subject]);

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
            <select
              className="text-depths rounded-app bg-luster px-3 py-2 text-sm"
              value={draft.subject}
              onChange={(e) => {
                const subject = e.target.value;
                const activeStudent = studentForName(draft.studentName);
                const stillMatches = activeStudent ? subjectsFromLine(activeStudent.subjectsLine).includes(subject) : false;
                setDraft((prev) => ({
                  ...prev,
                  subject,
                  studentName: stillMatches ? prev.studentName : "",
                  initials: stillMatches ? prev.initials : "",
                  classLabel: stillMatches ? prev.classLabel : "",
                }));
              }}
            >
              <option value="">Wybierz przedmiot</option>
              {DEMO_ACTIVE_SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-depths/80 text-xs font-semibold">Uczeń</span>
            <select
              className="text-depths rounded-app bg-luster px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              value={draft.studentName}
              disabled={!draft.subject}
              onChange={(e) => {
                const student = studentForName(e.target.value);
                setDraft((prev) => ({
                  ...prev,
                  studentName: student?.name ?? "",
                  initials: student?.initials ?? "",
                  classLabel: student?.classLabel ?? "",
                }));
              }}
            >
              <option value="">{draft.subject ? "Wybierz ucznia" : "Najpierw wybierz przedmiot"}</option>
              {eligibleStudents.map((student) => (
                <option key={student.id} value={student.name}>
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

          <label className="grid gap-1">
            <span className="text-depths/80 text-xs font-semibold">Notatki</span>
            <textarea
              className="text-depths min-h-24 rounded-app bg-luster px-3 py-2 text-sm"
              value={draft.notes}
              onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Np. materiały do powtórki, forma zajęć, ważne uwagi."
            />
          </label>
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
              className="rounded-full bg-[#000C4A] px-4 py-2 text-sm font-semibold text-lime"
              onClick={onSave}
            >
              Zapisz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TerminarzInner() {
  const [lessons, setLessons] = useState<Lesson[]>(() => DASHBOARD_LESSONS.map((lesson) => ({ ...lesson })));
  const [modal, setModal] = useState<{ type: "closed" } | { type: "add" } | { type: "edit"; id: string }>({
    type: "closed",
  });
  const [draft, setDraft] = useState<LessonDraft>(() => makeEmptyDraft());

  const sorted = useMemo(
    () => [...lessons].sort((a, b) => a.dayIndex - b.dayIndex || a.start.localeCompare(b.start) || a.studentName.localeCompare(b.studentName)),
    [lessons],
  );

  function openAdd() {
    setDraft(makeEmptyDraft());
    setModal({ type: "add" });
  }

  function openEdit(lesson: Lesson) {
    setDraft(buildDraftFromLesson(lesson));
    setModal({ type: "edit", id: lesson.id });
  }

  function closeModal() {
    setModal({ type: "closed" });
  }

  function saveModal() {
    if (!draft.subject || !draft.studentName || !draft.start || !draft.end) return;
    const weekdays = targetWeekdays(draft);
    if (weekdays.length === 0) return;

    if (modal.type === "add") {
      const created = weekdays.map((dayIndex, index) => buildLessonFromDraft(draft, dayIndex, `l-${Date.now()}-${index}`));
      setLessons((prev) => [...prev, ...created]);
    } else if (modal.type === "edit") {
      const [firstDay, ...otherDays] = weekdays;
      const updatedCurrent = buildLessonFromDraft(draft, firstDay!, modal.id);
      const created = otherDays.map((dayIndex, index) => buildLessonFromDraft(draft, dayIndex, `l-${Date.now()}-${index}`));
      setLessons((prev) => prev.map((lesson) => (lesson.id === modal.id ? updatedCurrent : lesson)).concat(created));
    }

    closeModal();
  }

  function removeLesson(id: string) {
    if (!confirm("Usunąć tę lekcję z listy?")) return;
    setLessons((prev) => prev.filter((lesson) => lesson.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted text-sm font-medium">
        Plan lekcji, kalendarz miesiąca i pełna lista wszystkich wpisów. Ta wersja odtwarza bogatszy formularz z późniejszej iteracji projektu.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex min-h-[min(260px,44svh)] flex-col lg:col-span-2 lg:min-h-[min(48dvh,28rem)]">
          <WeeklySchedule lessons={lessons} hideHeader />
        </div>
        <div className="flex min-h-[min(240px,40svh)] flex-col lg:min-h-[min(48dvh,28rem)]">
          <MonthlyCalendar lessons={lessons} hideHeader />
        </div>
      </div>

      <section className="rounded-app border-2 border-panel-frame bg-luster/50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-depths text-base font-semibold tracking-tight">Lista lekcji</h2>
          <button
            type="button"
            className="shrink-0 rounded-full bg-[#000C4A] px-4 py-2 text-sm font-semibold text-lime"
            onClick={openAdd}
          >
            + Dodaj lekcję
          </button>
        </div>

        <ul className="mt-4 flex flex-col gap-2.5">
          {sorted.map((lesson) => (
            <li
              key={lesson.id}
              className="flex flex-col gap-3 rounded-app border border-panel-frame/30 bg-snow/95 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#000C4A] text-sm font-bold text-luster">
                  {lesson.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-depths">{lesson.studentName}</p>
                  <p className="truncate text-xs text-muted">
                    {lesson.subject} · {lesson.classLabel}
                  </p>
                  <p className="text-[0.6875rem] text-muted">
                    {dayLabel(lesson.dayIndex)} · {lesson.start}–{lesson.end}
                    {lesson.notes ? (
                      <span className="hidden sm:inline"> {" | "} {lesson.notes}</span>
                    ) : null}
                  </p>
                  {lesson.notes ? <p className="mt-1 text-xs text-muted sm:hidden">{lesson.notes}</p> : null}
                </div>
              </div>
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
            </li>
          ))}
        </ul>
      </section>

      {modal.type !== "closed" ? (
        <LessonModal
          mode={modal.type}
          draft={draft}
          setDraft={setDraft}
          onClose={closeModal}
          onSave={saveModal}
        />
      ) : null}
    </div>
  );
}

export function TerminarzPageView() {
  return (
    <LessonCompletionProvider>
      <TerminarzInner />
    </LessonCompletionProvider>
  );
}
