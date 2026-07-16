import type { LessonStatus } from "@/components/dashboard/lesson-data";

export function resolveLessonStatus(
  status?: LessonStatus,
  isCompleted?: boolean,
): LessonStatus {
  if (status) return status;
  return isCompleted ? "PENDING_VERIFICATION" : "PLANNED";
}

export function lessonStatusLabel(status: LessonStatus): string {
  switch (status) {
    case "VERIFIED":
      return "Zatwierdzona";
    case "PENDING_VERIFICATION":
      return "Oczekuje weryfikacji";
    case "UNPAID":
      return "Nieopłacona";
    default:
      return "Zaplanowana";
  }
}

export function lessonStatusBadgeClasses(status: LessonStatus): string {
  switch (status) {
    case "VERIFIED":
      return "bg-green-100 text-green-900 ring-1 ring-green-600/30";
    case "PENDING_VERIFICATION":
      return "bg-amber-100 text-amber-950 ring-1 ring-amber-500/40";
    case "UNPAID":
      return "bg-red-100 text-red-900 ring-1 ring-red-600/40";
    default:
      return "bg-luster text-depths ring-1 ring-panel-frame/40";
  }
}

export function LessonStatusBadge({
  status,
  isCompleted,
  className = "",
}: {
  status?: LessonStatus;
  isCompleted?: boolean;
  className?: string;
}) {
  const resolved = resolveLessonStatus(status, isCompleted);
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide ${lessonStatusBadgeClasses(resolved)} ${className}`}
    >
      {lessonStatusLabel(resolved)}
    </span>
  );
}
