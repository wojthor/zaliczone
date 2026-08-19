"use client";

import { useMemo, useState } from "react";
import { PanelHeader } from "@/components/panel-header";
import { lessonsOnCalendarDate, type Lesson } from "@/components/dashboard/lesson-data";
import {
  dateKeyFromYMD,
  useLessonCompletion,
} from "@/components/dashboard/lesson-completion-context";

const WEEKDAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"] as const;

/** Kolory kropek = statusy lekcji */
const LESSON_DOT_COLORS = {
  PENDING_VERIFICATION: "#000C4A",
  VERIFIED: "#D5ED21",
  UNPAID: "#E23B3B",
  PLANNED: "#9AA3B8",
} as const;

function lessonDotColor(lesson: Lesson): string {
  const status = lesson.status ?? (lesson.isCompleted ? "PENDING_VERIFICATION" : "PLANNED");
  return LESSON_DOT_COLORS[status] ?? LESSON_DOT_COLORS.PLANNED;
}

function dayCompletionState(
  day: number,
  year: number,
  month0: number,
  isDone: (lessonId: string, dateKey: string) => boolean,
  lessons: Lesson[],
): "free" | "open" | "done" {
  const dk = dateKeyFromYMD(year, month0, day);
  const dayLessons = lessonsOnCalendarDate(year, month0, day, lessons);
  if (dayLessons.length === 0) return "free";

  const usesDbCompletion = dayLessons.some((lesson) => lesson.date !== undefined);
  if (usesDbCompletion) {
    const allVerified = dayLessons.every((lesson) => (lesson.status ?? "PLANNED") === "VERIFIED");
    if (allVerified) return "done";
    return "open";
  }

  const allDone = dayLessons.every((l) => isDone(l.id, dk));
  if (allDone) return "done";
  return "open";
}

type MonthlyCalendarProps = {
  lessons?: Lesson[];
  hideHeader?: boolean;
  className?: string;
};

export function MonthlyCalendar({ lessons = [], hideHeader, className }: MonthlyCalendarProps) {
  const { isLessonDoneOnDate } = useLessonCompletion();
  const [view, setView] = useState(() => new Date());

  const { year, month0, cells } = useMemo(() => {
    const y = view.getFullYear();
    const m0 = view.getMonth();
    const first = new Date(y, m0, 1);
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m0 + 1, 0).getDate();
    const list: (number | null)[] = [];
    for (let i = 0; i < startPad; i++) list.push(null);
    for (let d = 1; d <= daysInMonth; d++) list.push(d);
    return { year: y, month0: m0, cells: list };
  }, [view]);

  function shiftMonth(delta: number) {
    setView((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }

  const label = `${(month0 + 1).toString().padStart(2, "0")} · ${year}`;

  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const dayCell =
    "flex h-7 w-7 shrink-0 flex-col items-center justify-center rounded-full border border-depths/10 text-[0.65rem] font-extrabold tabular-nums leading-none sm:h-8 sm:w-8 sm:text-xs";

  return (
    <section
      className={`tutor-panel-surface flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden px-3 pb-3 pt-2 text-depths ${className ?? ""}`}
    >
      {hideHeader ? null : <PanelHeader title="Kalendarz" compact titleHref="/terminarz" />}
      <div className="mb-2.5 flex shrink-0 justify-center px-0.5">
        <div className="landing-navy flex items-center gap-0.5 rounded-app px-0.5 py-0.5">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-lime transition-colors hover:bg-white/10"
            aria-label="Poprzedni miesiąc"
          >
            ‹
          </button>
          <p className="min-w-[4.75rem] flex-1 text-center text-[0.65rem] font-semibold leading-none tabular-nums text-lime">
            {label}
          </p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-lime transition-colors hover:bg-white/10"
            aria-label="Następny miesiąc"
          >
            ›
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
        <div className="grid shrink-0 grid-cols-7 gap-1.5">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="text-depths flex min-h-8 items-center justify-center py-1.5 text-[0.6875rem] font-semibold leading-none"
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-7 content-start gap-1.5 overflow-hidden [grid-auto-rows:minmax(0,1fr)]">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`e-${i}`} className="min-h-0 min-w-0" />;
            }
            const state = dayCompletionState(day, year, month0, isLessonDoneOnDate, lessons);
            const dayLessons = lessonsOnCalendarDate(year, month0, day, lessons);
            const lessonCount = dayLessons.length;
            const isToday = year === todayY && month0 === todayM && day === todayD;
            const showDots = state === "open" && lessonCount > 0;

            return (
              <div
                key={`${year}-${month0}-${day}`}
                className="flex min-h-0 min-w-0 items-start justify-center px-0.5 pt-0 pb-0.5"
              >
                <div
                  className={`${dayCell} ${
                    isToday
                      ? "bg-lime font-extrabold text-depths"
                      : state === "done"
                        ? "landing-navy font-extrabold text-soft-lime"
                        : "bg-[#f5f8ff] text-depths"
                  }`}
                  aria-label={
                    state === "done"
                      ? `Dzień ${day}, wszystkie lekcje zatwierdzone`
                      : showDots
                        ? `Dzień ${day}, ${lessonCount} lekcji`
                        : undefined
                  }
                  aria-current={isToday ? "date" : undefined}
                >
                  <span className={showDots ? "text-[0.6rem] leading-none sm:text-[0.65rem]" : ""}>{day}</span>
                  {showDots ? (
                    <div className="mt-px flex max-w-[1.35rem] flex-wrap items-center justify-center gap-px sm:max-w-[1.5rem]" aria-hidden>
                      {dayLessons.map((lesson) => (
                        <span
                          key={lesson.id}
                          className="size-[3px] shrink-0 rounded-full sm:size-1"
                          style={{ backgroundColor: lessonDotColor(lesson) }}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
