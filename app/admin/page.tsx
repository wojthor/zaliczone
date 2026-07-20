import { createClient } from "@/lib/supabase/server";
import { AdminDashboardClient } from "./admin-dashboard-client";
import {
  DATES,
  TUTOR_SHARE,
  bonusProgress,
  ewidencjaDeadlineIso,
} from "@/lib/dates";
import {
  getAllOperatingExpenses,
  getAllTutorProfiles,
  getAllVerifiedFinanceLines,
  getPendingVerificationLines,
  getUnpaidFinanceLines,
} from "@/lib/data/queries";

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

function previousMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y!, m! - 2, 15);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLongPl(monthKey: string): string {
  const [ys, ms] = monthKey.split("-");
  const d = new Date(Number(ys), Number(ms) - 1, 15);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

function formatDayPl(iso: string): string {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
}

function daysUntilIso(iso: string, today = new Date()): number {
  const target = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

function isoFromYmd(year: number, month1Based: number, day: number): string {
  const d = new Date(year, month1Based - 1, day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AdminHomePage() {
  const today = new Date();
  const monthKey = currentMonthKey(today);
  const prevKey = previousMonthKey(monthKey);

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

  const tutorCostById = new Map<string, { hours: number; lessonsPln: number }>();
  for (const line of verifiedThisMonth) {
    const prev = tutorCostById.get(line.tutorId) ?? { hours: 0, lessonsPln: 0 };
    const match = line.label.match(/(\d+)\s*min/);
    const minutes = match ? Number(match[1]) : 60;
    prev.hours += minutes / 60;
    prev.lessonsPln += Math.round(line.amountPln * TUTOR_SHARE * 100) / 100;
    tutorCostById.set(line.tutorId, prev);
  }

  let tutorCostPln = 0;
  for (const row of tutorCostById.values()) {
    const hours = Math.round(row.hours * 10) / 10;
    const bonus = bonusProgress(hours);
    tutorCostPln += row.lessonsPln + (bonus.achieved ? bonus.bonusPln : 0);
  }
  tutorCostPln = Math.round(tutorCostPln * 100) / 100;
  const otherOperatingCostPln =
    Math.round(
      operatingExpenses
        .filter((e) => e.month === monthKey)
        .reduce((s, e) => s + Number(e.amount_pln), 0) * 100,
    ) / 100;
  const totalCostPln = Math.round((tutorCostPln + otherOperatingCostPln) * 100) / 100;
  const agencyProfitPln = Math.round((verifiedMonthSumPln - totalCostPln) * 100) / 100;

  // Terminy
  const ewidencjaIso = ewidencjaDeadlineIso(monthKey); // za bieżący miesiąc → dzień 3 kolejnego
  const ewidencjaPrevIso = ewidencjaDeadlineIso(prevKey); // za poprzedni → dzień 3 bieżącego

  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const payoutIso = isoFromYmd(y, m, DATES.payout.availableFromDay);
  const closePrevIso = (() => {
    // Zamknięcie miesiąca poprzedniego: dzień 5 bieżącego miesiąca
    return isoFromYmd(y, m, DATES.monthClose.earliestDayOfNextMonth);
  })();

  const deadlines = [
    {
      id: "ewidencja-prev",
      label: `Ewidencja godzin · ${formatMonthLongPl(prevKey)}`,
      dateLabel: formatDayPl(ewidencjaPrevIso),
      daysLeft: daysUntilIso(ewidencjaPrevIso, today),
      href: "/admin/powiadomienia",
    },
    {
      id: "payout",
      label: "Wypłaty (okno od)",
      dateLabel: formatDayPl(payoutIso),
      daysLeft: daysUntilIso(payoutIso, today),
      href: "/admin/wyplaty",
    },
    {
      id: "month-close",
      label: `Zamknięcie miesiąca · ${formatMonthLongPl(prevKey)}`,
      dateLabel: formatDayPl(closePrevIso),
      daysLeft: daysUntilIso(closePrevIso, today),
      href: "/admin/ksiegowosc",
    },
    {
      id: "ewidencja-curr",
      label: `Ewidencja godzin · ${formatMonthLongPl(monthKey)}`,
      dateLabel: formatDayPl(ewidencjaIso),
      daysLeft: daysUntilIso(ewidencjaIso, today),
      href: "/admin/powiadomienia",
    },
  ];

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
      deadlines={deadlines}
    />
  );
}
