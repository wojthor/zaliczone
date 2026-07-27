import { createClient } from "@/lib/supabase/server";
import { AdminDashboardClient } from "./admin-dashboard-client";
import { TUTOR_SHARE, bonusProgress } from "@/lib/dates";
import {
  getAllOperatingExpenses,
  getAllTutorProfiles,
  getAllVerifiedFinanceLines,
  getPendingVerificationLines,
  getUnpaidFinanceLines,
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

function daysUntilIso(iso: string, today = new Date()): number {
  const target = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

/** Suma wynagrodzeń tutorów (lekcje + premia) dla podanego zbioru linii VERIFIED. */
function computeTutorCostForLines(lines: FinanceLineUi[]): number {
  const tutorCostById = new Map<string, { hours: number; lessonsPln: number }>();
  for (const line of lines) {
    const prev = tutorCostById.get(line.tutorId) ?? { hours: 0, lessonsPln: 0 };
    const match = line.label.match(/(\d+)\s*min/);
    const minutes = match ? Number(match[1]) : 60;
    prev.hours += minutes / 60;
    prev.lessonsPln += Math.round(line.amountPln * TUTOR_SHARE * 100) / 100;
    tutorCostById.set(line.tutorId, prev);
  }
  let total = 0;
  for (const row of tutorCostById.values()) {
    const hours = Math.round(row.hours * 10) / 10;
    const bonus = bonusProgress(hours);
    total += row.lessonsPln + (bonus.achieved ? bonus.bonusPln : 0);
  }
  return Math.round(total * 100) / 100;
}

export default async function AdminHomePage() {
  const today = new Date();
  const monthKey = currentMonthKey(today);

  const [pendingLessons, unpaidLessons, verifiedLines, tutors, operatingExpenses] =
    await Promise.all([
      getPendingVerificationLines(),
      getUnpaidFinanceLines(),
      getAllVerifiedFinanceLines(),
      getAllTutorProfiles(),
      getAllOperatingExpenses(),
    ]);

  const supabase = await createClient();
  const { count: studentCount } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true });

  const verifiedThisMonth = verifiedLines.filter((l) => l.monthKey === monthKey);
  const pendingThisMonth = pendingLessons.filter((l) => l.monthKey === monthKey);
  const unpaidThisMonth = unpaidLessons.filter((l) => l.monthKey === monthKey);

  const verifiedMonthSumPln = verifiedThisMonth.reduce((s, l) => s + l.amountPln, 0);
  const unpaidMonthSumPln = unpaidThisMonth.reduce((s, l) => s + l.amountPln, 0);

  const tutorCostPln = computeTutorCostForLines(verifiedThisMonth);
  const otherOperatingCostPln =
    Math.round(
      operatingExpenses
        .filter((e) => e.month === monthKey)
        .reduce((s, e) => s + Number(e.amount_pln), 0) * 100,
    ) / 100;
  const totalCostPln = Math.round((tutorCostPln + otherOperatingCostPln) * 100) / 100;
  const agencyProfitPln = Math.round((verifiedMonthSumPln - totalCostPln) * 100) / 100;

  const expiringContracts = tutors
    .filter((t): t is typeof t & { contract_end: string } => Boolean(t.contract_end))
    .map((t) => ({
      id: t.id,
      name: t.full_name ?? "Nauczyciel",
      daysLeft: daysUntilIso(t.contract_end, today),
    }))
    .filter((t) => t.daysLeft >= 0 && t.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <AdminDashboardClient
      todayLabel={formatTodayPl(today)}
      monthLabel={formatMonthLongPl(monthKey)}
      verifiedMonthSumPln={verifiedMonthSumPln}
      payoutCostPln={tutorCostPln}
      totalCostPln={totalCostPln}
      agencyProfitPln={agencyProfitPln}
      unpaidMonthSumPln={unpaidMonthSumPln}
      tutorCount={tutors.length}
      studentCount={studentCount ?? 0}
      pendingMonthCount={pendingThisMonth.length}
      verifiedMonthCount={verifiedThisMonth.length}
      unpaidMonthCount={unpaidThisMonth.length}
      expiringContracts={expiringContracts}
    />
  );
}
