import { createClient } from "@/lib/supabase/server";
import { AdminDashboardClient } from "./admin-dashboard-client";
import { sumTutorPayoutWithBonusFromCennik } from "@/lib/data/mappers";
import {
  getAllOperatingExpenses,
  getAllTutorProfiles,
  getCachedCoordinatorDashboardLines,
  getOpenAdminAlerts,
  getPriceTiers,
} from "@/lib/data/queries";
import type { FinanceLineUi } from "@/lib/types/database";

function formatTodayPl(d = new Date()): string {
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLongPl(monthKey: string): string {
  const [ys, ms] = monthKey.split("-");
  const d = new Date(Number(ys), Number(ms) - 1, 15);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

/** Suma wynagrodzeń tutorów (lekcje wg cennika + premia) dla linii VERIFIED. */
function computeTutorCostForLines(
  lines: FinanceLineUi[],
  tiers: { label: string; worker_rate_pln: number }[],
): number {
  return sumTutorPayoutWithBonusFromCennik(lines, tiers);
}

export default async function AdminHomePage() {
  const today = new Date();
  const monthKey = currentMonthKey(today);

  const [dashboardLines, tutors, operatingExpenses, alerts, studentCountRes, priceTiers] = await Promise.all([
    getCachedCoordinatorDashboardLines(),
    getAllTutorProfiles(),
    getAllOperatingExpenses(),
    getOpenAdminAlerts(),
    createClient().then((supabase) =>
      supabase.from("students").select("*", { count: "exact", head: true }),
    ),
    getPriceTiers(),
  ]);
  const pendingLessons = dashboardLines.pending;
  const unpaidLessons = dashboardLines.unpaid;
  const verifiedLines = dashboardLines.verified;

  const studentCount = studentCountRes.count;

  const verifiedThisMonth = verifiedLines.filter((l) => l.monthKey === monthKey);
  const pendingThisMonth = pendingLessons.filter((l) => l.monthKey === monthKey);
  const unpaidThisMonth = unpaidLessons.filter((l) => l.monthKey === monthKey);

  const verifiedMonthSumPln = verifiedThisMonth.reduce((s, l) => s + l.amountPln, 0);
  const unpaidMonthSumPln = unpaidThisMonth.reduce((s, l) => s + l.amountPln, 0);

  const tutorCostPln = computeTutorCostForLines(verifiedThisMonth, priceTiers);
  const otherOperatingCostPln =
    Math.round(
      operatingExpenses
        .filter((e) => e.month === monthKey)
        .reduce((s, e) => s + Number(e.amount_pln), 0) * 100,
    ) / 100;
  const totalCostPln = Math.round((tutorCostPln + otherOperatingCostPln) * 100) / 100;
  const agencyProfitPln = Math.round((verifiedMonthSumPln - totalCostPln) * 100) / 100;

  return (
    <AdminDashboardClient
      todayLabel={formatTodayPl(today)}
      monthLabel={formatMonthLongPl(monthKey)}
      verifiedMonthSumPln={verifiedMonthSumPln}
      totalCostPln={totalCostPln}
      agencyProfitPln={agencyProfitPln}
      unpaidMonthSumPln={unpaidMonthSumPln}
      tutorCount={tutors.length}
      studentCount={studentCount ?? 0}
      pendingMonthCount={pendingThisMonth.length}
      verifiedMonthCount={verifiedThisMonth.length}
      unpaidMonthCount={unpaidThisMonth.length}
      alerts={alerts}
    />
  );
}
