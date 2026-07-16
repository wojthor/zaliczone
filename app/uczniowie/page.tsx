import { redirect } from "next/navigation";
import { UczniowieClient } from "@/components/uczniowie/uczniowie-client";
import { getCurrentUserProfile, getPriceTiers, getTutorStudents } from "@/lib/data/queries";

export default async function UczniowiePage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (profile.role === "ADMIN") redirect("/admin");

  const [students, priceTiers] = await Promise.all([
    getTutorStudents(profile.id),
    getPriceTiers(),
  ]);

  return (
    <UczniowieClient
      initialStudents={students}
      activeSubjects={profile.active_subjects ?? []}
      priceTiers={priceTiers}
    />
  );
}
