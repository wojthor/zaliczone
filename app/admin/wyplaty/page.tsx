import { WyplatyClient } from "./wyplaty-client";
import { getAllVerifiedFinanceLines, getAllPayouts, getAllTutorProfiles } from "@/lib/data/queries";

export default async function AdminWyplatyPage() {
  const [financeLines, payouts, tutors] = await Promise.all([
    getAllVerifiedFinanceLines(),
    getAllPayouts(),
    getAllTutorProfiles(),
  ]);

  const bankAccounts: Record<string, string | null> = {};
  for (const t of tutors) {
    bankAccounts[t.id] = t.bank_account ?? null;
  }

  return (
    <WyplatyClient financeLines={financeLines} payouts={payouts} bankAccounts={bankAccounts} />
  );
}
