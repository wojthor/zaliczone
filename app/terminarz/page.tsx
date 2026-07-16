import { redirect } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { TerminarzPageView } from "@/components/terminarz/terminarz-page-view";
import { getCurrentUserProfile, getTutorLessons, getTutorStudents } from "@/lib/data/queries";

export default async function TerminarzPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (profile.role === "ADMIN") redirect("/admin");

  const [lessons, students] = await Promise.all([
    getTutorLessons(profile.id),
    getTutorStudents(profile.id),
  ]);

  return (
    <PageShell title="Terminarz">
      <TerminarzPageView
        initialLessons={lessons}
        students={students}
        activeSubjects={profile.active_subjects ?? []}
      />
    </PageShell>
  );
}
