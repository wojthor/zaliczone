import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentUserProfile,
  getPriceTiers,
  getTutorSubjectRequests,
} from "@/lib/data/queries";
import { getTutorDriveFilesForViewer } from "@/lib/actions/drive";
import { ProfilClient } from "./profil-client";

export default async function ProfilPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (profile.role === "ADMIN") redirect("/admin");

  const supabase = await createClient();
  const [subjectRequests, driveDocuments, auth, tiers] = await Promise.all([
    getTutorSubjectRequests(profile.id),
    getTutorDriveFilesForViewer(),
    supabase.auth.getUser(),
    getPriceTiers(),
  ]);
  const user = auth.data.user;

  return (
    <ProfilClient
      profile={profile}
      email={user?.email ?? "-"}
      subjectRequests={subjectRequests}
      driveDocuments={driveDocuments}
      priceLevels={tiers.map((t) => t.label)}
    />
  );
}
