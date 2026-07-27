import type { Lesson } from "@/components/dashboard/lesson-data";
import type {
  DbLesson,
  DbLessonWithRelations,
  DbStudent,
  FinanceLineUi,
  LessonStatus,
  StudentUi,
} from "@/lib/types/database";

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NN";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function formatTimeHHmm(time: string): string {
  return time.slice(0, 5);
}

export function dayIndexFromIsoDate(dateIso: string): number {
  const d = new Date(`${dateIso}T12:00:00`);
  return (d.getDay() + 6) % 7;
}

export function formatDateDdMm(dateIso: string): string {
  const [, month, day] = dateIso.split("-");
  return `${day}.${month}`;
}

export function monthKeyFromIsoDate(dateIso: string): string {
  const [year, month] = dateIso.split("-");
  return `${year}-${month}`;
}

export function lessonDurationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.slice(0, 5).split(":").map(Number);
  const [eh, em] = endTime.slice(0, 5).split(":").map(Number);
  return (eh! * 60 + em!) - (sh! * 60 + sm!);
}

export function lessonAmountPln(ratePln: number, startTime: string, endTime: string): number {
  const minutes = lessonDurationMinutes(startTime, endTime);
  return Math.round((ratePln * minutes) / 60);
}

/** Wypłata tutora za lekcję wg stawki z cennika (`worker_rate_pln` × godziny). */
export function tutorPayoutFromCennik(
  line: Pick<FinanceLineUi, "classLevel" | "durationMinutes" | "label" | "amountPln">,
  tiers: { label: string; worker_rate_pln: number }[],
  fallbackShare = 0.7,
): number {
  const minutes =
    line.durationMinutes > 0
      ? line.durationMinutes
      : (() => {
          const match = line.label.match(/(\d+)\s*min/);
          return match ? Number(match[1]) : 60;
        })();
  const hours = minutes / 60;
  const level = (line.classLevel ?? "").trim().toLowerCase();
  const tier = level
    ? tiers.find((t) => t.label.trim().toLowerCase() === level)
    : undefined;
  if (tier) {
    return Math.round(Number(tier.worker_rate_pln) * hours * 100) / 100;
  }
  return Math.round(line.amountPln * fallbackShare * 100) / 100;
}

export function sumTutorPayoutFromCennik(
  lines: Pick<FinanceLineUi, "classLevel" | "durationMinutes" | "label" | "amountPln">[],
  tiers: { label: string; worker_rate_pln: number }[],
  fallbackShare = 0.7,
): number {
  return Math.round(lines.reduce((sum, line) => sum + tutorPayoutFromCennik(line, tiers, fallbackShare), 0) * 100) / 100;
}

/** Godziny z linii finansowych (VERIFIED). */
export function financeLinesHours(
  lines: Pick<FinanceLineUi, "durationMinutes" | "label">[],
): number {
  const minutes = lines.reduce((sum, line) => {
    if (line.durationMinutes > 0) return sum + line.durationMinutes;
    const match = line.label.match(/(\d+)\s*min/);
    return sum + (match ? Number(match[1]) : 60);
  }, 0);
  return Math.round((minutes / 60) * 10) / 10;
}

export function isLessonLocked(status: LessonStatus): boolean {
  return status === "VERIFIED";
}

export function isLessonPending(status: LessonStatus): boolean {
  return status === "PENDING_VERIFICATION";
}

export function isLessonUnpaid(status: LessonStatus): boolean {
  return status === "UNPAID";
}

export function dbStudentToUi(
  student: DbStudent,
  nextLessonLabel = "Brak zaplanowanej lekcji",
): StudentUi {
  return {
    id: student.id,
    name: student.name,
    initials: initialsFromName(student.name),
    subjectsLine: student.subjects.join(", "),
    phone: "—",
    email: "—",
    guardian: "Rodzic / opiekun",
    classLabel: student.class_level,
    schoolClass: "—",
    notes: "—",
    ratePerHourPln: Number(student.rate_pln),
    nextLesson: nextLessonLabel,
    createdAtTs: new Date(student.created_at).getTime(),
  };
}

export function dbLessonToUi(
  lesson: DbLesson,
  student: Pick<DbStudent, "name" | "class_level">,
): Lesson {
  return {
    id: lesson.id,
    date: lesson.date,
    dayIndex: dayIndexFromIsoDate(lesson.date),
    start: formatTimeHHmm(lesson.start_time),
    end: formatTimeHHmm(lesson.end_time),
    subject: lesson.subject,
    initials: initialsFromName(student.name),
    classLabel: student.class_level,
    studentName: student.name,
    studentId: lesson.student_id,
    status: lesson.status,
    isCompleted: lesson.status === "VERIFIED" || lesson.status === "PENDING_VERIFICATION",
    seriesId: lesson.series_id ?? null,
  };
}

export function dbLessonToFinanceLine(row: DbLessonWithRelations): FinanceLineUi | null {
  const student = row.students;
  if (!student) return null;

  const minutes = lessonDurationMinutes(row.start_time, row.end_time);
  const amountPln = lessonAmountPln(Number(student.rate_pln), row.start_time, row.end_time);

  return {
    id: row.id,
    studentName: student.name,
    studentId: row.student_id,
    classLevel: student.class_level ?? null,
    label: `${row.subject} · ${minutes} min`,
    amountPln,
    durationMinutes: minutes,
    date: formatDateDdMm(row.date),
    dateIso: row.date,
    monthKey: monthKeyFromIsoDate(row.date),
    status: row.status,
    tutorId: row.tutor_id,
    tutorName: row.profiles?.full_name ?? "Nieprzypisany",
    subject: row.subject,
    paymentReceivedAt: row.payment_received_at ? formatDateDdMm(row.payment_received_at) : null,
    paymentReceivedAtIso: row.payment_received_at ?? null,
    paymentMethod: row.payment_method ?? null,
  };
}

export function subjectsFromLine(subjectsLine: string): string[] {
  return subjectsLine
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function mondayOfWeekContaining(ref: Date): Date {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const d = ref.getDate();
  const noon = new Date(y, m, d, 12, 0, 0, 0);
  const offset = (noon.getDay() + 6) % 7;
  noon.setDate(noon.getDate() - offset);
  return noon;
}

export function dateIsoFromYMD(year: number, month0: number, day: number): string {
  const mm = String(month0 + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function dateForWeekdayInWeekContaining(anchorIso: string, dayIndex: number): string {
  const mon = mondayOfWeekContaining(new Date(`${anchorIso}T12:00:00`));
  const cell = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + dayIndex, 12, 0, 0, 0);
  return dateIsoFromYMD(cell.getFullYear(), cell.getMonth(), cell.getDate());
}

export function nextLessonLabelForStudent(studentId: string, lessons: DbLesson[]): string {
  const today = dateIsoFromYMD(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  );
  const upcoming = lessons
    .filter(
      (l) =>
        l.student_id === studentId &&
        l.status === "PLANNED" &&
        l.date >= today,
    )
    .sort((a, b) => `${a.date}${a.start_time}`.localeCompare(`${b.date}${b.start_time}`))[0];

  if (!upcoming) return "Brak zaplanowanej lekcji";

  const d = new Date(`${upcoming.date}T12:00:00`);
  const day = new Intl.DateTimeFormat("pl-PL", { weekday: "long" }).format(d);
  return `${day} ${formatTimeHHmm(upcoming.start_time)} · ${upcoming.subject}`;
}
