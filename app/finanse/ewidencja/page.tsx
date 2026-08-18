import { redirect } from "next/navigation";
import { getCurrentUserProfile, getTutorVerifiedLessonsForMonth } from "@/lib/data/queries";
import { ewidencjaAvailableFromHint, formatMonthLongPl, isEwidencjaPdfAvailable } from "@/lib/dates";
import { EwidencjaPrintView } from "./ewidencja-print";

export default async function EwidencjaPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (profile.role === "ADMIN") redirect("/admin");

  const { month } = await searchParams;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted">Podaj miesiąc w adresie, np. /finanse/ewidencja?month=2026-06</p>
      </div>
    );
  }

  const lines = await getTutorVerifiedLessonsForMonth(profile.id, month);
  if (!isEwidencjaPdfAvailable(month) || lines.length === 0) {
    const monthLabel = formatMonthLongPl(month);
    return (
      <div className="p-8 text-center">
        <p className="text-muted">
          {lines.length === 0
            ? "Brak zatwierdzonych lekcji"
            : ewidencjaAvailableFromHint(monthLabel)}
        </p>
      </div>
    );
  }

  const tutorName = profile.full_name ?? "Korepetytor";

  return <EwidencjaPrintView month={month} tutorName={tutorName} lines={lines} />;
}
