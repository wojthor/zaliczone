import { WyplatyClient } from "./wyplaty-client";
import { getAllVerifiedFinanceLines, getAllPayouts } from "@/lib/data/queries";

export default async function AdminWyplatyPage() {
  const [financeLines, payouts] = await Promise.all([
    getAllVerifiedFinanceLines(),
    getAllPayouts(),
  ]);
  return <WyplatyClient financeLines={financeLines} payouts={payouts} />;
}
