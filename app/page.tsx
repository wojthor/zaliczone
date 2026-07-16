import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import {
  getCurrentUserProfile,
  getTutorCompletedFinanceLines,
  getTutorInboxMessages,
  getTutorLessons,
  getTutorStudents,
} from "@/lib/data/queries";

function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function Home() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (profile.role === "ADMIN") redirect("/admin");

  const [lessons, students, financeLines, inboxMessages] = await Promise.all([
    getTutorLessons(profile.id),
    getTutorStudents(profile.id),
    getTutorCompletedFinanceLines(profile.id),
    getTutorInboxMessages(),
  ]);

  const monthKey = currentMonthKey();
  const verifiedLessonsThisMonth = financeLines.filter(
    (line) => line.monthKey === monthKey && line.status === "VERIFIED",
  ).length;

  const totalPayout = financeLines.reduce((sum, line) => sum + line.amountPln, 0);
  const totalHours =
    Math.round(
      (financeLines.reduce((sum, line) => {
        const match = line.label.match(/(\d+)\s*min/);
        return sum + (match ? Number(match[1]) : 60);
      }, 0) /
        60) *
        10,
    ) / 10;

  return (
    <DashboardLayout
      lessons={lessons}
      students={students}
      tutorName={profile.full_name ?? "Korepetytor"}
      totalPayout={totalPayout}
      totalHours={totalHours}
      inboxMessages={inboxMessages}
      verifiedLessonsThisMonth={verifiedLessonsThisMonth}
    />
  );
}
