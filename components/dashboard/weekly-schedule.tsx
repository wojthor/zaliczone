"use client";

import { useMemo } from "react";
import { PanelHeader } from "@/components/panel-header";
import {
  DASHBOARD_LESSONS,
  DAY_LABELS_SHORT,
  type Lesson,
} from "@/components/dashboard/lesson-data";
import {
  dateKeyFromYMD,
  mondayOfWeekContaining,
  useLessonCompletion,
} from "@/components/dashboard/lesson-completion-context";

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
};

export function WeeklySchedule({ lessons = DASHBOARD_LESSONS, hideHeader, className }: WeeklyScheduleProps) {
  const { isLessonDoneOnDate, setLessonDoneOnDate } = useLessonCompletion();
  const dateKeyByDayIndex = useMemo(() => {
    const mon = mondayOfWeekContaining(new Date());
    const out: Record<number, string> = {};
    for (let i = 0; i < 7; i++) {
      const cell = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i, 12, 0, 0, 0);
      out[i] = dateKeyFromYMD(cell.getFullYear(), cell.getMonth(), cell.getDate());
    }
    return out;
  }, []);
  const byDay = useMemo(() => {
    const map: Record<number, Lesson[]> = {};
    for (let i = 0; i < DAY_LABELS_SHORT.length; i++) {
      map[i] = [];
    }
    for (const l of lessons) {
      map[l.dayIndex].push(l);
    }
    return map;
  }, [lessons]);

  /** 0 = Pon … 6 = Nie (zgodnie z `dayIndex` w lekcjach) */
  const todayDayIndex = (new Date().getDay() + 6) % 7;

  const grid = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain [align-items:stretch] lg:grid lg:grid-cols-7 lg:grid-rows-1 lg:gap-1 lg:overflow-hidden">
      {DAY_LABELS_SHORT.map((label, dayIndex) => {
        const isToday = dayIndex === todayDayIndex;
        return (
        <div
          key={label}
          className={`flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden rounded-app border-2 bg-snow/70 lg:min-h-0 ${
            isToday ? "border-lime" : "border-transparent"
          }`}
        >
          <div className="flex shrink-0 justify-center px-1 py-1.5">
            <span
              className="text-depths text-center text-[0.65rem] font-bold leading-tight"
              aria-current={isToday ? "date" : undefined}
            >
              {label}
            </span>
          </div>
          <div className="scrollbar-panel flex min-h-0 flex-1 flex-row gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain px-1.5 pb-2 pt-0.5 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:overscroll-y-contain">
            {(byDay[dayIndex] ?? []).length === 0 ? (
              <p className="text-aster flex min-h-[4.75rem] w-full min-w-0 flex-1 items-center justify-center px-0.5 text-center text-[0.65rem] italic leading-snug lg:min-h-0">
                brak zajęć
              </p>
            ) : (
              (byDay[dayIndex] ?? []).map((lesson) => {
                const dateKey = dateKeyByDayIndex[dayIndex]!;
                const completed = isLessonDoneOnDate(lesson.id, dateKey);
                return (
                  <div
                    key={lesson.id}
                    className={`relative flex h-[7.5rem] w-[6.75rem] min-w-[6.75rem] shrink-0 flex-col overflow-hidden rounded-app p-1.5 lg:aspect-square lg:h-auto lg:w-full lg:min-w-0 lg:max-w-full ${
                      completed ? "bg-[#000C4A]" : "bg-taupe"
                    }`}
                  >
                    <div className="flex shrink-0 items-start justify-between gap-1">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold leading-none ${
                          completed ? "bg-taupe text-depths" : "bg-[#000C4A] text-luster"
                        }`}
                        aria-hidden
                      >
                        {lesson.initials}
                      </span>
                      <span
                        className={`min-w-0 pt-0.5 text-right text-[0.5625rem] font-bold tabular-nums leading-tight ${
                          completed ? "text-lime" : "text-muted"
                        }`}
                      >
                        {lesson.start}
                        <span className={completed ? "text-lime/85" : "text-muted/80"}>–</span>
                        {lesson.end}
                      </span>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col justify-center py-1">
                      <p
                        className={`line-clamp-3 text-center text-[0.625rem] font-bold leading-snug ${
                          completed ? "text-lime" : "text-depths"
                        }`}
                      >
                        {lesson.subject}
                      </p>
                      <p
                        className={`mt-0.5 text-center text-[0.5625rem] font-medium leading-tight ${
                          completed ? "text-lime/90" : "text-muted"
                        }`}
                      >
                        {lesson.classLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLessonDoneOnDate(lesson.id, dateKey, !completed)}
                      aria-pressed={completed}
                      aria-label={completed ? "Cofnij zaliczenie lekcji" : "Zalicz lekcję"}
                      className={`mt-auto flex w-full shrink-0 items-center justify-center gap-1 rounded-full py-1 text-[0.6rem] font-bold ${
                        completed ? "bg-taupe text-depths" : "bg-[#000C4A] text-lime"
                      }`}
                    >
                      {completed ? <IconCheck className="text-lime h-4 w-4 shrink-0" /> : null}
                      <span>{completed ? "Zaliczone" : "Zalicz"}</span>
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
