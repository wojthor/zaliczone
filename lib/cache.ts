import { revalidatePath, revalidateTag, updateTag } from "next/cache";

/** Natychmiast (Zalicz, wpłata, cennik, hasło) — read-your-own-writes w Server Action. */
export function bustTag(tag: string) {
  updateTag(tag);
}

/** Chwilowa nieświeżość OK (KPI, historia). */
export function staleTag(tag: string) {
  revalidateTag(tag, "max");
}

export function lessonsTag(teacherId: string) {
  return `lessons-${teacherId}`;
}

export function studentsTag(teacherId: string) {
  return `students-${teacherId}`;
}

export function subjectsTag(teacherId: string) {
  return `subjects-${teacherId}`;
}

export function bonusTag(teacherId: string) {
  return `bonus-${teacherId}`;
}

export function financeTag(month: string) {
  return `finance-${month}`;
}

export function payoutsTag(month: string) {
  return `payouts-${month}`;
}

export function notificationsTag(teacherId: string) {
  return `notifications-${teacherId}`;
}

export function documentsTag(teacherId: string) {
  return `documents-${teacherId}`;
}

export const TAG = {
  lessons: "lessons",
  finance: "finance",
  accounting: "accounting",
  cennik: "cennik",
  notifications: "notifications",
  documents: "documents",
  dashboardStats: "dashboard-stats",
  publicTutors: "public-tutors",
} as const;

/** Lekcja zmienia godziny VERIFIED / listę zajęć — bonus liczy się z tych samych godzin. */
export function bustLessonAndBonus(teacherId: string, month?: string | null) {
  bustTag(lessonsTag(teacherId));
  bustTag(bonusTag(teacherId));
  bustTag(TAG.lessons);
  if (month) bustTag(financeTag(month));
}

export function revalidateLessonPages() {
  revalidatePath("/panel");
  revalidatePath("/terminarz");
  revalidatePath("/admin/rozliczenia");
  revalidatePath("/finanse");
}
