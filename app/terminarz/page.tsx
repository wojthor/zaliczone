import { redirect } from "next/navigation";
import { TerminarzPageView } from "@/components/terminarz/terminarz-page-view";
import {
  getCachedActiveSubjects,
  getCurrentUserProfile,
  getOpenTutorAlerts,
  getTutorLessons,
  getTutorStudents,
} from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function TerminarzPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (profile.role === "ADMIN") redirect("/admin");

  const [lessons, students, alerts, activeSubjects] = await Promise.all([
    getTutorLessons(profile.id),
    getTutorStudents(profile.id),
    getOpenTutorAlerts(profile.id),
    getCachedActiveSubjects(profile.id),
  ]);

  return (
    <TerminarzPageView
      initialLessons={lessons}
      students={students}
      activeSubjects={activeSubjects}
      alerts={alerts}
    />
  );
}
