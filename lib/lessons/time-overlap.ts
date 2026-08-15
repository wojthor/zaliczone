/** Normalizuje "15:00" / "15:00:00" → "15:00" do porównań. */
export function normalizeLessonTime(value: string): string {
  const parts = value.trim().split(":");
  const h = (parts[0] ?? "00").padStart(2, "0");
  const m = (parts[1] ?? "00").padStart(2, "0");
  return `${h}:${m}`;
}

/** Czy przedziały [start, end) nachodzą na siebie (ten sam start = konflikt). */
export function lessonTimesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const as = normalizeLessonTime(aStart);
  const ae = normalizeLessonTime(aEnd);
  const bs = normalizeLessonTime(bStart);
  const be = normalizeLessonTime(bEnd);
  return as < be && bs < ae;
}
