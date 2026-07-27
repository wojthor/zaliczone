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

function tileClasses(_status: LessonStatus): string {
  return "bg-mist";
}

function textClasses(_status: LessonStatus): { primary: string; secondary: string; time: string } {
  return {
    primary: "text-muted",
    secondary: "text-steel",
    time: "text-muted",
  };
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

      <div className="scrollbar-panel flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-y-contain [align-items:stretch] lg:grid lg:grid-cols-7 lg:grid-rows-[auto] lg:items-start lg:gap-1.5">
        {DAY_LABELS_SHORT.map((label, dayIndex) => {
          const dayKey = dateKeyByDayIndex[dayIndex]!;
          const isToday = dayKey === todayKey;
          return (
            <div
              key={dayKey}
              className={`flex min-w-0 shrink-0 flex-col overflow-hidden rounded-app lg:min-h-0 lg:h-auto ${
                isToday ? "bg-lime px-0.5" : "card-quiet"
              }`}
            >
              <div className="flex shrink-0 flex-col items-center px-1 py-1.5">
                <span
                  className={`text-center text-[0.65rem] font-extrabold leading-tight text-depths`}
                  aria-current={isToday ? "date" : undefined}
                >
                  {label}
                </span>
                <span className={`text-center text-[0.6rem] font-semibold tabular-nums ${isToday ? "text-depths/70" : "text-muted"}`}>
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
                            <p className="mt-0.5 text-center text-[0.5rem] font-extrabold uppercase leading-tight text-steel">
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
                          className={`mt-auto flex w-full shrink-0 items-center justify-center gap-1 rounded-ledger py-1 text-[0.6rem] font-extrabold ${
                            locked
                              ? "cursor-not-allowed bg-depths/50 text-soft-lime/70"
                              : "bg-depths text-lime"
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
      className={`flex min-h-0 min-w-0 w-full flex-1 flex-col rounded-app bg-snow p-2.5 ${className ?? ""}`}
    >
      {hideHeader ? null : <PanelHeader title="Terminarz" compact titleHref="/terminarz" />}
      {grid}
    </section>
  );
}
