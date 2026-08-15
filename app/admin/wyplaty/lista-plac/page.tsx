import { redirect } from "next/navigation";
import { TUTOR_SHARE, bonusProgress } from "@/lib/dates";
import {
  getAllTutorProfiles,
  getAllVerifiedFinanceLines,
  getCurrentUserProfile,
} from "@/lib/data/queries";
import type { FinanceLineUi } from "@/lib/types/database";
import { ListaPlacPrintView } from "./lista-plac-print";
import { previousMonthKey, type ListaPlacRow } from "./lista-plac-shared";

function minutesFromLabel(label: string): number {
  const match = label.match(/(\d+)\s*min/);
  return match ? Number(match[1]) : 60;
}

function buildRows(
  lines: FinanceLineUi[],
  bankAccounts: Record<string, string | null>,
): ListaPlacRow[] {
  const map = new Map<string, ListaPlacRow>();

  for (const line of lines) {
    const prev = map.get(line.tutorId) ?? {
      tutorId: line.tutorId,
      tutorName: line.tutorName,
      bankAccount: bankAccounts[line.tutorId] ?? null,
      lessonCount: 0,
      hours: 0,
      lessonsPayoutPln: 0,
      bonusPln: 0,
      totalPln: 0,
    };
    prev.lessonCount += 1;
    prev.hours += minutesFromLabel(line.label) / 60;
    prev.lessonsPayoutPln += Math.round(line.amountPln * TUTOR_SHARE * 100) / 100;
    map.set(line.tutorId, prev);
  }

  for (const row of map.values()) {
    row.hours = Math.round(row.hours * 10) / 10;
    const b = bonusProgress(row.hours);
    row.bonusPln = b.achieved ? b.bonusPln : 0;
    row.totalPln = Math.round((row.lessonsPayoutPln + row.bonusPln) * 100) / 100;
  }

  return [...map.values()].sort((a, b) => a.tutorName.localeCompare(b.tutorName, "pl"));
}

export default async function ListaPlacPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await getCurrentUserProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "ADMIN") redirect("/panel");

  const { month } = await searchParams;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted">
          Podaj miesiąc wypłaty, np. /admin/wyplaty/lista-plac?month=2026-07 (lista za poprzedni miesiąc)
        </p>
      </div>
    );
  }

  const [financeLines, tutors] = await Promise.all([
    getAllVerifiedFinanceLines(),
    getAllTutorProfiles(),
  ]);

  const bankAccounts: Record<string, string | null> = {};
  for (const t of tutors) {
    bankAccounts[t.id] = t.bank_account ?? null;
  }

  const workMonthKey = previousMonthKey(month);
  const linesForMonth = financeLines.filter((l) => l.monthKey === workMonthKey);
  const rows = buildRows(linesForMonth, bankAccounts);

  return <ListaPlacPrintView monthKey={month} rows={rows} />;
}
