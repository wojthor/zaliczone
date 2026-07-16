import { NauczycieleClient } from "./nauczyciele-client";
import { getAdminTutorSummaries } from "@/lib/data/queries";

export default async function AdminTutorsPage() {
  const tutors = await getAdminTutorSummaries();
  return <NauczycieleClient initialTutors={tutors} />;
}
