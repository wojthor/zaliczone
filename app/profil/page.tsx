import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile, getTutorDocumentFiles, getTutorSubjectRequests } from "@/lib/data/queries";
import { ProfilClient } from "./profil-client";

export default async function ProfilPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (profile.role === "ADMIN") redirect("/admin");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [subjectRequests, adminDocuments] = await Promise.all([
    getTutorSubjectRequests(profile.id),
    getTutorDocumentFiles(profile.id),
  ]);

  return (
    <ProfilClient
      profile={profile}
      email={user?.email ?? "—"}
      subjectRequests={subjectRequests}
      adminDocuments={adminDocuments}
    />
  );
}
