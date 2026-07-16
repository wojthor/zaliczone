import { KsiegowoscClient } from "./ksiegowosc-client";
import { getAllCompletedFinanceLines, getAllPayouts, getClosedMonths } from "@/lib/data/queries";

export default async function KsiegowoscPage() {
  const [financeLines, payouts, closedMonths] = await Promise.all([
    getAllCompletedFinanceLines(),
    getAllPayouts(),
    getClosedMonths(),
  ]);
  return (
    <KsiegowoscClient financeLines={financeLines} payouts={payouts} closedMonths={closedMonths} />
  );
}
