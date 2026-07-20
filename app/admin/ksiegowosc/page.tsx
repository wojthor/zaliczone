import { KsiegowoscClient } from "./ksiegowosc-client";
import {
  getAllCompletedFinanceLines,
  getAllOperatingExpenses,
  getAllPayouts,
  getClosedMonths,
} from "@/lib/data/queries";

export default async function KsiegowoscPage() {
  const [financeLines, payouts, closedMonths, operatingExpenses] = await Promise.all([
    getAllCompletedFinanceLines(),
    getAllPayouts(),
    getClosedMonths(),
    getAllOperatingExpenses(),
  ]);
  return (
    <KsiegowoscClient
      financeLines={financeLines}
      payouts={payouts}
      closedMonths={closedMonths}
      operatingExpenses={operatingExpenses}
    />
  );
}
