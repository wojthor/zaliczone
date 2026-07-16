import { PowiadomieniaAdminClient } from "./powiadomienia-admin-client";
import { getAllTutorProfiles } from "@/lib/data/queries";

export default async function AdminPowiadomieniaPage() {
  const tutors = await getAllTutorProfiles();
  return <PowiadomieniaAdminClient tutors={tutors} />;
}
