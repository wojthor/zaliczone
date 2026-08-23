import { NauczycieleClient } from "./nauczyciele-client";
import { getAdminTutorSummaries, getPriceTiers } from "@/lib/data/queries";

export default async function AdminTutorsPage() {
  const [tutors, tiers] = await Promise.all([getAdminTutorSummaries(), getPriceTiers()]);
  const levels = tiers.map((t) => t.label);
  return <NauczycieleClient initialTutors={tutors} priceLevels={levels} />;
}
