import { redirect } from "next/navigation";
import { getCurrentUserProfile, getAllVerifiedFinanceLines } from "@/lib/data/queries";
import { EwidencjaSprzedazyPrintView } from "./ewidencja-sprzedazy-print";

export default async function EwidencjaSprzedazyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "ADMIN") redirect("/");

  const { month } = await searchParams;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted">Podaj miesiąc, np. /admin/ksiegowosc/ewidencja?month=2026-07</p>
      </div>
    );
  }

  const all = await getAllVerifiedFinanceLines();
  const lines = all.filter((l) => l.monthKey === month);

  return <EwidencjaSprzedazyPrintView month={month} lines={lines} />;
}
