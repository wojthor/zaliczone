import { RozliczeniaClient } from "./rozliczenia-client";
import {
  getAllVerifiedFinanceLines,
  getPendingVerificationLines,
  getUnpaidFinanceLines,
} from "@/lib/data/queries";

export default async function RozliczeniaPage() {
  const [pendingLines, verifiedLines, unpaidLines] = await Promise.all([
    getPendingVerificationLines(),
    getAllVerifiedFinanceLines(),
    getUnpaidFinanceLines(),
  ]);
  return (
    <RozliczeniaClient
      pendingLines={pendingLines}
      verifiedLines={verifiedLines}
      unpaidLines={unpaidLines}
    />
  );
}
