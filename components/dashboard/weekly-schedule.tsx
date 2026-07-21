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
  /** Poniedziałek tygodnia (YYYY-MM-DD) — tryb kontrolowany */
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
    case "VERIFIED":
      return "bg-green-800 ring-2 ring-green-600";
    case "PENDING_VERIFICATION":
      return "bg-amber-400 ring-2 ring-amber-500";
    case "UNPAID":
      return "bg-taupe ring-2 ring-red-600";
    default:
      return "bg-taupe";
  }
}

function textClasses(status: LessonStatus): { primary: string; secondary: string; time: string } {
  if (status === "VERIFIED") {
    return { primary: "text-lime", secondary: "text-lime/90", time: "text-lime" };
  }
  if (status === "PENDING_VERIFICATION") {
    return { primary: "text-depths", secondary: "text-depths/80", time: "text-depths" };
  }
  if (status === "UNPAID") {
    return { primary: "text-depths font-bold", secondary: "text-red-800 font-semibold", time: "text-red-800" };
  }
  return { primary: "text-depths", secondary: "text-muted", time: "text-muted" };
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

  async function handleToggle(lesson: Lesson) {
    const status = lessonStatus(lesson);
    if (isLessonLocked(status)) return;
    await tutorToggleLessonVerification(lesson.id, status);
    router.refresh();
  }

  const grid = (
    <>
      <WeekNavigator
        weekMondayIso={weekMondayIso}
        onWeekMondayIsoChange={handleWeekChange}
        compact
        className="mb-2 shrink-0 py-1.5"
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain [align-items:stretch] lg:grid lg:grid-cols-7 lg:grid-rows-1 lg:gap-1 lg:overflow-hidden">
        {DAY_LABELS_SHORT.map((label, dayIndex) => {
          const dayKey = dateKeyByDayIndex[dayIndex]!;
          const isToday = dayKey === todayKey;
          return (
            <div
              key={dayKey}
              className={`flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden rounded-app border-2 bg-snow/70 lg:min-h-0 ${
                isToday ? "border-lime" : "border-transparent"
              }`}
            >
              <div className="flex shrink-0 flex-col items-center px-1 py-1.5">
                <span
                  className="text-depths text-center text-[0.65rem] font-bold leading-tight"
                  aria-current={isToday ? "date" : undefined}
                >
                  {label}
                </span>
                <span className="text-muted text-center text-[0.6rem] font-semibold tabular-nums">
                  {formatDayDateFromMondayIso(weekMondayIso, dayIndex)}
                </span>
              </div>
              <div className="scrollbar-panel flex min-h-0 flex-1 flex-row gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain px-1.5 pb-2 pt-0.5 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:overscroll-y-contain">
                {(byDay[dayIndex] ?? []).length === 0 ? (
                  <p className="text-aster flex min-h-[4.75rem] w-full min-w-0 flex-1 items-center justify-center px-0.5 text-center text-[0.65rem] italic leading-snug lg:min-h-0">
                    brak zajęć
                  </p>
                ) : (
                  (byDay[dayIndex] ?? []).map((lesson) => {
                    const dateKey = lesson.date ?? dateKeyByDayIndex[dayIndex]!;
                    const status = lessonStatus(lesson);
                    const locked = isLessonLocked(status);
                    const colors = textClasses(status);
                    return (
                      <div
                        key={`${lesson.id}-${dateKey}`}
                        className={`relative flex h-[7.5rem] w-[6.75rem] min-w-[6.75rem] shrink-0 flex-col overflow-hidden rounded-app p-1.5 lg:aspect-square lg:h-auto lg:w-full lg:min-w-0 lg:max-w-full ${tileClasses(status)}`}
                      >
                        <div className="flex shrink-0 items-start justify-between gap-1">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold leading-none ${
                              status === "VERIFIED"
                                ? "bg-lime text-depths"
                                : status === "PENDING_VERIFICATION"
                                  ? "bg-depths text-lime"
                                  : "bg-[#000C4A] text-luster"
                            }`}
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
                            <p className="mt-0.5 text-center text-[0.5rem] font-black uppercase leading-tight text-red-700">
                              Brak wpłaty — interweniuj
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggle(lesson)}
                          disabled={locked}
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
                          className={`mt-auto flex w-full shrink-0 items-center justify-center gap-1 rounded-full py-1 text-[0.6rem] font-bold ${
                            locked
                              ? "cursor-not-allowed bg-green-900/40 text-lime/80"
                              : status === "PENDING_VERIFICATION"
                                ? "bg-depths text-lime"
                                : status === "UNPAID"
                                  ? "bg-red-700 text-white"
                                  : "bg-[#000C4A] text-lime"
                          }`}
                        >
                          {status === "VERIFIED" || status === "PENDING_VERIFICATION" ? (
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
      className={`flex min-h-0 min-w-0 w-full flex-1 flex-col rounded-app border-2 border-panel-frame p-2.5 ${className ?? ""}`}
    >
      {hideHeader ? null : <PanelHeader title="Terminarz" compact titleHref="/terminarz" />}
      {grid}
    </section>
  );
}
