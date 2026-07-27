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
      return "badge-done";
    case "PENDING_VERIFICATION":
      return "badge-action";
    case "UNPAID":
      return "rounded-ledger bg-steel px-2.5 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-[0.04em] text-snow";
    default:
      return "rounded-ledger bg-mist px-2.5 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-[0.04em] text-depths";
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
    <span className={`inline-flex shrink-0 items-center ${lessonStatusBadgeClasses(resolved)} ${className}`}>
      {lessonStatusLabel(resolved)}
    </span>
  );
}
