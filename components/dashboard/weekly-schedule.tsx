"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PanelHeader } from "@/components/panel-header";
import { WeekNavigator } from "@/components/week-navigator";
import {
  DAY_LABELS_SHORT,
  type Lesson,
  type LessonStatus,
} from "@/components/dashboard/lesson-data";
import { dateKeyFromYMD } from "@/components/dashboard/lesson-completion-context";
import {
  isIsoDateInWeek,
  mondayIsoToDate,
  toMondayIso,
} from "@/lib/date/week-utils";
import { isLessonLocked } from "@/lib/data/mappers";
import { tutorToggleLessonVerification } from "@/lib/actions/lessons";
import { Spinner, useToast } from "@/components/ui/toast";

function IconCheck(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className={props.className} aria-hidden>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type WeeklyScheduleProps = {
  lessons?: Lesson[];
  hideHeader?: boolean;
  className?: string;
  /** Poniedziałek tygodnia (YYYY-MM-DD) - tryb kontrolowany */
  weekMondayIso?: string;
  onWeekMondayIsoChange?: (weekMondayIso: string) => void;
  /** @deprecated użyj weekMondayIso */
  weekStart?: Date;
  /** @deprecated użyj onWeekMondayIsoChange */
  onWeekStartChange?: (weekStart: Date) => void;
};

function formatDayDateFromMondayIso(weekMondayIso: string, dayIndex: number): string {
  const monday = mondayIsoToDate(weekMondayIso);
  const cell = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + dayIndex, 12, 0, 0, 0);
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short" }).format(cell);
}

function lessonStatus(lesson: Lesson): LessonStatus {
  return lesson.status ?? (lesson.isCompleted ? "PENDING_VERIFICATION" : "PLANNED");
}

function tileClasses(status: LessonStatus): string {
  switch (status) {
    case "PENDING_VERIFICATION":
      return "bg-[var(--color-status-pending)]";
    case "VERIFIED":
      return "bg-[var(--color-status-verified)]";
    case "UNPAID":
      return "bg-[var(--color-status-unpaid)]";
    default:
      return "bg-[#B4BCD0]";
  }
}

function textClasses(status: LessonStatus): { primary: string; secondary: string; time: string } {
  switch (status) {
    case "PLANNED":
      return {
        primary: "text-depths",
        secondary: "text-depths/65",
        time: "text-depths",
      };
    case "VERIFIED":
      return {
        primary: "text-depths",
        secondary: "text-depths/70",
        time: "text-depths",
      };
    case "PENDING_VERIFICATION":
      return {
        primary: "text-lime",
        secondary: "text-soft-lime/85",
        time: "text-lime",
      };
    case "UNPAID":
    default:
      return {
        primary: "text-white",
        secondary: "text-white/80",
        time: "text-white",
      };
  }
}

function actionLabel(status: LessonStatus): string {
  switch (status) {
    case "VERIFIED":
      return "Zatwierdzone";
    case "PENDING_VERIFICATION":
      return "Oczekuje";
    case "UNPAID":
      return "Ponów";
    default:
      return "Zalicz";
  }
}

function actionButtonClasses(status: LessonStatus, locked: boolean): string {
  const base =
    status === "PLANNED" || status === "VERIFIED"
      ? "bg-[#000C4A]/15 text-depths"
      : "bg-white/20 text-white";
  return `${base} backdrop-blur-[1px] ${locked ? "cursor-not-allowed opacity-90" : "hover:brightness-110"}`;
}


export function WeeklySchedule({
  lessons = [],
  hideHeader,
  className,
  weekMondayIso: controlledWeekMondayIso,
  onWeekMondayIsoChange,
  weekStart: controlledWeekStart,
  onWeekStartChange,
}: WeeklyScheduleProps) {
  const router = useRouter();
  const toast = useToast();
  const [statusById, setStatusById] = useState<Record<string, LessonStatus>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [displayWeekMondayIso, setDisplayWeekMondayIso] = useState(() =>
    controlledWeekMondayIso ??
      (controlledWeekStart ? toMondayIso(controlledWeekStart) : toMondayIso(new Date())),
  );

  useEffect(() => {
    if (controlledWeekMondayIso) setDisplayWeekMondayIso(controlledWeekMondayIso);
    else if (controlledWeekStart) setDisplayWeekMondayIso(toMondayIso(controlledWeekStart));
  }, [controlledWeekMondayIso, controlledWeekStart]);

  const handleWeekChange = useCallback(
    (next: string) => {
      setDisplayWeekMondayIso(next);
      onWeekMondayIsoChange?.(next);
      onWeekStartChange?.(mondayIsoToDate(next));
    },
    [onWeekMondayIsoChange, onWeekStartChange],
  );

  const weekMondayIso = displayWeekMondayIso;

  const dateKeyByDayIndex = useMemo(() => {
    const monday = mondayIsoToDate(weekMondayIso);
    const out: Record<number, string> = {};
    for (let i = 0; i < 7; i++) {
      const cell = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 12, 0, 0, 0);
      out[i] = dateKeyFromYMD(cell.getFullYear(), cell.getMonth(), cell.getDate());
    }
    return out;
  }, [weekMondayIso]);

  const weekLessons = useMemo(
    () => lessons.filter((lesson) => lesson.date && isIsoDateInWeek(lesson.date, weekMondayIso)),
    [lessons, weekMondayIso],
  );

  const byDay = useMemo(() => {
    const map: Record<number, Lesson[]> = {};
    for (let i = 0; i < DAY_LABELS_SHORT.length; i++) {
      map[i] = [];
    }
    for (const lesson of weekLessons) {
      if (lesson.date) {
        const d = new Date(`${lesson.date}T12:00:00`);
        const dayIndex = (d.getDay() + 6) % 7;
        map[dayIndex]?.push(lesson);
      } else {
        map[lesson.dayIndex]?.push(lesson);
      }
    }
    return map;
  }, [weekLessons]);

  const todayKey = dateKeyFromYMD(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  useEffect(() => {
    setStatusById((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const lesson of lessons) {
        const server = lessonStatus(lesson);
        if (next[lesson.id] === server) {
          delete next[lesson.id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [lessons]);

  async function handleToggle(lesson: Lesson) {
    const status = statusById[lesson.id] ?? lessonStatus(lesson);
    if (isLessonLocked(status) || pendingId === lesson.id) return;
    const optimistic = status === "PLANNED" || status === "UNPAID" ? "PENDING_VERIFICATION" : "PLANNED";
    setPendingId(lesson.id);
    setStatusById((prev) => ({ ...prev, [lesson.id]: optimistic }));
    try {
      const next = await tutorToggleLessonVerification(lesson.id);
      setStatusById((prev) => ({ ...prev, [lesson.id]: next }));
      router.refresh();
    } catch (e) {
      setStatusById((prev) => {
        const copy = { ...prev };
        delete copy[lesson.id];
        return copy;
      });
      toast.error("Nie udało się zaliczyć lekcji", e instanceof Error ? e.message : "Spróbuj jeszcze raz.");
    } finally {
      setPendingId(null);
    }
  }

  const grid = (
    <>
      <WeekNavigator
        weekMondayIso={weekMondayIso}
        onWeekMondayIsoChange={handleWeekChange}
        compact
        className="mb-2 w-full shrink-0 py-1.5"
      />

      <div className="scrollbar-panel flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-y-contain [align-items:stretch] lg:grid lg:grid-cols-7 lg:grid-rows-[auto] lg:items-start lg:gap-1.5">
        {DAY_LABELS_SHORT.map((label, dayIndex) => {
          const dayKey = dateKeyByDayIndex[dayIndex]!;
          const isToday = dayKey === todayKey;
          return (
            <div
              key={dayKey}
              className={`flex min-w-0 shrink-0 flex-col overflow-hidden rounded-app lg:min-h-0 lg:h-auto ${
                isToday
                  ? "tutor-panel-surface outline-2 outline-lime -outline-offset-2"
                  : "tutor-panel-soft"
              }`}
            >
              <div className="flex shrink-0 flex-col items-center px-1 py-1.5">
                <span
                  className={`text-center text-[0.65rem] font-extrabold leading-tight text-depths`}
                  aria-current={isToday ? "date" : undefined}
                >
                  {label}
                </span>
                <span className={`text-center text-[0.6rem] font-semibold tabular-nums ${isToday ? "text-depths" : "text-muted"}`}>
                  {formatDayDateFromMondayIso(weekMondayIso, dayIndex)}
                </span>
              </div>
              <div className="flex flex-row gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain px-1.5 pb-2 pt-0.5 lg:flex-col lg:overflow-visible">
                {(byDay[dayIndex] ?? []).length === 0 ? (
                  <p className="flex min-h-[4.75rem] w-full min-w-0 flex-1 items-center justify-center px-0.5 text-center text-[0.65rem] italic leading-snug text-[#AAAAAA] lg:min-h-[4rem]">
                    brak zajęć
                  </p>
                ) : (
                  (byDay[dayIndex] ?? []).map((lesson) => {
                    const dateKey = lesson.date ?? dateKeyByDayIndex[dayIndex]!;
                    const status = statusById[lesson.id] ?? lessonStatus(lesson);
                    const locked = isLessonLocked(status);
                    const busy = pendingId === lesson.id;
                    const colors = textClasses(status);
                    const tileSizeClass =
                      "h-[7.5rem] w-[6.75rem] min-w-[6.75rem] lg:w-full lg:max-w-full";
                    return (
                      <div
                        key={`${lesson.id}-${dateKey}`}
                        className={`relative flex shrink-0 flex-col overflow-hidden rounded-app p-1.5 lg:aspect-square lg:h-auto lg:min-w-0 ${tileSizeClass} ${tileClasses(status)}`}
                      >
                        <div className="flex shrink-0 items-start justify-between gap-1">
                          <span
                            className="avatar-initials h-8 w-8 shrink-0 text-[0.65rem]"
                            aria-hidden
                          >
                            {lesson.initials}
                          </span>
                          <span className={`min-w-0 pt-0.5 text-right text-[0.5625rem] font-bold tabular-nums leading-tight ${colors.time}`}>
                            {lesson.start}
                            <span className="opacity-80">–</span>
                            {lesson.end}
                          </span>
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col justify-center py-0.5">
                          <p className={`line-clamp-2 text-center text-[0.625rem] font-bold leading-snug ${colors.primary}`}>
                            {lesson.subject}
                          </p>
                          <p className={`mt-0.5 text-center text-[0.5625rem] font-medium leading-tight ${colors.secondary}`}>
                            {lesson.classLabel}
                          </p>
                          {status === "UNPAID" ? (
                            <p className="mt-0.5 text-center text-[0.5rem] font-extrabold uppercase leading-tight text-white/90">
                              Brak wpłaty - interweniuj
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggle(lesson)}
                          disabled={locked || busy}
                          aria-pressed={status === "PENDING_VERIFICATION" || status === "VERIFIED"}
                          aria-label={
                            locked
                              ? "Lekcja zatwierdzona"
                              : status === "UNPAID"
                                ? "Ponów weryfikację wpłaty"
                                : status === "PENDING_VERIFICATION"
                                  ? "Cofnij zaliczenie"
                                  : "Zalicz lekcję"
                          }
                          className={`mt-auto flex w-full shrink-0 items-center justify-center gap-1 rounded-ledger py-1 text-[0.6rem] font-extrabold ${actionButtonClasses(status, locked)}`}
                        >
                          {busy ? (
                            <Spinner className="h-3 w-3" />
                          ) : status === "VERIFIED" || status === "PENDING_VERIFICATION" ? (
                            <IconCheck className="h-4 w-4 shrink-0" />
                          ) : null}
                          <span>{actionLabel(status)}</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <section
      className={`tutor-panel-surface flex min-h-0 min-w-0 w-full flex-1 flex-col p-3 text-depths ${className ?? ""}`}
    >
      {hideHeader ? null : <PanelHeader title="Terminarz" compact titleHref="/terminarz" />}
      {grid}
    </section>
  );
}
