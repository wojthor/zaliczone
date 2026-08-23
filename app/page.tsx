import { LandingPageClient } from "@/components/landing/landing-page-client";
import { getPriceTiers, getPublicTutorCards } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [tutors, tiers] = await Promise.all([getPublicTutorCards(), getPriceTiers()]);
  return (
    <LandingPageClient tutors={tutors} priceLevels={tiers.map((t) => t.label)} />
  );
}
