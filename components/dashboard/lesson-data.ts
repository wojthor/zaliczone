export type Lesson = {
  id: string;
  dayIndex: number;
  /** HH:mm */
  start: string;
  /** HH:mm */
  end: string;
  subject: string;
  initials: string;
  classLabel: string;
  studentName: string;
};

const STUDENT_BY_INITIALS: Record<string, string> = {
  TK: "Tomasz Kowalski",
  AN: "Anna Nowak",
  KW: "Kuba Wiśniewski",
  ZL: "Zofia Lewandowska",
  MW: "Maria Wiśniewska",
  OL: "Oliwier Laskowski",
  EN: "Ewa Nowacka",
  PZ: "Paweł Zając",
  GR: "Grzegorz Rutkowski",
  MK: "Michał Kamiński",
  ON: "Olga Nowicka",
  JN: "Julia Nowicka",
};

function sn(initials: string): string {
  return STUDENT_BY_INITIALS[initials] ?? "Uczeń";
}

const RAW_LESSONS: Omit<Lesson, "studentName">[] = [
  { id: "1", dayIndex: 0, start: "14:30", end: "16:00", subject: "Matematyka", initials: "TK", classLabel: "kl. 4" },
  { id: "2", dayIndex: 0, start: "13:00", end: "14:30", subject: "Język polski", initials: "AN", classLabel: "kl. 6" },
  { id: "3", dayIndex: 0, start: "17:00", end: "18:30", subject: "Fizyka", initials: "KW", classLabel: "kl. 8" },
  { id: "4", dayIndex: 0, start: "16:15", end: "17:15", subject: "Język angielski", initials: "OL", classLabel: "kl. 3" },
  { id: "5", dayIndex: 1, start: "14:00", end: "15:30", subject: "Matematyka", initials: "MW", classLabel: "kl. 5" },
  { id: "6", dayIndex: 3, start: "13:30", end: "15:00", subject: "Biologia", initials: "ZL", classLabel: "kl. 6" },
  { id: "7", dayIndex: 3, start: "16:00", end: "17:30", subject: "Matematyka", initials: "TK", classLabel: "kl. 4" },
  { id: "8", dayIndex: 4, start: "09:30", end: "11:00", subject: "Język polski", initials: "AN", classLabel: "kl. 6" },
  { id: "9", dayIndex: 4, start: "11:30", end: "13:00", subject: "Fizyka", initials: "KW", classLabel: "kl. 8" },
  { id: "10", dayIndex: 4, start: "12:30", end: "14:00", subject: "Czytanie ze zrozumieniem", initials: "MK", classLabel: "kl. 3" },
  { id: "11", dayIndex: 4, start: "18:30", end: "20:00", subject: "Język angielski", initials: "ON", classLabel: "dorośli" },
  { id: "12", dayIndex: 5, start: "10:00", end: "11:30", subject: "Biologia", initials: "ZL", classLabel: "kl. 6" },
];

export const DASHBOARD_LESSONS: Lesson[] = RAW_LESSONS.map((l) => ({
  ...l,
  studentName: sn(l.initials),
}));

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
  const wd = calendarDayToMondayWeekday(year, month0, day);
  return lessonsForWeekdayMon0(wd, lessons);
}

export const DAY_LABELS_SHORT = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nie"] as const;

export function dayLabel(dayIndex: number): string {
  return DAY_LABELS_SHORT[dayIndex] ?? "—";
}
