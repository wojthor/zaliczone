import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import {
  financeLinesHours,
  lessonDurationMinutes,
  sumTutorPayoutFromCennik,
} from "@/lib/data/mappers";
import { TUTOR_SHARE, bonusProgress } from "@/lib/dates";
import {
  getCurrentUserProfile,
  getPriceTiers,
  getTutorVerifiedFinanceLines,
  getTutorLessons,
  getTutorStudents,
} from "@/lib/data/queries";

export const dynamic = "force-dynamic";

function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function Home() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (profile.role === "ADMIN") redirect("/admin");

  const [lessons, students, financeLines, priceTiers] = await Promise.all([
    getTutorLessons(profile.id),
    getTutorStudents(profile.id),
    getTutorVerifiedFinanceLines(profile.id),
    getPriceTiers(),
  ]);

  const monthKey = currentMonthKey();
  const verifiedThisMonth = financeLines.filter((line) => line.monthKey === monthKey);
  const monthHours = financeLinesHours(verifiedThisMonth);
  const lessonsPayout = sumTutorPayoutFromCennik(verifiedThisMonth, priceTiers, TUTOR_SHARE);
  const bonus = bonusProgress(monthHours);
  const totalPayout =
    Math.round((lessonsPayout + (bonus.achieved ? bonus.bonusPln : 0)) * 100) / 100;

  const totalMinutes = lessons.reduce(
    (sum, lesson) => sum + lessonDurationMinutes(lesson.start, lesson.end),
    0,
  );
  const lessonStats = {
    total: lessons.length,
    pending: lessons.filter((l) => l.status === "PENDING_VERIFICATION").length,
    verified: lessons.filter((l) => l.status === "VERIFIED").length,
    unpaid: lessons.filter((l) => l.status === "UNPAID").length,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
  };

  return (
    <DashboardLayout
      lessons={lessons}
      students={students}
      tutorName={profile.full_name ?? "Korepetytor"}
      totalPayout={totalPayout}
      lessonStats={lessonStats}
      verifiedHoursThisMonth={monthHours}
    />
  );
}
