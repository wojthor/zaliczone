import { redirect } from "next/navigation";
import { FinanseClient } from "@/components/finanse/finanse-client";
import {
  getClosedMonths,
  getCurrentUserProfile,
  getPriceTiers,
  getStudentCountForTutor,
  getTutorPayouts,
  getTutorVerifiedFinanceLines,
} from "@/lib/data/queries";

export default async function FinansePage() {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (profile.role === "ADMIN") redirect("/admin");

  const [financeLines, studentCount, priceTiers, payouts, closedMonths] = await Promise.all([
    getTutorVerifiedFinanceLines(profile.id),
    getStudentCountForTutor(profile.id),
    getPriceTiers(),
    getTutorPayouts(profile.id),
    getClosedMonths(),
  ]);

  return (
    <FinanseClient
      financeLines={financeLines}
      studentCount={studentCount}
      ewidencjaUnlockedForMonth={profile.ewidencja_unlocked_for_month}
      priceTiers={priceTiers}
      payouts={payouts}
      closedMonths={closedMonths}
    />
  );
}
