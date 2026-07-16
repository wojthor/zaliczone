"use client";

import { useMemo, useState } from "react";
import { PanelHeader } from "@/components/panel-header";
import { lessonsOnCalendarDate, type Lesson } from "@/components/dashboard/lesson-data";
import {
  dateKeyFromYMD,
  useLessonCompletion,
} from "@/components/dashboard/lesson-completion-context";

const WEEKDAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"] as const;

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
    const allSettled = dayLessons.every((lesson) => {
      const s = lesson.status ?? (lesson.isCompleted ? "PENDING_VERIFICATION" : "PLANNED");
      return s === "VERIFIED" || s === "PENDING_VERIFICATION";
    });
    const allVerified = dayLessons.every((lesson) => (lesson.status ?? "PLANNED") === "VERIFIED");
    if (allVerified) return "done";
    if (allSettled) return "open";
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
    "flex h-[1.85rem] w-[1.85rem] shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold tabular-nums leading-none sm:h-8 sm:w-8";

  return (
    <section
      className={`flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden rounded-app border-2 border-panel-frame bg-luster px-2.5 pb-2.5 pt-1 ${className ?? ""}`}
    >
      {hideHeader ? null : <PanelHeader title="Kalendarz" compact titleHref="/terminarz" />}
      <div className="mb-2.5 flex shrink-0 justify-center px-0.5">
        <div className="flex items-center gap-0.5 rounded-app border-2 border-panel-frame bg-snow/95 px-0.5 py-0.5">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="text-depths hover:bg-luster/80 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors"
            aria-label="Poprzedni miesiąc"
          >
            ‹
          </button>
          <p className="text-depths min-w-[4.75rem] flex-1 text-center text-[0.65rem] font-semibold leading-none tabular-nums">
            {label}
          </p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="text-depths hover:bg-luster/80 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors"
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
            const isToday = year === todayY && month0 === todayM && day === todayD;
            return (
              <div key={`${year}-${month0}-${day}`} className="flex min-h-0 min-w-0 items-start justify-center px-0.5 pt-0 pb-0.5">
                {isToday ? (
                  <span
                    className={`${dayCell} border-transparent bg-lime text-depths font-bold`}
                    aria-current="date"
                  >
                    {day}
                  </span>
                ) : state === "free" ? (
                  <span
                    className={`${dayCell} border-transparent bg-snow/95 text-depths font-semibold`}
                  >
                    {day}
                  </span>
                ) : state === "done" ? (
                  <div
                    className={`${dayCell} border-transparent bg-[#000C4A] text-lime font-bold`}
                    aria-label={`Dzień ${day}, wszystkie lekcje zaliczone`}
                  >
                    {day}
                  </div>
                ) : (
                  <div
                    className={`${dayCell} border-transparent bg-panel-frame text-snow font-semibold`}
                    aria-label={`Dzień ${day}, są zaplanowane lekcje`}
                  >
                    {day}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
