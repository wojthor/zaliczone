import { PremieClient } from "./premie-client";
import { getAdminTutorSummaries } from "@/lib/data/queries";

export default async function AdminPremiePage() {
  const tutors = await getAdminTutorSummaries();
  const active = tutors.filter((t) => !t.contractEnd || t.contractEnd > new Date().toISOString().slice(0, 10));
  return <PremieClient tutors={active} />;
}
