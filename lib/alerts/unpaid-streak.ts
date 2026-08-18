import type { LessonStatus } from "@/lib/types/database";

const SETTLED: LessonStatus[] = ["UNPAID", "VERIFIED"];

export function hasThreeUnpaidInARow(
  lessons: Array<{ status: LessonStatus; date: string; start_time: string }>,
): boolean {
  const settled = lessons
    .filter((l) => SETTLED.includes(l.status))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
  if (settled.length < 3) return false;
  return settled.slice(-3).every((l) => l.status === "UNPAID");
}
