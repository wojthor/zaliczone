export type Lesson = {
  id: string;
  /** ISO date YYYY-MM-DD */
  date?: string;
  dayIndex: number;
  /** HH:mm */
  start: string;
  /** HH:mm */
  end: string;
  subject: string;
  initials: string;
  classLabel: string;
  studentName: string;
  studentId?: string;
  status?: LessonStatus;
  isCompleted?: boolean;
  notes?: string;
  /** Wspólne ID serii cyklicznej (jeśli lekcja powstała z „co tydzień” / „własne”) */
  seriesId?: string | null;
};

export type LessonStatus = "PLANNED" | "PENDING_VERIFICATION" | "VERIFIED" | "UNPAID";

/** Poniedziałek = 0 … niedziela = 6 */
export function lessonsForWeekdayMon0(dayIndex: number, lessons: Lesson[]): Lesson[] {
  return lessons.filter((l) => l.dayIndex === dayIndex);
}

/** Dzień kalendarza (1-based) → dzień tygodnia 0–6 od pon. */
export function calendarDayToMondayWeekday(year: number, month0: number, day: number): number {
  const d = new Date(year, month0, day);
  const sun0 = d.getDay();
  return (sun0 + 6) % 7;
}

export function lessonsOnCalendarDate(year: number, month0: number, day: number, lessons: Lesson[]): Lesson[] {
  const mm = String(month0 + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const dateIso = `${year}-${mm}-${dd}`;
  const dated = lessons.filter((l) => l.date);
  if (dated.length > 0) {
    return lessons.filter((l) => l.date === dateIso);
  }
  const wd = calendarDayToMondayWeekday(year, month0, day);
  return lessonsForWeekdayMon0(wd, lessons);
}

export const DAY_LABELS_SHORT = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nie"] as const;

export function dayLabel(dayIndex: number): string {
  return DAY_LABELS_SHORT[dayIndex] ?? "-";
}
