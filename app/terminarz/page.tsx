import { redirect } from "next/navigation";
import { TerminarzPageView } from "@/components/terminarz/terminarz-page-view";
import {
  getCurrentUserProfile,
  getOpenTutorAlerts,
  getTutorLessons,
  getTutorStudents,
} from "@/lib/data/queries";
import { subjectsFromOfferings } from "@/lib/tutor-offerings";

export const dynamic = "force-dynamic";

export default async function TerminarzPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (profile.role === "ADMIN") redirect("/admin");

  const [lessons, students, alerts] = await Promise.all([
    getTutorLessons(profile.id),
    getTutorStudents(profile.id),
    getOpenTutorAlerts(profile.id),
  ]);
  const offerings = profile.active_subjects ?? [];

  return (
    <TerminarzPageView
      initialLessons={lessons}
      students={students}
      activeSubjects={subjectsFromOfferings(offerings)}
      alerts={alerts}
    />
  );
}
