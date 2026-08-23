import { WyplatyClient } from "./wyplaty-client";
import { getAllVerifiedFinanceLines, getAllPayouts, getAllTutorProfiles, getPriceTiers } from "@/lib/data/queries";

export default async function AdminWyplatyPage() {
  const [financeLines, payouts, tutors, priceTiers] = await Promise.all([
    getAllVerifiedFinanceLines(),
    getAllPayouts(),
    getAllTutorProfiles(),
    getPriceTiers(),
  ]);

  const bankAccounts: Record<string, string | null> = {};
  for (const t of tutors) {
    bankAccounts[t.id] = t.bank_account ?? null;
  }

  return (
    <WyplatyClient financeLines={financeLines} payouts={payouts} bankAccounts={bankAccounts} priceTiers={priceTiers} />
  );
}
