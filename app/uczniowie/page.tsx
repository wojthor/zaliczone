import { redirect } from "next/navigation";
import { UczniowieClient } from "@/components/uczniowie/uczniowie-client";
import {
  getCurrentUserProfile,
  getOpenTutorAlerts,
  getPriceTiers,
  getTutorLessons,
  getTutorStudents,
} from "@/lib/data/queries";

export default async function UczniowiePage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (profile.role === "ADMIN") redirect("/admin");

  const [students, priceTiers, alerts, lessons] = await Promise.all([
    getTutorStudents(profile.id),
    getPriceTiers(),
    getOpenTutorAlerts(profile.id),
    getTutorLessons(profile.id),
  ]);
  const activeSubjects = profile.active_subjects ?? [];

  return (
    <UczniowieClient
      initialStudents={students}
      activeSubjects={activeSubjects}
      priceTiers={priceTiers}
      alerts={alerts}
      lessons={lessons}
    />
  );
}
