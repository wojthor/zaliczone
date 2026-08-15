import { LandingPageClient } from "@/components/landing/landing-page-client";
import { getPublicTutorCards } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const tutors = await getPublicTutorCards();
  return <LandingPageClient tutors={tutors} />;
}
