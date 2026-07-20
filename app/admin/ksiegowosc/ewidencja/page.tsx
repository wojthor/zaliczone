import { redirect } from "next/navigation";
import { getCurrentUserProfile, getAllVerifiedFinanceLines } from "@/lib/data/queries";
import { EwidencjaSprzedazyPrintView } from "./ewidencja-sprzedazy-print";

export default async function EwidencjaSprzedazyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "ADMIN") redirect("/");

  const { month, year } = await searchParams;
  const all = await getAllVerifiedFinanceLines();

  if (year && /^\d{4}$/.test(year)) {
    const lines = all.filter((l) => l.monthKey.startsWith(`${year}-`));
    return <EwidencjaSprzedazyPrintView periodLabel={`Rok ${year}`} lines={lines} />;
  }

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const lines = all.filter((l) => l.monthKey === month);
    return <EwidencjaSprzedazyPrintView periodLabel={month} lines={lines} periodIsMonth />;
  }

  return (
    <div className="p-8 text-center">
      <p className="text-muted">
        Podaj miesiąc lub rok, np. /admin/ksiegowosc/ewidencja?month=2026-07 lub ?year=2026
      </p>
    </div>
  );
}
