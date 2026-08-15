import { KsiegowoscClient } from "./ksiegowosc-client";
import { ADMIN_PIT_RATE } from "@/lib/dates";
import {
  getAllLessonLines,
  getAllOperatingExpenses,
  getAllPayouts,
  getBusinessSettings,
  getClosedMonths,
} from "@/lib/data/queries";

function previousMonthKey(d = new Date()): string {
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 15);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

function resolveMonthKey(raw: string | undefined): string {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) return raw;
  return previousMonthKey();
}

export default async function KsiegowoscPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const monthKey = resolveMonthKey(month);

  // Wszystkie lekcje (każdy status) — potrzebne do walidacji Warunku 1 kreatora zamknięcia,
  // nie tylko VERIFIED jak wcześniej. Payouts/koszty/zamknięcia/ustawienia pobierane równolegle.
  const [allLessons, payouts, closedMonths, operatingExpenses, businessSettings] = await Promise.all([
    getAllLessonLines(),
    getAllPayouts(),
    getClosedMonths(),
    getAllOperatingExpenses(),
    getBusinessSettings(),
  ]);

  const financeLines = allLessons.filter((l) => l.status === "VERIFIED");

  // Agregacje miesiąca wybranego przez ?month= — liczone server-side.
  const monthVerifiedLines = financeLines.filter((l) => l.monthKey === monthKey);
  const monthLessons = allLessons.filter((l) => l.monthKey === monthKey);
  const monthPayouts = payouts.filter((p) => p.month === monthKey);
  const monthExpenses = operatingExpenses.filter((e) => e.month === monthKey);

  const grossRevenuePln = Math.round(monthVerifiedLines.reduce((s, l) => s + l.amountPln, 0) * 100) / 100;
  const payrollCostsPln =
    Math.round(
      monthPayouts.filter((p) => p.status === "PAID").reduce((s, p) => s + Number(p.amount), 0) * 100,
    ) / 100;
  const operatingCostsPln =
    Math.round(monthExpenses.reduce((s, e) => s + Number(e.amount_pln), 0) * 100) / 100;
  const taxableIncomePln = Math.max(0, Math.round((grossRevenuePln - (payrollCostsPln + operatingCostsPln)) * 100) / 100);
  const estimatedPitPln = Math.round(taxableIncomePln * ADMIN_PIT_RATE * 100) / 100;
  const netProfitPln = Math.round((taxableIncomePln - estimatedPitPln) * 100) / 100;

  // Warunki kreatora zamknięcia — te same reguły, którymi closeMonth() rewalidauje na serwerze.
  const lessonsReady = !monthLessons.some((l) => l.status === "PLANNED" || l.status === "PENDING_VERIFICATION");
  const payoutsReady = monthPayouts.every((p) => p.status === "PAID");

  return (
    <KsiegowoscClient
      financeLines={financeLines}
      payouts={payouts}
      closedMonths={closedMonths}
      operatingExpenses={operatingExpenses}
      initialMonthKey={monthKey}
      businessSettings={businessSettings}
      monthSummary={{
        grossRevenuePln,
        payrollCostsPln,
        operatingCostsPln,
        taxableIncomePln,
        estimatedPitPln,
        netProfitPln,
        lessonsReady,
        payoutsReady,
      }}
    />
  );
}
