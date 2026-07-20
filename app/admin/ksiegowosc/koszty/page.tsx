import { redirect } from "next/navigation";
import {
  getCurrentUserProfile,
  getAllOperatingExpenses,
  getAllPayouts,
} from "@/lib/data/queries";
import { buildYearCostRows, ZestawienieKosztowPrintView } from "./zestawienie-kosztow-print";

export default async function ZestawienieKosztowPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "ADMIN") redirect("/");

  const { month, year } = await searchParams;
  const [allExpenses, payouts] = await Promise.all([
    getAllOperatingExpenses(),
    getAllPayouts(),
  ]);

  if (year && /^\d{4}$/.test(year)) {
    const expenses = allExpenses.filter((e) => e.month.startsWith(`${year}-`));
    const yearPayouts = payouts.filter((p) => p.month.startsWith(`${year}-`));
    return (
      <ZestawienieKosztowPrintView
        periodLabel={`Rok ${year}`}
        expenses={expenses}
        yearCostRows={buildYearCostRows(year, yearPayouts, expenses)}
      />
    );
  }

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const expenses = allExpenses.filter((e) => e.month === month);
    return (
      <ZestawienieKosztowPrintView periodLabel={month} expenses={expenses} periodIsMonth />
    );
  }

  return (
    <div className="p-8 text-center">
      <p className="text-muted">
        Podaj miesiąc lub rok, np. /admin/ksiegowosc/koszty?month=2026-07 lub ?year=2026
      </p>
    </div>
  );
}
