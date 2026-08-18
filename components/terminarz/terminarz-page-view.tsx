"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { LessonCompletionProvider } from "@/components/dashboard/lesson-completion-context";
import { WeeklySchedule } from "@/components/dashboard/weekly-schedule";
import {
  dayLabel,
  type Lesson,
  type LessonStatus,
} from "@/components/dashboard/lesson-data";
import { LessonStatusBadge, resolveLessonStatus } from "@/components/lesson/lesson-status-badge";
import { MonthNavigator, formatMonthLongFromKey, useMonthKey } from "@/components/month-navigator";
import { useWeekMondayIso } from "@/components/week-navigator";
import { Spinner, useToast } from "@/components/ui/toast";
import { subjectsFromLine } from "@/lib/data/mappers";
import { lessonDatesFromDraft } from "@/lib/data/mutations";
import { deleteLesson, deleteLessonAndRemainingInSeries, deleteLessonsByIds, insertLessons, updateLesson } from "@/lib/actions/lessons";
import { lessonTimesOverlap } from "@/lib/lessons/time-overlap";
import { AlertsBanner } from "@/components/alerts/alerts-banner";
import type { AppAlert, StudentUi } from "@/lib/types/database";

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
  /** Data końcowa cyklicznych zajęć (YYYY-MM-DD) */
  untilDateIso: string;
  notes: string;
};

const DAY_LABELS_NARROW = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"] as const;

function todayIso(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function defaultUntilFromStart(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00`);
  d.setDate(d.getDate() + 21);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function makeEmptyDraft(): LessonDraft {
  const dateIso = todayIso();
  return {
    subject: "",
    studentId: "",
    studentName: "",
    initials: "",
    classLabel: "",
    dateIso,
    start: "15:00",
    end: "16:00",
    recurrence: "once",
    selectedWeekdays: [],
    untilDateIso: defaultUntilFromStart(dateIso),
    notes: "",
  };
}

function buildDraftFromLesson(lesson: Lesson): LessonDraft {
  const dateIso = lesson.date ?? todayIso();
  return {
    subject: lesson.subject,
    studentId: lesson.studentId ?? "",
    studentName: lesson.studentName,
    initials: lesson.initials,
    classLabel: lesson.classLabel,
    dateIso,
    start: lesson.start,
    end: lesson.end,
    recurrence: "once",
    selectedWeekdays: [lesson.dayIndex],
    untilDateIso: defaultUntilFromStart(dateIso),
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
  minDateIso,
}: {
  value: string;
  onChange: (dateIso: string) => void;
  /** Daty wcześniejsze niż ta są niedostępne (YYYY-MM-DD) */
  minDateIso?: string;
}) {
  const selected = new Date(`${value}T12:00:00`);
  const [view, setView] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1, 12, 0, 0, 0));
  const minIso = minDateIso ?? todayIso();

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
          const disabled = dateIso < minIso;
          return (
            <button
              key={dateIso}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!disabled) onChange(dateIso);
              }}
              className={`flex h-6 items-center justify-center rounded-full text-[0.65rem] font-semibold transition ${
                disabled
                  ? "cursor-not-allowed text-steel/50"
                  : active
                    ? "bg-[#000C4A] text-lime"
                    : "bg-luster text-depths hover:bg-jodhpur"
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
    return students.filter(
      (student) =>
        !student.blocked &&
        subjectsFromLine(student.subjectsLine).includes(draft.subject),
    );
  }, [draft.subject, students]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-[#000C4A]/50" aria-label="Zamknij" onClick={onClose} />
      <div
        className="confirm-dialog-in relative z-10 flex max-h-[min(92dvh,40rem)] w-full max-w-[min(40rem,100%)] flex-col overflow-hidden rounded-t-app bg-snow shadow-2xl sm:max-h-[min(90dvh,40rem)] sm:max-w-[min(40rem,94vw)] sm:rounded-app"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-modal-title"
      >
        <span className="mx-auto mt-2 mb-1 block h-1 w-10 shrink-0 rounded-full bg-panel-frame/40 sm:hidden" />
        <div className="shrink-0 px-5 pt-3 sm:px-6 sm:pt-6">
          <h2 id="lesson-modal-title" className="text-depths text-lg font-semibold tracking-tight">
            {mode === "add" ? "Nowa lekcja" : "Edytuj lekcję"}
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
        <div className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-depths/80 text-xs font-semibold">Przedmiot</span>
            {activeSubjects.length === 0 ? (
              <p className="text-muted rounded-app bg-luster/60 px-3 py-2 text-sm">
                Brak aktywnych przedmiotów - poproś o dodanie w Profilu
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
              <MiniCalendar
                value={draft.dateIso}
                minDateIso={todayIso()}
                onChange={(dateIso) =>
                  setDraft((prev) => ({
                    ...prev,
                    dateIso,
                    untilDateIso:
                      prev.untilDateIso < dateIso ? defaultUntilFromStart(dateIso) : prev.untilDateIso,
                  }))
                }
              />
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
                {mode === "add" && (draft.recurrence === "weekly" || draft.recurrence === "custom") ? (
                  <label className="mt-2 grid gap-1">
                    <span className="text-depths/80 text-xs font-semibold">Powtarzaj do (włącznie)</span>
                    <input
                      type="date"
                      min={draft.dateIso}
                      className="text-depths rounded-app bg-snow px-3 py-2 text-sm"
                      value={draft.untilDateIso}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          untilDateIso: e.target.value || defaultUntilFromStart(prev.dateIso),
                        }))
                      }
                    />
                    <span className="text-muted text-[0.65rem]">
                      Powstanie{" "}
                      {
                        lessonDatesFromDraft({
                          dateIso: draft.dateIso,
                          recurrence: draft.recurrence,
                          selectedWeekdays: draft.selectedWeekdays,
                          untilDateIso: draft.untilDateIso,
                        }).length
                      }{" "}
                      lekcji w terminarzu.
                    </span>
                  </label>
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
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-panel-frame/30 bg-snow px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-5">
          <p className="text-muted text-xs capitalize">{formatDateChip(draft.dateIso)}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="text-depths rounded-full bg-luster px-4 py-2.5 text-sm font-semibold touch-manipulation"
              onClick={onClose}
            >
              Anuluj
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-[#000C4A] px-4 py-2.5 text-sm font-semibold text-lime disabled:opacity-60 touch-manipulation"
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
  alerts,
}: {
  initialLessons: Lesson[];
  students: StudentUi[];
  activeSubjects: string[];
  alerts: AppAlert[];
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
  const [deleteTarget, setDeleteTarget] = useState<Lesson | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [weekMondayIso, setWeekMondayIso] = useWeekMondayIso(0);
  const [listMonthKey, setListMonthKey] = useMonthKey();
  const [listSearch, setListSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LessonStatus>("all");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [sortMode, setSortMode] = useState<"dateAsc" | "dateDesc" | "studentAz" | "studentZa" | "status">("dateAsc");

  const lessonsMatchingSearch = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return lessons;
    return lessons.filter((lesson) => {
      const hay = `${lesson.studentName} ${lesson.subject} ${lesson.classLabel} ${lesson.initials}`.toLowerCase();
      return hay.includes(q);
    });
  }, [lessons, listSearch]);

  const sortedForMonth = useMemo(() => {
    return [...lessonsMatchingSearch]
      .filter((lesson) => lesson.date?.startsWith(listMonthKey))
      .sort(
        (a, b) =>
          (a.date ?? "").localeCompare(b.date ?? "") ||
          a.start.localeCompare(b.start) ||
          a.studentName.localeCompare(b.studentName, "pl"),
      );
  }, [lessonsMatchingSearch, listMonthKey]);

  const monthStats = useMemo(() => {
    const monthLessons = lessons.filter((lesson) => lesson.date?.startsWith(listMonthKey));
    const counts = { planned: 0, pending: 0, verified: 0, unpaid: 0 };
    for (const lesson of monthLessons) {
      const s = resolveLessonStatus(lesson.status, lesson.isCompleted);
      if (s === "PLANNED") counts.planned += 1;
      else if (s === "PENDING_VERIFICATION") counts.pending += 1;
      else if (s === "VERIFIED") counts.verified += 1;
      else if (s === "UNPAID") counts.unpaid += 1;
    }
    return counts;
  }, [lessons, listMonthKey]);

  const subjectOptions = useMemo(() => {
    const set = new Set<string>();
    for (const lesson of lessons) {
      if (lesson.date?.startsWith(listMonthKey) && lesson.subject) set.add(lesson.subject);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "pl"));
  }, [lessons, listMonthKey]);

  const filteredForMonth = useMemo(() => {
    const filtered = sortedForMonth.filter((lesson) => {
      const status = resolveLessonStatus(lesson.status, lesson.isCompleted);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (subjectFilter && lesson.subject !== subjectFilter) return false;
      return true;
    });

    const statusOrder: Record<LessonStatus, number> = {
      UNPAID: 0,
      PLANNED: 1,
      PENDING_VERIFICATION: 2,
      VERIFIED: 3,
    };

    return [...filtered].sort((a, b) => {
      if (sortMode === "studentAz" || sortMode === "studentZa") {
        const cmp = a.studentName.localeCompare(b.studentName, "pl");
        return sortMode === "studentAz" ? cmp : -cmp;
      }
      if (sortMode === "status") {
        const sa = resolveLessonStatus(a.status, a.isCompleted);
        const sb = resolveLessonStatus(b.status, b.isCompleted);
        const cmp = statusOrder[sa] - statusOrder[sb];
        if (cmp !== 0) return cmp;
      }
      const dateCmp = (a.date ?? "").localeCompare(b.date ?? "") || a.start.localeCompare(b.start);
      if (sortMode === "dateDesc") return -dateCmp || a.studentName.localeCompare(b.studentName, "pl");
      return dateCmp || a.studentName.localeCompare(b.studentName, "pl");
    });
  }, [sortedForMonth, statusFilter, subjectFilter, sortMode]);

  function openAdd() {
    setDraft(makeEmptyDraft());
    setModal({ type: "add" });
  }

  function openEdit(lesson: Lesson) {
    if (lesson.date && lesson.date < today) return;
    const status = resolveLessonStatus(lesson.status, lesson.isCompleted);
    if (status !== "PLANNED") {
      toast.error("Brak edycji", "Możesz edytować tylko lekcje ze statusem zaplanowana.");
      return;
    }
    setDraft(buildDraftFromLesson(lesson));
    setModal({ type: "edit", id: lesson.id });
  }

  function closeModal() {
    setModal({ type: "closed" });
  }

  async function saveModal() {
    if (!draft.subject || !draft.studentId || !draft.start || !draft.end || saving) return;

    if (draft.start >= draft.end) {
      toast.error("Niepoprawne godziny", "Godzina „Do” musi być późniejsza niż „Od”.");
      return;
    }

    const candidateDates =
      modal.type === "add"
        ? lessonDatesFromDraft({
            dateIso: draft.dateIso,
            recurrence: draft.recurrence,
            selectedWeekdays: draft.selectedWeekdays,
            untilDateIso: draft.untilDateIso,
          })
        : [draft.dateIso];

    const minDay = today;
    const pastDate = candidateDates.find((d) => d < minDay);
    if (pastDate) {
      toast.error("Data w przeszłości", "Nie możesz dodawać ani przenosić lekcji na dzień wcześniejszy niż dziś.");
      return;
    }

    const conflict = lessons.find((lesson) => {
      if (modal.type === "edit" && lesson.id === modal.id) return false;
      if (!lesson.date || !candidateDates.includes(lesson.date)) return false;
      return lessonTimesOverlap(draft.start, draft.end, lesson.start, lesson.end);
    });

    if (conflict) {
      toast.error(
        "Termin zajęty",
        `Masz już lekcję ${conflict.date} o ${conflict.start}. Wybierz inną godzinę tego dnia.`,
      );
      return;
    }

    setSaving(true);
    try {
      if (modal.type === "add") {
        await insertLessons({
          studentId: draft.studentId,
          subject: draft.subject,
          dates: candidateDates,
          start: draft.start,
          end: draft.end,
        });
        toast.success(
          candidateDates.length > 1 ? `Dodano ${candidateDates.length} lekcji` : "Dodano lekcję",
          draft.subject,
        );
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
    } catch (e) {
      toast.error(
        "Nie udało się zapisać lekcji",
        e instanceof Error ? e.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(mode: "one" | "series") {
    if (!deleteTarget || deleteBusy) return;
    setDeleteBusy(true);
    try {
      if (mode === "series") {
        let deleted = 0;
        if (deleteTarget.seriesId) {
          const result = await deleteLessonAndRemainingInSeries(deleteTarget.id);
          deleted = result.deleted;
          setLessons((prev) => {
            if (!deleteTarget.seriesId || !deleteTarget.date) {
              return prev.filter((l) => l.id !== deleteTarget.id);
            }
            return prev.filter(
              (l) =>
                !(
                  l.seriesId === deleteTarget.seriesId &&
                  l.date &&
                  deleteTarget.date &&
                  l.date >= deleteTarget.date &&
                  resolveLessonStatus(l.status, l.isCompleted) === "PLANNED"
                ),
            );
          });
        } else {
          const ids = remainingInSeries(deleteTarget).map((l) => l.id);
          const result = await deleteLessonsByIds(ids);
          deleted = result.deleted;
          const idSet = new Set(ids);
          setLessons((prev) => prev.filter((l) => !idSet.has(l.id)));
        }
        toast.success(deleted > 1 ? `Usunięto ${deleted} lekcji z serii` : "Usunięto lekcję");
      } else {
        await deleteLesson(deleteTarget.id);
        setLessons((prev) => prev.filter((lesson) => lesson.id !== deleteTarget.id));
        toast.success("Usunięto lekcję");
      }
      setDeleteTarget(null);
      router.refresh();
    } catch (e) {
      toast.error(
        "Nie udało się usunąć lekcji",
        e instanceof Error ? e.message : undefined,
      );
    } finally {
      setDeleteBusy(false);
    }
  }

  function remainingInSeries(lesson: Lesson): Lesson[] {
    const sameSeries = (() => {
      if (!lesson.date) return [lesson];
      if (lesson.seriesId) {
        return lessons.filter(
          (l) => l.seriesId === lesson.seriesId && l.date && l.date >= lesson.date!,
        );
      }
      return lessons.filter(
        (l) =>
          l.studentId === lesson.studentId &&
          l.subject === lesson.subject &&
          l.start === lesson.start &&
          l.end === lesson.end &&
          l.dayIndex === lesson.dayIndex &&
          l.date &&
          l.date >= lesson.date!,
      );
    })();
    return sameSeries.filter((l) => resolveLessonStatus(l.status, l.isCompleted) === "PLANNED");
  }

  async function removeLesson(lesson: Lesson) {
    const status = resolveLessonStatus(lesson.status, lesson.isCompleted);
    if (status !== "PLANNED") {
      toast.error("Brak usuwania", "Możesz usuwać tylko lekcje ze statusem zaplanowana.");
      return;
    }
    const remaining = remainingInSeries(lesson);
    if (remaining.length > 1) {
      setDeleteTarget(lesson);
      return;
    }
    if (!confirm("Usunąć tę lekcję z listy?")) return;
    try {
      await deleteLesson(lesson.id);
      setLessons((prev) => prev.filter((item) => item.id !== lesson.id));
      toast.success("Usunięto lekcję");
      router.refresh();
    } catch (e) {
      toast.error(
        "Nie udało się usunąć lekcji",
        e instanceof Error ? e.message : undefined,
      );
    }
  }

  return (
    <PageShell
      title="Terminarz"
      titleAside={
        <input
          type="search"
          value={listSearch}
          onChange={(e) => setListSearch(e.target.value)}
          placeholder="Szukaj…"
          className="text-depths w-[11rem] rounded-full border border-panel-frame/50 bg-luster/80 py-1.5 pl-3 pr-3 text-xs outline-none placeholder:text-muted focus:border-[#000C4A]/50 sm:w-[13rem]"
          aria-label="Szukaj lekcji"
        />
      }
    >
      <div className="flex flex-col gap-6">
      {alerts.length > 0 ? <AlertsBanner alerts={alerts} role="TUTOR" /> : null}
      <p className="text-muted max-w-2xl text-sm font-medium">
        Plan lekcji, kalendarz miesiąca i pełna lista zajęć - wszystko zapisuje się na bieżąco.
      </p>

      <section className="card-quiet p-3 sm:p-4">
        <p className="section-label mb-3">Status w miesiącu</p>
        <div className="flex flex-wrap items-center gap-2 text-[0.65rem] font-semibold">
          <span className="text-muted mr-1 text-[0.65rem] font-medium capitalize">
            {formatMonthLongFromKey(listMonthKey)}:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === "PLANNED" ? "all" : "PLANNED"))}
            className={`rounded-ledger px-2.5 py-1 transition ${
              statusFilter === "PLANNED" ? "ring-2 ring-depths/30" : ""
            } badge-planned`}
          >
            {monthStats.planned} zaplanowanych
          </button>
          <button
            type="button"
            onClick={() =>
              setStatusFilter((prev) => (prev === "PENDING_VERIFICATION" ? "all" : "PENDING_VERIFICATION"))
            }
            className={`rounded-ledger px-2.5 py-1 transition ${
              statusFilter === "PENDING_VERIFICATION" ? "ring-2 ring-[var(--color-status-pending)]/40" : ""
            } badge-action`}
          >
            {monthStats.pending} oczekujących
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === "VERIFIED" ? "all" : "VERIFIED"))}
            className={`rounded-ledger px-2.5 py-1 transition ${
              statusFilter === "VERIFIED" ? "ring-2 ring-[var(--color-status-verified)]/40" : ""
            } badge-done`}
          >
            {monthStats.verified} zatwierdzonych
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter((prev) => (prev === "UNPAID" ? "all" : "UNPAID"))}
            className={`rounded-ledger px-2.5 py-1 transition ${
              statusFilter === "UNPAID" ? "ring-2 ring-[var(--color-status-unpaid)]/40" : ""
            } badge-unpaid`}
          >
            {monthStats.unpaid} nieopłaconych
          </button>
        </div>
      </section>

      <section className="flex min-h-[min(280px,46svh)] flex-col gap-3 rounded-app bg-paper p-3 sm:p-4 lg:min-h-[min(52dvh,32rem)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-depths text-base font-extrabold tracking-tight">Plan tygodnia</h2>
          <button
            type="button"
            className="shrink-0 rounded-full bg-[#000C4A] px-4 py-2 text-sm font-semibold text-lime"
            onClick={openAdd}
          >
            + Dodaj lekcję
          </button>
        </div>
        <WeeklySchedule
          lessons={lessonsMatchingSearch}
          hideHeader
          weekMondayIso={weekMondayIso}
          onWeekMondayIsoChange={setWeekMondayIso}
        />
      </section>

      <section className="rounded-app bg-paper p-4">
        <div>
          <h2 className="text-depths text-base font-extrabold tracking-tight">Lista lekcji - miesiąc</h2>
          <p className="text-muted mt-0.5 text-xs capitalize">{formatMonthLongFromKey(listMonthKey)}</p>
        </div>

        <MonthNavigator monthKey={listMonthKey} onMonthKeyChange={setListMonthKey} className="mt-3" />

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-depths/80 text-[0.65rem] font-semibold">Sortowanie</span>
            <select
              className="text-depths rounded-app border border-panel-frame/35 bg-snow px-3 py-2 text-sm"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
              aria-label="Sortowanie listy"
            >
              <option value="dateAsc">Data · od najwcześniejszej</option>
              <option value="dateDesc">Data · od najpóźniejszej</option>
              <option value="studentAz">Uczeń · A–Z</option>
              <option value="studentZa">Uczeń · Z–A</option>
              <option value="status">Status</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-depths/80 text-[0.65rem] font-semibold">Przedmiot</span>
            <select
              className="text-depths rounded-app border border-panel-frame/35 bg-snow px-3 py-2 text-sm"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              aria-label="Filtr przedmiotu"
            >
              <option value="">Wszystkie</option>
              {subjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </label>
        </div>

        {(listSearch.trim() || statusFilter !== "all" || subjectFilter) && (
          <p className="text-muted mt-2 text-[0.65rem]">
            Wyniki: {filteredForMonth.length}
            {" · "}
            <button
              type="button"
              className="font-semibold text-depths underline-offset-2 hover:underline"
              onClick={() => {
                setListSearch("");
                setStatusFilter("all");
                setSubjectFilter("");
              }}
            >
              Wyczyść filtry
            </button>
          </p>
        )}

        <ul className="mt-4 flex flex-col gap-2">
          {filteredForMonth.length === 0 ? (
            <li className="text-muted py-6 text-center text-sm">
              {sortedForMonth.length === 0 && !listSearch.trim()
                ? "Brak lekcji w wybranym miesiącu."
                : "Brak lekcji pasujących do wyszukiwania / filtrów."}
            </li>
          ) : (
            filteredForMonth.map((lesson) => {
              const status = resolveLessonStatus(lesson.status, lesson.isCompleted);
              const needsAction = status === "UNPAID" || status === "PLANNED";
              const isPast = Boolean(lesson.date && lesson.date < today);
              const canEdit = !isPast && status === "PLANNED";
              const canDelete = !isPast && status === "PLANNED";
              return (
                <li
                  key={lesson.id}
                  className="flex flex-col gap-3 rounded-app bg-snow px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="avatar-initials h-10 w-10 shrink-0 text-sm">
                      {lesson.initials}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-extrabold text-depths">
                          {lesson.studentName}
                        </p>
                        <LessonStatusBadge status={lesson.status} isCompleted={lesson.isCompleted} />
                      </div>
                      <p className="truncate text-xs text-muted">
                        {lesson.subject} · {lesson.classLabel}
                      </p>
                      <p className="text-[0.6875rem] text-muted">
                        {lesson.date ? formatLessonDatePl(lesson.date) : dayLabel(lesson.dayIndex)} ·{" "}
                        {lesson.start}–{lesson.end}
                      </p>
                      {status === "UNPAID" ? (
                        <p className="mt-1 text-[0.65rem] font-bold text-depths">
                          Brak wpłaty od rodzica - skontaktuj się i ponów w planie tygodnia.
                        </p>
                      ) : null}
                      {needsAction && status === "PLANNED" ? (
                        <p className="text-muted mt-1 text-[0.65rem]">
                          Po zajęciach zalicz lekcję w planie tygodnia.
                        </p>
                      ) : null}
                      {isPast ? (
                        <p className="text-muted mt-1 text-[0.65rem]">Zajęcia zakończone - bez edycji</p>
                      ) : status !== "PLANNED" ? (
                        <p className="text-muted mt-1 text-[0.65rem]">
                          Edycja i usuwanie tylko dla lekcji zaplanowanych
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {canEdit || canDelete ? (
                    <div className="flex shrink-0 gap-2">
                      {canEdit ? (
                        <button
                          type="button"
                          className="rounded-full bg-jodhpur px-3 py-1.5 text-xs font-semibold text-depths"
                          onClick={() => openEdit(lesson)}
                        >
                          Edytuj
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          className="rounded-full border border-panel-frame/35 bg-snow px-3 py-1.5 text-xs font-semibold text-depths"
                          onClick={() => removeLesson(lesson)}
                        >
                          Usuń
                        </button>
                      ) : null}
                    </div>
                  ) : null}
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

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[#000C4A]/50"
            aria-label="Anuluj"
            onClick={() => !deleteBusy && setDeleteTarget(null)}
          />
          <div
            className="confirm-dialog-in relative z-10 flex max-h-[min(92dvh,32rem)] w-full max-w-md flex-col overflow-hidden rounded-t-app bg-snow shadow-2xl sm:rounded-app"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-lesson-title"
          >
            <span className="mx-auto mt-2 mb-1 block h-1 w-10 shrink-0 rounded-full bg-panel-frame/40 sm:hidden" />
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3 sm:p-6">
              <h2 id="delete-lesson-title" className="text-depths text-lg font-semibold tracking-tight">
                Usuń lekcję cykliczną
              </h2>
              <p className="text-muted mt-2 text-sm leading-relaxed">
                Ta lekcja należy do serii ({remainingInSeries(deleteTarget).length} pozostałych od{" "}
                {deleteTarget.date ? formatLessonDatePl(deleteTarget.date) : "tej daty"}). Co chcesz
                zrobić?
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 border-t border-panel-frame/30 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-5">
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => confirmDelete("one")}
                className="rounded-full bg-[#000C4A] px-4 py-2.5 text-sm font-semibold text-lime disabled:opacity-60 touch-manipulation"
              >
                {deleteBusy ? "Usuwanie…" : "Usuń tylko tę lekcję"}
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => confirmDelete("series")}
                className="rounded-full border border-claret/40 bg-claret/10 px-4 py-2.5 text-sm font-semibold text-claret disabled:opacity-60 touch-manipulation"
              >
                Usuń tę i wszystkie pozostałe
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => setDeleteTarget(null)}
                className="rounded-full bg-luster px-4 py-2.5 text-sm font-semibold text-depths disabled:opacity-60 touch-manipulation"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </PageShell>
  );
}

export function TerminarzPageView({
  initialLessons,
  students,
  activeSubjects,
  alerts = [],
}: {
  initialLessons: Lesson[];
  students: StudentUi[];
  activeSubjects: string[];
  alerts?: AppAlert[];
}) {
  return (
    <LessonCompletionProvider>
      <TerminarzInner
        initialLessons={initialLessons}
        students={students}
        activeSubjects={activeSubjects}
        alerts={alerts}
      />
    </LessonCompletionProvider>
  );
}
