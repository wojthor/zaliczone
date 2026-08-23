"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { closeMonth, createOperatingExpense, deleteOperatingExpense, switchToJDG } from "@/lib/actions/admin";
import { getSignedDownloadUrl } from "@/lib/actions/documents";
import { IconLock } from "@/components/icons";
import { canCloseMonth } from "@/lib/dates";
import { sumTutorPayoutWithBonusFromCennik } from "@/lib/data/mappers";
import {
  NDG_QUARTERLY_LIMIT,
  PIT_TAX_FREE_AMOUNT,
  SKLADKA_ZDROWOTNA_MINIMUM,
  VAT_ANNUAL_LIMIT,
  ZUS_PREFERENCYJNY_SPOLECZNE,
  ZUS_ULGA_NA_START_SPOLECZNE,
} from "@/lib/podatki-config";
import {
  calendarQuarter,
  dniPozostaleNaCeidg,
  monthsInQuarter,
  numerMiesiacaUlgiNaStart,
  obliczLimitNDG,
  obliczLimitVAT,
  obliczSkladkeZdrowotna,
  obliczZaliczkePIT,
  toneForLimitPercent,
  znajdzDatePrzekroczeniaLimitu,
} from "@/lib/podatki";
import type { BusinessSettings, FinanceLineUi, LegalMode, OperatingExpense, Payout } from "@/lib/types/database";
import type { PriceTier } from "@/lib/types/messages";
import { FinanceTile, FinanceTilesRow } from "@/components/admin/finance-tile";
import { QuarterlyLimitBar, VatLimitBar } from "@/components/admin/ksiegowosc/limit-bars";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export type MonthSummary = {
  grossRevenuePln: number;
  payrollCostsPln: number;
  operatingCostsPln: number;
  taxableIncomePln: number;
  estimatedPitPln: number;
  netProfitPln: number;
  /** Warunek 1 - brak lekcji PLANNED/PENDING_VERIFICATION w miesiącu (rewalidowane na serwerze przy zamknięciu). */
  lessonsReady: boolean;
  /** Warunek 2 - wszystkie payouts miesiąca mają status PAID (rewalidowane na serwerze przy zamknięciu). */
  payoutsReady: boolean;
};

type ViewMode = "month" | "year";
type JdgZusStage = "start" | "maly";

function formatCurrencyPln(n: number): string {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(n);
}

function monthKeysInclusive(fromKey: string, toKey: string): string[] {
  const [fy, fm] = fromKey.split("-").map(Number);
  const [ty, tm] = toKey.split("-").map(Number);
  const out: string[] = [];
  let y = fy!;
  let m = fm!;
  while (y < ty! || (y === ty && m <= tm!)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function payrollCostsForMonth(
  monthKey: string,
  financeLines: FinanceLineUi[],
  payouts: Payout[],
  closedMonths: string[],
  tiers: { label: string; worker_rate_pln: number }[],
): number {
  const lines = financeLines.filter((l) => l.monthKey === monthKey);
  const paid = Math.round(
    payouts
      .filter((p) => p.month === monthKey && p.status === "PAID")
      .reduce((s, p) => s + Number(p.amount), 0) * 100,
  ) / 100;
  const accrued = sumTutorPayoutWithBonusFromCennik(lines, tiers);
  const closed = closedMonths.includes(monthKey);
  return closed && paid > 0 ? paid : accrued;
}

function taxableIncomeForMonth(
  monthKey: string,
  financeLines: FinanceLineUi[],
  payouts: Payout[],
  expenses: OperatingExpense[],
  closedMonths: string[],
  tiers: { label: string; worker_rate_pln: number }[],
): number {
  const gross = financeLines
    .filter((l) => l.monthKey === monthKey)
    .reduce((s, l) => s + l.amountPln, 0);
  const payroll = payrollCostsForMonth(monthKey, financeLines, payouts, closedMonths, tiers);
  const operating = expenses
    .filter((e) => e.month === monthKey)
    .reduce((s, e) => s + Number(e.amount_pln), 0);
  return Math.max(0, Math.round((gross - payroll - operating) * 100) / 100);
}

type LedgerRow = {
  id: string;
  lessonDate: string;
  paidAt: string;
  serviceName: string;
  buyer: string;
  grossPln: number;
  cumulativePln: number;
};

type MonthBreakdown = {
  monthKey: string;
  label: string;
  gross: number;
  tutorShare: number;
  agencyShare: number;
  tutorCount: number;
  studentCount: number;
  lessonCount: number;
  hoursCount: number;
  paidPayouts: number;
  closed: boolean;
};

type MonthCostRow = {
  monthKey: string;
  label: string;
  payoutsPln: number;
  bonusesPln: number;
  extraCostsPln: number;
  totalPln: number;
};

function payoutLessonsAndBonus(p: Payout): { lessons: number; bonus: number } {
  const bonus = Number(p.bonus_amount ?? 0);
  const lessons =
    p.lessons_amount != null
      ? Number(p.lessons_amount)
      : Math.round((Number(p.amount) - bonus) * 100) / 100;
  return { lessons, bonus };
}

function lineActivityStats(lines: FinanceLineUi[]) {
  const tutors = new Set(lines.map((l) => l.tutorId));
  const students = new Set(lines.map((l) => l.studentId));
  const minutes = lines.reduce((s, l) => s + l.durationMinutes, 0);
  return {
    tutorCount: tutors.size,
    studentCount: students.size,
    lessonCount: lines.length,
    hoursCount: Math.round((minutes / 60) * 10) / 10,
  };
}

function currentMonthKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function formatMonthLongPl(monthKey: string): string {
  const [ys, ms] = monthKey.split("-");
  const d = new Date(Number(ys), Number(ms) - 1, 15);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

function extractSubject(label: string): string {
  return label.split("·")[0]?.trim().replace("J. ", "") ?? "Lekcja";
}

function formatPln(n: number): string {
  return `${n.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} zł`;
}

function truncateFileName(name: string, max = 22): string {
  if (name.length <= max) return name;
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const base = name.slice(0, Math.max(0, max - ext.length - 1));
  return `${base}…${ext}`;
}

function buildLedgerRows(lines: FinanceLineUi[]): LedgerRow[] {
  let running = 0;
  return lines.map((l) => {
    running = Math.round((running + l.amountPln) * 100) / 100;
    return {
      id: l.id,
      lessonDate: l.date,
      paidAt: l.paymentReceivedAt ?? l.date,
      serviceName: l.classLevel
        ? `Korepetycje - ${extractSubject(l.label)} (${l.classLevel})`
        : `Korepetycje - ${extractSubject(l.label)}`,
      buyer: l.studentName,
      grossPln: l.amountPln,
      cumulativePln: running,
    };
  });
}

export function KsiegowoscClient({
  financeLines,
  payouts,
  closedMonths = [],
  operatingExpenses = [],
  initialMonthKey,
  monthSummary,
  businessSettings,
  priceTiers,
}: {
  financeLines: FinanceLineUi[];
  payouts: Payout[];
  closedMonths?: string[];
  operatingExpenses?: OperatingExpense[];
  initialMonthKey: string;
  monthSummary: MonthSummary;
  businessSettings: BusinessSettings;
  priceTiers: PriceTier[];
}) {
  const router = useRouter();
  const [pendingExpense, startExpense] = useTransition();
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [confirmJdgOpen, setConfirmJdgOpen] = useState(false);
  const nowKey = useMemo(() => currentMonthKey(), []);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedMonthKey, setSelectedMonthKey] = useState(initialMonthKey);
  const [selectedYear, setSelectedYear] = useState(() => initialMonthKey.slice(0, 4));
  const [legalMode, setLegalMode] = useState<LegalMode>(businessSettings.legalMode);
  const [jdgRegistrationDate, setJdgRegistrationDate] = useState<string | null>(
    businessSettings.jdgRegistrationDate,
  );
  const [zusStage, setZusStage] = useState<JdgZusStage>("start");
  const [bankReconciled, setBankReconciled] = useState(false);
  const [expenseFeedback, setExpenseFeedback] = useState("");
  const [expenseForm, setExpenseForm] = useState({
    invoiceDate: `${initialMonthKey}-01`,
    documentNumber: "",
    expenseName: "",
    issuerName: "",
    amountPln: "",
  });
  const [expenseFile, setExpenseFile] = useState<File | null>(null);
  const [expenseFileKey, setExpenseFileKey] = useState(0);
  const [localExpenses, setLocalExpenses] = useState(operatingExpenses);
  const [localClosedMonths, setLocalClosedMonths] = useState(closedMonths);

  useEffect(() => {
    setLocalExpenses(operatingExpenses);
  }, [operatingExpenses]);

  useEffect(() => {
    setLocalClosedMonths(closedMonths);
  }, [closedMonths]);

  useEffect(() => {
    setLegalMode(businessSettings.legalMode);
    setJdgRegistrationDate(businessSettings.jdgRegistrationDate);
  }, [businessSettings.legalMode, businessSettings.jdgRegistrationDate]);

  // Auto-wybór etapu ZUS na podstawie daty rejestracji JDG (Ulga na start = pierwsze 6 miesięcy).
  useEffect(() => {
    if (legalMode !== "JDG" || !jdgRegistrationDate) {
      setZusStage("start");
      return;
    }
    const numer = numerMiesiacaUlgiNaStart(jdgRegistrationDate, selectedMonthKey);
    setZusStage(numer != null ? "start" : "maly");
  }, [legalMode, jdgRegistrationDate, selectedMonthKey]);

  const effectiveClosedMonths = localClosedMonths;

  const monthOptions = useMemo(() => {
    const keys = new Set(financeLines.map((l) => l.monthKey));
    for (const p of payouts) keys.add(p.month);
    keys.add(nowKey);
    return [...keys].sort().reverse();
  }, [financeLines, payouts, nowKey]);

  const yearOptions = useMemo(() => {
    const years = new Set(monthOptions.map((k) => k.slice(0, 4)));
    years.add(nowKey.slice(0, 4));
    return [...years].sort().reverse();
  }, [monthOptions, nowKey]);

  const periodLines = useMemo(() => {
    const filtered =
      viewMode === "month"
        ? financeLines.filter((l) => l.monthKey === selectedMonthKey)
        : financeLines.filter((l) => l.monthKey.startsWith(`${selectedYear}-`));
    return filtered
      .slice()
      .sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.id.localeCompare(b.id));
  }, [financeLines, viewMode, selectedMonthKey, selectedYear]);

  const ledgerRows = useMemo(() => buildLedgerRows(periodLines), [periodLines]);

  const expensesForPeriod = useMemo(() => {
    const filtered =
      viewMode === "month"
        ? localExpenses.filter((e) => e.month === selectedMonthKey)
        : localExpenses.filter((e) => e.month.startsWith(`${selectedYear}-`));
    return filtered
      .slice()
      .sort(
        (a, b) =>
          a.invoice_date.localeCompare(b.invoice_date) ||
          a.expense_name.localeCompare(b.expense_name, "pl") ||
          a.id.localeCompare(b.id),
      );
  }, [localExpenses, viewMode, selectedMonthKey, selectedYear]);

  const yearCostRows = useMemo((): MonthCostRow[] => {
    if (viewMode !== "year") return [];
    const keys = new Set<string>();
    const yearNum = Number(selectedYear);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const lastMonthInYear =
      yearNum < currentYear ? 12 : yearNum === currentYear ? currentMonth : 0;
    for (let m = 1; m <= lastMonthInYear; m++) {
      keys.add(`${selectedYear}-${String(m).padStart(2, "0")}`);
    }
    for (const p of payouts) {
      if (p.month.startsWith(`${selectedYear}-`)) keys.add(p.month);
    }
    for (const e of localExpenses) {
      if (e.month.startsWith(`${selectedYear}-`)) keys.add(e.month);
    }
    for (const l of financeLines) {
      if (l.monthKey.startsWith(`${selectedYear}-`)) keys.add(l.monthKey);
    }
    for (const m of effectiveClosedMonths) {
      if (m.startsWith(`${selectedYear}-`)) keys.add(m);
    }
    return [...keys]
      .sort()
      .map((monthKey) => {
        let payoutsPln = 0;
        let bonusesPln = 0;
        for (const p of payouts) {
          if (p.month !== monthKey || p.status !== "PAID") continue;
          payoutsPln += Number(p.amount);
          bonusesPln += payoutLessonsAndBonus(p).bonus;
        }
        payoutsPln = Math.round(payoutsPln * 100) / 100;
        bonusesPln = Math.round(bonusesPln * 100) / 100;
        const extraCostsPln =
          Math.round(
            localExpenses
              .filter((e) => e.month === monthKey)
              .reduce((s, e) => s + Number(e.amount_pln), 0) * 100,
          ) / 100;
        // Wypłaty = pełna suma PAID (z premiami); premie tylko jako rozbicie
        const totalPln = Math.round((payoutsPln + extraCostsPln) * 100) / 100;
        return {
          monthKey,
          label: formatMonthLongPl(monthKey),
          payoutsPln,
          bonusesPln,
          extraCostsPln,
          totalPln,
        };
      });
  }, [viewMode, selectedYear, payouts, localExpenses, financeLines, effectiveClosedMonths]);

  const yearCostTotals = useMemo(() => {
    const payoutsPln = Math.round(yearCostRows.reduce((s, r) => s + r.payoutsPln, 0) * 100) / 100;
    const bonusesPln = Math.round(yearCostRows.reduce((s, r) => s + r.bonusesPln, 0) * 100) / 100;
    const extraCostsPln =
      Math.round(yearCostRows.reduce((s, r) => s + r.extraCostsPln, 0) * 100) / 100;
    const totalPln = Math.round((payoutsPln + extraCostsPln) * 100) / 100;
    return { payoutsPln, bonusesPln, extraCostsPln, totalPln };
  }, [yearCostRows]);

  const paidPayoutsSum = useMemo(() => {
    const relevant =
      viewMode === "month"
        ? payouts.filter((p) => p.month === selectedMonthKey && p.status === "PAID")
        : payouts.filter((p) => p.month.startsWith(`${selectedYear}-`) && p.status === "PAID");
    return Math.round(relevant.reduce((sum, p) => sum + Number(p.amount), 0) * 100) / 100;
  }, [payouts, viewMode, selectedMonthKey, selectedYear]);

  const extraCostsSum = useMemo(() => {
    const relevant =
      viewMode === "month"
        ? localExpenses.filter((e) => e.month === selectedMonthKey)
        : localExpenses.filter((e) => e.month.startsWith(`${selectedYear}-`));
    return Math.round(relevant.reduce((s, e) => s + Number(e.amount_pln), 0) * 100) / 100;
  }, [localExpenses, viewMode, selectedMonthKey, selectedYear]);

  const totals = useMemo(() => {
    const gross = periodLines.reduce((s, l) => s + l.amountPln, 0);
    const payoutCosts =
      viewMode === "month"
        ? payrollCostsForMonth(
            selectedMonthKey,
            financeLines,
            payouts,
            effectiveClosedMonths,
            priceTiers,
          )
        : (() => {
            const keys = new Set<string>();
            for (const line of periodLines) keys.add(line.monthKey);
            for (const payout of payouts) {
              if (payout.month.startsWith(`${selectedYear}-`)) keys.add(payout.month);
            }
            return Math.round(
              [...keys].reduce(
                (sum, mk) =>
                  sum +
                  payrollCostsForMonth(mk, financeLines, payouts, effectiveClosedMonths, priceTiers),
                0,
              ) * 100,
            ) / 100;
          })();
    const allCosts = Math.round((payoutCosts + extraCostsSum) * 100) / 100;
    const agencyShare = Math.round((gross - allCosts) * 100) / 100;
    return {
      gross,
      tutorShare: payoutCosts,
      allCosts,
      agencyShare,
      lessonCount: periodLines.length,
    };
  }, [
    periodLines,
    extraCostsSum,
    viewMode,
    selectedMonthKey,
    selectedYear,
    financeLines,
    payouts,
    effectiveClosedMonths,
    priceTiers,
  ]);

  const monthBreakdown = useMemo((): MonthBreakdown[] => {
    if (viewMode !== "year") return [];
    const keys = new Set<string>();
    for (const l of financeLines) {
      if (l.monthKey.startsWith(`${selectedYear}-`)) keys.add(l.monthKey);
    }
    for (const p of payouts) {
      if (p.month.startsWith(`${selectedYear}-`)) keys.add(p.month);
    }
    for (const e of localExpenses) {
      if (e.month.startsWith(`${selectedYear}-`)) keys.add(e.month);
    }
    for (let m = 1; m <= 12; m++) {
      keys.add(`${selectedYear}-${String(m).padStart(2, "0")}`);
    }
    return [...keys]
      .sort()
      .map((monthKey) => {
        const lines = financeLines.filter((l) => l.monthKey === monthKey);
        const gross = lines.reduce((s, l) => s + l.amountPln, 0);
        const activity = lineActivityStats(lines);
        const paidPayouts =
          Math.round(
            payouts
              .filter((p) => p.month === monthKey && p.status === "PAID")
              .reduce((s, p) => s + Number(p.amount), 0) * 100,
          ) / 100;
        const payrollCosts = payrollCostsForMonth(
          monthKey,
          financeLines,
          payouts,
          effectiveClosedMonths,
          priceTiers,
        );
        const extraCosts =
          Math.round(
            localExpenses
              .filter((e) => e.month === monthKey)
              .reduce((s, e) => s + Number(e.amount_pln), 0) * 100,
          ) / 100;
        const allCosts = Math.round((payrollCosts + extraCosts) * 100) / 100;
        const agencyShare = Math.round((gross - allCosts) * 100) / 100;
        return {
          monthKey,
          label: formatMonthLongPl(monthKey),
          gross,
          tutorShare: allCosts,
          agencyShare,
          ...activity,
          paidPayouts,
          closed: effectiveClosedMonths.includes(monthKey),
        };
      })
      .filter((row) => row.lessonCount > 0 || row.paidPayouts > 0 || row.closed || row.tutorShare > 0);
  }, [viewMode, selectedYear, financeLines, payouts, localExpenses, effectiveClosedMonths, priceTiers]);

  const monthSummaryRows = useMemo((): MonthBreakdown[] => {
    if (viewMode !== "month") return [];
    const lines = financeLines.filter((l) => l.monthKey === selectedMonthKey);
    const gross = lines.reduce((s, l) => s + l.amountPln, 0);
    const activity = lineActivityStats(lines);
    const paidPayouts =
      Math.round(
        payouts
          .filter((p) => p.month === selectedMonthKey && p.status === "PAID")
          .reduce((s, p) => s + Number(p.amount), 0) * 100,
      ) / 100;
    const payrollCosts = payrollCostsForMonth(
      selectedMonthKey,
      financeLines,
      payouts,
      effectiveClosedMonths,
      priceTiers,
    );
    const extraCosts =
      Math.round(
        localExpenses
          .filter((e) => e.month === selectedMonthKey)
          .reduce((s, e) => s + Number(e.amount_pln), 0) * 100,
      ) / 100;
    const allCosts = Math.round((payrollCosts + extraCosts) * 100) / 100;
    const agencyShare = Math.round((gross - allCosts) * 100) / 100;
    return [
      {
        monthKey: selectedMonthKey,
        label: formatMonthLongPl(selectedMonthKey),
        gross,
        tutorShare: allCosts,
        agencyShare,
        ...activity,
        paidPayouts,
        closed: effectiveClosedMonths.includes(selectedMonthKey),
      },
    ];
  }, [viewMode, selectedMonthKey, financeLines, payouts, localExpenses, effectiveClosedMonths, priceTiers]);

  const periodSummaryRows = viewMode === "year" ? monthBreakdown : monthSummaryRows;

  const yearSummaryTotals = useMemo(() => {
    if (viewMode !== "year") return null;
    const gross = Math.round(periodSummaryRows.reduce((s, r) => s + r.gross, 0) * 100) / 100;
    const costs = Math.round(periodSummaryRows.reduce((s, r) => s + r.tutorShare, 0) * 100) / 100;
    const margin = Math.round(periodSummaryRows.reduce((s, r) => s + r.agencyShare, 0) * 100) / 100;
    const lessonCount = periodSummaryRows.reduce((s, r) => s + r.lessonCount, 0);
    const hoursCount =
      Math.round(periodSummaryRows.reduce((s, r) => s + r.hoursCount, 0) * 10) / 10;
    const paidPayouts =
      Math.round(periodSummaryRows.reduce((s, r) => s + r.paidPayouts, 0) * 100) / 100;
    return { gross, costs, margin, lessonCount, hoursCount, paidPayouts };
  }, [viewMode, periodSummaryRows]);

  const taxableIncome = useMemo(() => {
    // Podstawa opodatkowania = Przychód brutto − (Koszty wynagrodzeń + Koszty operacyjne).
    const raw = totals.gross - totals.allCosts;
    return Math.max(0, Math.round(raw * 100) / 100);
  }, [totals.gross, totals.allCosts]);

  /** Dochody miesięczne od rejestracji JDG (lub od stycznia roku) - do zaliczki narastającej. */
  const dochodyOdRejestracji = useMemo(() => {
    const regKey = jdgRegistrationDate?.slice(0, 7);
    const year = selectedMonthKey.slice(0, 4);
    const fromKey =
      legalMode === "JDG" && regKey && /^\d{4}-\d{2}$/.test(regKey)
        ? regKey
        : `${year}-01`;
    const yearEnd =
      viewMode === "year"
        ? selectedYear === nowKey.slice(0, 4)
          ? nowKey
          : `${selectedYear}-12`
        : selectedMonthKey;
    const toKey = yearEnd < fromKey ? fromKey : yearEnd;
    return monthKeysInclusive(fromKey, toKey).map((mk) =>
      taxableIncomeForMonth(mk, financeLines, payouts, localExpenses, effectiveClosedMonths, priceTiers),
    );
  }, [
    legalMode,
    jdgRegistrationDate,
    selectedMonthKey,
    selectedYear,
    viewMode,
    nowKey,
    financeLines,
    payouts,
    localExpenses,
    effectiveClosedMonths,
    priceTiers,
  ]);

  const suggestedPit = useMemo(() => {
    if (legalMode === "NDG") return 0;
    if (dochodyOdRejestracji.length === 0) return 0;
    if (viewMode === "year") {
      // Suma zaliczek za wszystkie miesiące w tablicy (rok / od rejestracji).
      let sum = 0;
      for (let i = 0; i < dochodyOdRejestracji.length; i++) {
        sum = Math.round((sum + obliczZaliczkePIT(dochodyOdRejestracji, i)) * 100) / 100;
      }
      return sum;
    }
    return obliczZaliczkePIT(dochodyOdRejestracji, dochodyOdRejestracji.length - 1);
  }, [legalMode, dochodyOdRejestracji, viewMode]);

  const zdrowotnaMiesiac = useMemo(
    () => obliczSkladkeZdrowotna(taxableIncome, SKLADKA_ZDROWOTNA_MINIMUM),
    [taxableIncome],
  );

  const zusSpoleczne =
    legalMode === "NDG"
      ? 0
      : zusStage === "start"
        ? ZUS_ULGA_NA_START_SPOLECZNE
        : ZUS_PREFERENCYJNY_SPOLECZNE;
  const zusMonthsInPeriod = viewMode === "month" ? 1 : 12;
  const summaryPit = legalMode === "NDG" ? 0 : suggestedPit;
  const summaryZusWlasciciel = Math.round(zusSpoleczne * zusMonthsInPeriod * 100) / 100;
  const summaryZusPracownicy = 0;
  const summaryZdrowotna =
    legalMode === "NDG"
      ? 0
      : Math.round(zdrowotnaMiesiac * zusMonthsInPeriod * 100) / 100;
  const summaryKoszty = extraCostsSum;

  const ulgaNumer = jdgRegistrationDate
    ? numerMiesiacaUlgiNaStart(jdgRegistrationDate, selectedMonthKey)
    : null;

  const netProfit = useMemo(() => {
    const raw =
      totals.gross -
      totals.tutorShare -
      summaryPit -
      summaryZusWlasciciel -
      summaryZusPracownicy -
      summaryZdrowotna -
      summaryKoszty;
    return Math.round(raw * 100) / 100;
  }, [
    totals.gross,
    totals.tutorShare,
    summaryPit,
    summaryZusWlasciciel,
    summaryZusPracownicy,
    summaryZdrowotna,
    summaryKoszty,
  ]);

  // Zamknięty miesiąc - te same pozycje co w podsumowaniu.
  const closedZusTotal = summaryZusWlasciciel;
  const closedZdrowotna = summaryZdrowotna;
  const closedNetProfit = netProfit;

  // --- Limity NDG / VAT (zawsze względem bieżącego kwartału / roku kalendarzowego) ---
  const calendarNow = useMemo(() => new Date(), []);
  const currentYearNum = calendarNow.getFullYear();
  const currentQuarter = calendarQuarter(calendarNow.getMonth() + 1);
  const quarterMonthNums = monthsInQuarter(currentQuarter);

  const quarterGrossByMonth = useMemo(() => {
    return quarterMonthNums.map((m) => {
      const key = `${currentYearNum}-${String(m).padStart(2, "0")}`;
      return financeLines
        .filter((l) => l.monthKey === key)
        .reduce((s, l) => s + l.amountPln, 0);
    });
  }, [financeLines, quarterMonthNums, currentYearNum]);

  const ndgLimit = useMemo(() => obliczLimitNDG(quarterGrossByMonth), [quarterGrossByMonth]);

  const yearGrossByMonth = useMemo(() => {
    const months: number[] = [];
    for (let m = 1; m <= 12; m++) {
      const key = `${currentYearNum}-${String(m).padStart(2, "0")}`;
      months.push(
        financeLines.filter((l) => l.monthKey === key).reduce((s, l) => s + l.amountPln, 0),
      );
    }
    return months;
  }, [financeLines, currentYearNum]);

  const vatLimit = useMemo(() => obliczLimitVAT(yearGrossByMonth), [yearGrossByMonth]);

  const ndgExceedDate = useMemo(() => {
    if (!ndgLimit.przekroczono) return null;
    const qSet = new Set(
      quarterMonthNums.map((m) => `${currentYearNum}-${String(m).padStart(2, "0")}`),
    );
    const entries = financeLines
      .filter((l) => qSet.has(l.monthKey))
      .map((l) => ({ date: l.dateIso?.slice(0, 10) || l.date, amount: l.amountPln }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return znajdzDatePrzekroczeniaLimitu(entries, NDG_QUARTERLY_LIMIT);
  }, [ndgLimit.przekroczono, financeLines, quarterMonthNums, currentYearNum]);

  const ndgCeidgDaysLeft = ndgExceedDate ? dniPozostaleNaCeidg(ndgExceedDate) : null;

  const dochodNarastajacoOdStycznia = useMemo(() => {
    const year = selectedMonthKey.slice(0, 4);
    const toKey = viewMode === "month" ? selectedMonthKey : `${selectedYear}-12`;
    return monthKeysInclusive(`${year}-01`, toKey).reduce(
      (s, mk) =>
        s + taxableIncomeForMonth(mk, financeLines, payouts, localExpenses, effectiveClosedMonths, priceTiers),
      0,
    );
  }, [selectedMonthKey, selectedYear, viewMode, financeLines, payouts, localExpenses, effectiveClosedMonths, priceTiers]);

  const pitFreePct = Math.min(
    100,
    PIT_TAX_FREE_AMOUNT > 0 ? (dochodNarastajacoOdStycznia / PIT_TAX_FREE_AMOUNT) * 100 : 0,
  );

  const periodLabel =
    viewMode === "month" ? formatMonthLongPl(selectedMonthKey) : `Rok ${selectedYear}`;
  const isMonthClosed = viewMode === "month" && effectiveClosedMonths.includes(selectedMonthKey);
  const canClose = viewMode === "month" && canCloseMonth(selectedMonthKey);
  // monthSummary jest liczony server-side dla initialMonthKey - jeśli użytkownik właśnie
  // zmienił miesiąc (nawigacja w toku), traktujemy warunki jako niespełnione ostrożnie.
  const summaryMatchesSelection = selectedMonthKey === initialMonthKey;
  const lessonsReady = summaryMatchesSelection && monthSummary.lessonsReady;
  const payoutsReady = summaryMatchesSelection && monthSummary.payoutsReady;
  const checklistComplete = lessonsReady && payoutsReady && bankReconciled;

  const ewidencjaHref =
    viewMode === "month"
      ? `/admin/ksiegowosc/ewidencja?month=${selectedMonthKey}`
      : `/admin/ksiegowosc/ewidencja?year=${selectedYear}`;

  const kosztyHref =
    viewMode === "month"
      ? `/admin/ksiegowosc/koszty?month=${selectedMonthKey}`
      : `/admin/ksiegowosc/koszty?year=${selectedYear}`;

  const pdfBtnClass =
    "rounded-full bg-[#000C4A] px-2.5 py-1 text-[0.65rem] font-bold text-lime sm:px-3 sm:py-1.5 sm:text-xs";

  async function handleCloseMonth() {
    await closeMonth(selectedMonthKey);
    setLocalClosedMonths((prev) =>
      prev.includes(selectedMonthKey) ? prev : [...prev, selectedMonthKey],
    );
    setBankReconciled(false);
    router.refresh();
  }

  async function handleSwitchToJdg() {
    const result = await switchToJDG();
    setLegalMode("JDG");
    setJdgRegistrationDate(result.jdgRegistrationDate);
    router.refresh();
  }

  function handleAddExpense() {
    setExpenseFeedback("");
    const amount = Number(String(expenseForm.amountPln).replace(",", "."));
    const formData = new FormData();
    formData.set("month", selectedMonthKey);
    formData.set("invoiceDate", expenseForm.invoiceDate);
    formData.set("documentNumber", expenseForm.documentNumber);
    formData.set("expenseName", expenseForm.expenseName);
    formData.set("issuerName", expenseForm.issuerName);
    formData.set("amountPln", String(amount));
    if (expenseFile) formData.set("file", expenseFile);

    startExpense(async () => {
      try {
        const created = (await createOperatingExpense(formData)) as OperatingExpense | null;
        const draft: OperatingExpense = created ?? {
          id: `temp-${Date.now()}`,
          month: selectedMonthKey,
          invoice_date: expenseForm.invoiceDate,
          document_number: expenseForm.documentNumber.trim(),
          expense_name: expenseForm.expenseName.trim(),
          issuer_name: expenseForm.issuerName.trim(),
          amount_pln: Math.round(amount * 100) / 100,
          created_at: new Date().toISOString(),
          attachment_name: expenseFile?.name ?? null,
          attachment_path: null,
        };
        setLocalExpenses((prev) => [...prev, draft]);
        setExpenseForm({
          invoiceDate: `${selectedMonthKey}-01`,
          documentNumber: "",
          expenseName: "",
          issuerName: "",
          amountPln: "",
        });
        setExpenseFile(null);
        setExpenseFileKey((k) => k + 1);
        setExpenseFeedback("Dodano wydatek.");
        router.refresh();
      } catch (err) {
        setExpenseFeedback(err instanceof Error ? err.message : "Nie udało się dodać wydatku.");
      }
    });
  }

  function handleDeleteExpense(id: string) {
    setExpenseFeedback("");
    startExpense(async () => {
      try {
        await deleteOperatingExpense(id);
        setLocalExpenses((prev) => prev.filter((e) => e.id !== id));
        setExpenseFeedback("Usunięto wydatek.");
        router.refresh();
      } catch (err) {
        setExpenseFeedback(err instanceof Error ? err.message : "Nie udało się usunąć wydatku.");
      }
    });
  }

  function handleOpenAttachment(path: string) {
    startExpense(async () => {
      try {
        const url = await getSignedDownloadUrl(path);
        window.open(url, "_blank", "noopener,noreferrer");
      } catch (err) {
        setExpenseFeedback(err instanceof Error ? err.message : "Nie udało się otworzyć załącznika.");
      }
    });
  }

  function formatExpenseDate(iso: string): string {
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return iso;
    return `${d}.${m}.${y}`;
  }

  const th =
    "section-label border-b-2 border-paper bg-paper px-1 py-1 text-left leading-tight sm:px-1.5 sm:py-1.5";
  const td =
    "border-b-2 border-paper px-1 py-1 align-top text-[0.62rem] leading-tight break-words sm:px-1.5 sm:py-1.5 sm:text-[0.7rem]";
  const rowZebra = "bg-snow even:bg-paper/80 hover:bg-paper";

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="dash-sans text-depths text-lg font-semibold tracking-tight sm:text-xl">Księgowość</h1>
            {isMonthClosed ? (
              <span className="badge-done">
                Miesiąc zamknięty
              </span>
            ) : null}
          </div>
          <span className="mt-1.5 block h-1 w-8 rounded-full bg-lime" aria-hidden />
          <p className="text-muted mt-1.5 text-[0.7rem] capitalize leading-snug sm:text-xs">
            {periodLabel} - ewidencja sprzedaży bezrachunkowej (tylko VERIFIED).
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-end gap-2 sm:justify-end">
          {viewMode === "month" ? (
            <label className="grid min-w-0 gap-0.5">
              <span className="text-depths/80 text-[0.65rem] font-semibold sm:text-xs">Miesiąc</span>
              <select
                className="text-depths rounded-app border border-panel-frame/40 bg-white px-2 py-1 text-xs font-medium sm:px-2.5 sm:py-1.5"
                value={selectedMonthKey}
                onChange={(e) => {
                  const next = e.target.value;
                  setSelectedMonthKey(next);
                  setBankReconciled(false);
                  setExpenseForm((f) => ({ ...f, invoiceDate: `${next}-01` }));
                  router.push(`/admin/ksiegowosc?month=${next}`);
                }}
                aria-label="Miesiąc ewidencji sprzedaży"
              >
                {monthOptions.map((key) => (
                  <option key={key} value={key}>
                    {formatMonthLongPl(key)}
                    {effectiveClosedMonths.includes(key) ? " · zamknięty" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="grid min-w-0 gap-0.5">
              <span className="text-depths/80 text-[0.65rem] font-semibold sm:text-xs">Rok</span>
              <select
                className="text-depths rounded-app border border-panel-frame/40 bg-white px-2 py-1 text-xs font-medium sm:px-2.5 sm:py-1.5"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                aria-label="Rok ewidencji sprzedaży"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {!isMonthClosed ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <div className="flex flex-1 flex-col gap-1 rounded-app bg-paper p-1 sm:flex-row">
            {(
              [
                ["month", "Księgowość miesięczna"],
                ["year", "Księgowość roczna"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewMode(id)}
                className={`flex-1 rounded-app px-3 py-2 text-xs font-bold transition sm:text-sm ${
                  viewMode === id ? "nav-active" : "text-muted hover:text-depths"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <div className="flex flex-col gap-1 rounded-app bg-paper p-1 sm:flex-row sm:min-w-[11rem]">
              {(
                [
                  ["NDG", "NDG"],
                  ["JDG", "JDG"],
                ] as const
              ).map(([id, label]) => {
                const active = legalMode === id;
                const lockedToJdg = legalMode === "JDG" && id === "NDG";
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={lockedToJdg}
                    onClick={() => {
                      if (id === legalMode) return;
                      if (id === "JDG") setConfirmJdgOpen(true);
                    }}
                    className={`flex-1 rounded-app px-3 py-2 text-xs font-bold transition sm:text-sm ${
                      active ? "nav-active" : "text-muted hover:text-depths"
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                    title={
                      lockedToJdg
                        ? "Przejście na JDG jest nieodwracalne"
                        : id === "JDG" && legalMode === "NDG"
                          ? "Przejdź na JDG"
                          : undefined
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {legalMode === "NDG" ? (
              <button
                type="button"
                onClick={() => setConfirmJdgOpen(true)}
                className="text-muted hover:text-depths self-end px-1 text-[0.65rem] font-medium underline-offset-2 hover:underline"
              >
                Przejdź na JDG…
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-muted text-xs font-semibold">
          Tryb prawny: <span className="text-depths">{legalMode}</span>
          {legalMode === "JDG" && jdgRegistrationDate
            ? ` · KPiR od ${formatExpenseDate(jdgRegistrationDate)}`
            : null}
        </p>
      )}

      {legalMode === "NDG" ? (
        <QuarterlyLimitBar
          label={`Limit NDG · Q${currentQuarter} ${currentYearNum}`}
          aktualnaWartosc={ndgLimit.suma}
          limit={NDG_QUARTERLY_LIMIT}
          statusText={
            ndgLimit.przekroczono
              ? undefined
              : toneForLimitPercent(ndgLimit.procent) === "warn"
                ? "Zbliżasz się do limitu działalności nierejestrowanej"
                : "W limicie działalności nierejestrowanej"
          }
          alertText={
            ndgLimit.przekroczono
              ? "Przekroczono limit działalności nierejestrowanej. Od dnia przekroczenia masz 7 dni na złożenie wniosku CEIDG-1"
              : null
          }
          alertDetail={
            ndgLimit.przekroczono && ndgExceedDate
              ? `Przekroczono ${formatExpenseDate(ndgExceedDate)} · pozostało ${ndgCeidgDaysLeft ?? 0} dni`
              : null
          }
        />
      ) : (
        <div className="space-y-3">
          <p className="rounded-xl bg-snow px-4 py-3 text-sm font-medium text-depths ring-1 ring-panel-frame/40">
            Prowadzisz pełną KPiR od{" "}
            <span className="dash-mono font-bold">
              {jdgRegistrationDate ? formatExpenseDate(jdgRegistrationDate) : "-"}
            </span>
            .
          </p>
          <VatLimitBar
            label={`Limit zwolnienia VAT · ${currentYearNum}`}
            aktualnaWartosc={vatLimit.suma}
            limit={VAT_ANNUAL_LIMIT}
            statusText={
              vatLimit.przekroczono
                ? undefined
                : toneForLimitPercent(vatLimit.procent) === "warn"
                  ? "Zbliżasz się do limitu VAT"
                  : "W limicie zwolnienia VAT"
            }
            alertText={
              vatLimit.przekroczono
                ? "Przekroczono limit - rejestracja VAT czynny obowiązkowa"
                : null
            }
          />
        </div>
      )}

      <FinanceTilesRow columns={4}>
        <FinanceTile label="Przychód" tone="navy">
          <span className="mark-highlight-on-dark">{formatPln(totals.gross)}</span>
        </FinanceTile>
        <FinanceTile label="Koszty wypłaty / wszystkie" tone="orange">
          <span>
            {formatPln(totals.tutorShare)}
            <span className="opacity-40"> / </span>
            {formatPln(totals.allCosts)}
          </span>
          {legalMode === "NDG" ? (
            <span className="mt-2 block text-[0.55rem] font-semibold leading-snug tracking-normal opacity-80">
              ZUS studentów: 0 zł · PIT studentów: 0 zł (ulga dla młodych)
            </span>
          ) : null}
        </FinanceTile>
        <FinanceTile label="Marża agencji" tone="green">
          {formatPln(totals.agencyShare)}
        </FinanceTile>
        <FinanceTile label="Lekcje VERIFIED" tone="navy">
          {totals.lessonCount}
        </FinanceTile>
      </FinanceTilesRow>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-label">
            {viewMode === "year" ? `Ewidencja roczna · ${selectedYear}` : "Ewidencja sprzedaży"}
          </h2>
          <a href={ewidencjaHref} target="_blank" rel="noreferrer" className={pdfBtnClass}>
            Wygeneruj ewidencję PDF
          </a>
        </div>
        {viewMode === "year" ? (
          monthBreakdown.filter((r) => r.lessonCount > 0 || r.gross > 0).length === 0 ? (
            <p className="text-muted py-4 text-xs">Brak pozycji VERIFIED w tym roku.</p>
          ) : (
            <div className="max-h-[min(20rem,42vh)] overflow-y-auto overflow-x-hidden rounded-lg bg-snow scrollbar-panel sm:max-h-[min(24rem,50vh)] sm:rounded-app">
              <table className="w-full min-w-0 border-collapse">
                <thead className="sticky top-0 z-1 bg-paper">
                  <tr>
                    <th scope="col" className={`${th} w-[34%]`}>
                      Miesiąc
                    </th>
                    <th scope="col" className={`${th} w-[33%] text-right`}>
                      Suma z ewidencji miesięcznej
                    </th>
                    <th scope="col" className={`${th} w-[33%] text-right`}>
                      Kwota narastająco (suma roku)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let running = 0;
                    return monthBreakdown
                      .filter((r) => r.lessonCount > 0 || r.gross > 0)
                      .map((row) => {
                        running = Math.round((running + row.gross) * 100) / 100;
                        return (
                          <tr key={row.monthKey} className={rowZebra}>
                            <td className={`${td} capitalize font-medium`}>{row.label}</td>
                            <td className={`${td} text-right font-bold dash-mono`}>
                              {formatPln(row.gross)}
                            </td>
                            <td className={`${td} text-right font-bold dash-mono`}>
                              {formatPln(running)}
                            </td>
                          </tr>
                        );
                      });
                  })()}
                </tbody>
              </table>
            </div>
          )
        ) : ledgerRows.length === 0 ? (
          <p className="text-muted py-4 text-xs">Brak pozycji VERIFIED w tym miesiącu.</p>
        ) : (
          <div className="max-h-[min(20rem,42vh)] overflow-y-auto overflow-x-hidden rounded-lg bg-snow scrollbar-panel sm:max-h-[min(24rem,50vh)] sm:rounded-app">
            <table className="table-fixed w-full min-w-0 border-collapse">
              <thead className="sticky top-0 z-1 bg-paper">
                <tr>
                  <th scope="col" className={`${th} w-[5%]`}>
                    Lp.
                  </th>
                  <th scope="col" className={`${th} w-[11%]`}>
                    Data wykon.
                  </th>
                  <th scope="col" className={`${th} w-[11%]`}>
                    Data zapłaty
                  </th>
                  <th scope="col" className={`${th} w-[26%]`}>
                    Nazwa usługi
                  </th>
                  <th scope="col" className={`${th} w-[19%]`}>
                    Nabywca
                  </th>
                  <th scope="col" className={`${th} w-[12%] text-right`}>
                    Brutto
                  </th>
                  <th scope="col" className={`${th} w-[16%] text-right`}>
                    Kwota narastająco
                  </th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.map((r, i) => (
                  <tr key={r.id} className={rowZebra}>
                    <td className={`${td} dash-mono text-muted`}>{i + 1}</td>
                    <td className={`${td} dash-mono`}>{r.lessonDate}</td>
                    <td className={`${td} dash-mono`}>{r.paidAt}</td>
                    <td className={`${td} font-medium`}>{r.serviceName}</td>
                    <td className={td}>{r.buyer}</td>
                    <td className={`${td} text-right font-bold dash-mono`}>{r.grossPln} zł</td>
                    <td className={`${td} text-right font-bold dash-mono`}>{r.cumulativePln} zł</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-label">Zestawienie kosztów</h2>
          <a href={kosztyHref} target="_blank" rel="noreferrer" className={pdfBtnClass}>
            Wygeneruj zestawienie PDF
          </a>
        </div>
        <div className="mb-3">
          <p className="text-muted text-xs capitalize">
            {viewMode === "year"
              ? `${periodLabel} - wypłaty, premie i koszty dodatkowe z ewidencji miesięcznej`
              : `${periodLabel} - rachunki i faktury (koszty realne poza wypłatami tutorów)`}
          </p>
        </div>

        {viewMode === "month" ? (
          <>
            {isMonthClosed ? (
              <p className="dash-sans text-toffee mb-3 rounded-ledger border border-toffee/30 bg-butter/20 px-3 py-2 text-xs font-semibold">
                Miesiąc zamknięty - dodawanie i usuwanie kosztów jest zablokowane.
              </p>
            ) : (
            <div className="flex flex-nowrap items-end gap-1.5 overflow-x-auto rounded-app bg-snow p-2">
              <label className="grid min-w-30 shrink gap-0.5">
                <span className="section-label !text-muted leading-none">
                  Data rachunku/faktury
                </span>
                <input
                  type="date"
                  value={expenseForm.invoiceDate}
                  onChange={(ev) => setExpenseForm((f) => ({ ...f, invoiceDate: ev.target.value }))}
                  className="text-depths min-w-0 rounded-app border border-panel-frame/40 px-1.5 py-1 text-[0.65rem]"
                />
              </label>
              <label className="grid min-w-22 flex-1 gap-0.5">
                <span className="section-label !text-muted leading-none">Nr dok.</span>
                <input
                  value={expenseForm.documentNumber}
                  onChange={(ev) => setExpenseForm((f) => ({ ...f, documentNumber: ev.target.value }))}
                  placeholder="FV/12"
                  className="text-depths min-w-0 rounded-app border border-panel-frame/40 px-1.5 py-1 text-[0.65rem]"
                />
              </label>
              <label className="grid min-w-24 flex-[1.2] gap-0.5">
                <span className="section-label !text-muted leading-none">Nazwa</span>
                <input
                  value={expenseForm.expenseName}
                  onChange={(ev) => setExpenseForm((f) => ({ ...f, expenseName: ev.target.value }))}
                  placeholder="wydatek"
                  className="text-depths min-w-0 rounded-app border border-panel-frame/40 px-1.5 py-1 text-[0.65rem]"
                />
              </label>
              <label className="grid min-w-24 flex-[1.2] gap-0.5">
                <span className="section-label !text-muted leading-none">Wystawca</span>
                <input
                  value={expenseForm.issuerName}
                  onChange={(ev) => setExpenseForm((f) => ({ ...f, issuerName: ev.target.value }))}
                  placeholder="wystawca"
                  className="text-depths min-w-0 rounded-app border border-panel-frame/40 px-1.5 py-1 text-[0.65rem]"
                />
              </label>
              <label className="grid min-w-17 shrink gap-0.5">
                <span className="section-label !text-muted leading-none">Kwota</span>
                <input
                  value={expenseForm.amountPln}
                  onChange={(ev) => setExpenseForm((f) => ({ ...f, amountPln: ev.target.value }))}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="text-depths min-w-0 rounded-app border border-panel-frame/40 px-1.5 py-1 text-[0.65rem] dash-mono"
                />
              </label>
              <label className="grid min-w-17 shrink gap-0.5" title={expenseFile?.name ?? "Dodaj plik"}>
                <span className="section-label !text-muted leading-none">Plik</span>
                <span className="relative flex cursor-pointer items-center justify-center rounded-app border border-mist bg-snow px-1.5 py-1 text-depths hover:bg-paper">
                  <input
                    key={expenseFileKey}
                    type="file"
                    accept=".pdf,image/*,.jpg,.jpeg,.png,.webp,.heic"
                    onChange={(ev) => setExpenseFile(ev.target.files?.[0] ?? null)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label="Załącz plik"
                  />
                  {expenseFile ? (
                    <span className="max-w-18 truncate text-[0.65rem] font-medium leading-none">
                      {expenseFile.name}
                    </span>
                  ) : (
                    <svg
                      viewBox="0 0 16 16"
                      className="h-3.5 w-3.5 text-depths/70"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                    </svg>
                  )}
                </span>
              </label>
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={handleAddExpense}
                  disabled={pendingExpense}
                  className="whitespace-nowrap rounded-full bg-[#000C4A] px-2.5 py-1 text-[0.65rem] font-bold text-lime disabled:opacity-50"
                >
                  {pendingExpense ? "…" : "Dodaj"}
                </button>
              </div>
            </div>
            )}
            {expenseFeedback ? (
              <p
                className={`mt-2 text-xs font-medium ${
                  expenseFeedback.includes("Dodano") || expenseFeedback.includes("Usunięto")
                    ? "text-moss"
                    : "text-claret"
                }`}
              >
                {expenseFeedback}
              </p>
            ) : null}

            <h3 className="section-label mt-4">
              Lista kosztów · według daty
            </h3>
            {expensesForPeriod.length === 0 ? (
              <p className="text-muted py-3 text-xs">Brak kosztów w tym miesiącu - dodaj powyżej.</p>
            ) : (
              <div className="mt-2 max-h-[min(16rem,36vh)] overflow-auto rounded-app bg-snow scrollbar-panel">
                <table className="w-full min-w-176 border-collapse">
                  <thead className="sticky top-0 z-1 bg-paper">
                    <tr>
                      <th className={`${th} w-[5%]`}>Lp.</th>
                      <th className={`${th} w-[11%]`}>Data rachunku/faktury</th>
                      <th className={`${th} w-[12%]`}>Numer dokumentu</th>
                      <th className={`${th} w-[20%]`}>Nazwa wydatku</th>
                      <th className={`${th} w-[18%]`}>Dane wystawcy</th>
                      <th className={`${th} w-[10%] text-right`}>Kwota</th>
                      <th className={`${th} w-[14%]`}>Załącznik</th>
                      <th className={`${th} w-[10%]`} />
                    </tr>
                  </thead>
                  <tbody>
                    {expensesForPeriod.map((e, i) => (
                      <tr key={e.id} className={rowZebra}>
                        <td className={`${td} dash-mono text-muted`}>{i + 1}</td>
                        <td className={`${td} dash-mono`}>{formatExpenseDate(e.invoice_date)}</td>
                        <td className={`${td} font-medium`}>{e.document_number || "-"}</td>
                        <td className={`${td} font-medium`}>{e.expense_name}</td>
                        <td className={td}>{e.issuer_name}</td>
                        <td className={`${td} text-right font-bold dash-mono text-toffee`}>
                          {formatPln(Number(e.amount_pln))}
                        </td>
                        <td className={td}>
                          {e.attachment_path ? (
                            <button
                              type="button"
                              onClick={() => handleOpenAttachment(e.attachment_path!)}
                              disabled={pendingExpense}
                              className="text-[0.65rem] font-bold text-[#000C4A] hover:underline disabled:opacity-50"
                              title={e.attachment_name ?? "Załącznik"}
                            >
                              {e.attachment_name ? truncateFileName(e.attachment_name) : "Pobierz"}
                            </button>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className={td}>
                          {!isMonthClosed ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(e.id)}
                              disabled={pendingExpense}
                              className="text-[0.65rem] font-bold text-claret hover:underline disabled:opacity-50"
                            >
                              Usuń
                            </button>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : yearCostRows.length === 0 ? (
          <p className="text-muted py-3 text-xs">
            Brak kosztów w tym roku - pojawią się po wypłatach i kosztach z widoku miesięcznego.
          </p>
        ) : (
          <div className="max-h-[min(20rem,42vh)] overflow-auto rounded-app bg-snow scrollbar-panel">
            <table className="w-full min-w-xl border-collapse">
              <thead className="sticky top-0 z-1 bg-paper">
                <tr>
                  <th className={th}>Miesiąc</th>
                  <th className={`${th} text-right`}>Wypłaty</th>
                  <th className={`${th} text-right`}>Premie</th>
                  <th className={`${th} text-right`}>Koszty dodatkowe</th>
                  <th className={`${th} text-right`}>Suma</th>
                </tr>
              </thead>
              <tbody>
                {yearCostRows.map((row) => (
                  <tr key={row.monthKey} className={rowZebra}>
                    <td className={`${td} capitalize font-medium`}>{row.label}</td>
                    <td className={`${td} text-right dash-mono`}>{formatPln(row.payoutsPln)}</td>
                    <td className={`${td} text-right dash-mono`}>{formatPln(row.bonusesPln)}</td>
                    <td className={`${td} text-right dash-mono`}>{formatPln(row.extraCostsPln)}</td>
                    <td className={`${td} text-right font-bold dash-mono text-toffee`}>
                      {formatPln(row.totalPln)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-paper">
                  <td className={`${td} font-bold`}>Suma roku</td>
                  <td className={`${td} text-right font-bold dash-mono`}>
                    {formatPln(yearCostTotals.payoutsPln)}
                  </td>
                  <td className={`${td} text-right font-bold dash-mono`}>
                    {formatPln(yearCostTotals.bonusesPln)}
                  </td>
                  <td className={`${td} text-right font-bold dash-mono`}>
                    {formatPln(yearCostTotals.extraCostsPln)}
                  </td>
                  <td className={`${td} text-right font-black dash-mono text-toffee`}>
                    {formatPln(yearCostTotals.totalPln)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {!isMonthClosed ? (
      <section className="card-quiet p-3 sm:p-4">
        <h2 className="dash-sans text-depths text-sm font-semibold">
          {viewMode === "year"
            ? `Zestawienie roczne z podziałem miesięcznym · ${selectedYear}`
            : `Podsumowanie miesiąca · ${formatMonthLongPl(selectedMonthKey)}`}
        </h2>
        <p className="text-muted mt-0.5 text-xs capitalize">
          {viewMode === "year"
            ? "Te same wskaźniki co wyżej, rozbite na miesiące roku."
            : "Te same wskaźniki co wyżej, w podsumowaniu wybranego miesiąca."}
        </p>
        {periodSummaryRows.length === 0 ? (
          <p className="text-muted py-4 text-xs">
            {viewMode === "year" ? "Brak danych w tym roku." : "Brak danych w tym miesiącu."}
          </p>
        ) : (
          <div className="mt-3 max-h-[min(18rem,40vh)] overflow-auto rounded-app bg-snow scrollbar-panel">
            <table className="w-full min-w-3xl border-collapse">
              <thead>
                <tr>
                  <th className={th}>Miesiąc</th>
                  <th className={`${th} text-right`}>Przychód</th>
                  <th className={`${th} text-right`}>Koszty</th>
                  <th className={`${th} text-right`}>Marża</th>
                  <th className={`${th} text-right`}>Nauczyciele</th>
                  <th className={`${th} text-right`}>Uczniowie</th>
                  <th className={`${th} text-right`}>Lekcje</th>
                  <th className={`${th} text-right`}>Godziny</th>
                  <th className={`${th} text-right`}>Wypłaty PAID</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {periodSummaryRows.map((row) => (
                  <tr key={row.monthKey} className={rowZebra}>
                    <td className={`${td} capitalize font-medium`}>{row.label}</td>
                    <td className={`${td} text-right dash-mono`}>{formatPln(row.gross)}</td>
                    <td className={`${td} text-right dash-mono text-toffee`}>
                      {formatPln(row.tutorShare)}
                    </td>
                    <td className={`${td} text-right dash-mono text-moss`}>
                      {formatPln(row.agencyShare)}
                    </td>
                    <td className={`${td} text-right dash-mono`}>{row.tutorCount}</td>
                    <td className={`${td} text-right dash-mono`}>{row.studentCount}</td>
                    <td className={`${td} text-right dash-mono`}>{row.lessonCount}</td>
                    <td className={`${td} text-right dash-mono`}>
                      {row.hoursCount.toLocaleString("pl-PL", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 1,
                      })}
                    </td>
                    <td className={`${td} text-right dash-mono`}>{formatPln(row.paidPayouts)}</td>
                    <td className={td}>
                      {row.closed ? (
                        <span className="text-[0.6rem] font-bold uppercase text-moss">Zamknięty</span>
                      ) : (
                        <span className="text-[0.6rem] font-bold uppercase text-muted">Otwarty</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {yearSummaryTotals ? (
                <tfoot>
                  <tr className="bg-paper">
                    <td className={`${td} font-bold`}>Suma roku</td>
                    <td className={`${td} text-right font-bold dash-mono`}>
                      {formatPln(yearSummaryTotals.gross)}
                    </td>
                    <td className={`${td} text-right font-bold dash-mono text-toffee`}>
                      {formatPln(yearSummaryTotals.costs)}
                    </td>
                    <td className={`${td} text-right font-bold dash-mono text-moss`}>
                      {formatPln(yearSummaryTotals.margin)}
                    </td>
                    <td className={`${td} text-right dash-mono text-muted`}>-</td>
                    <td className={`${td} text-right dash-mono text-muted`}>-</td>
                    <td className={`${td} text-right font-bold dash-mono`}>
                      {yearSummaryTotals.lessonCount}
                    </td>
                    <td className={`${td} text-right font-bold dash-mono`}>
                      {yearSummaryTotals.hoursCount.toLocaleString("pl-PL", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 1,
                      })}
                    </td>
                    <td className={`${td} text-right font-bold dash-mono`}>
                      {formatPln(yearSummaryTotals.paidPayouts)}
                    </td>
                    <td className={td} />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        )}
      </section>
      ) : null}

      {!isMonthClosed ? (
      <section className="card-quiet p-4 sm:p-5">
        <h2 className="dash-sans text-depths text-base font-semibold tracking-tight">Rozliczenia - Zrób to sam</h2>
        <p className="text-muted mt-1 text-xs">
          Tylko to, co dotyczy Twojej firmy ·{" "}
          <span className="capitalize">{periodLabel}</span> · dane VERIFIED + wypłaty PAID
          {legalMode === "JDG" && viewMode === "year" ? " · ZUS × 12 miesięcy" : null}
          {" · "}
          <span className="font-semibold text-depths">{legalMode}</span>
        </p>

        {legalMode === "NDG" ? (
          <div className="mt-5 space-y-4">
            <article className="card-quiet p-4">
              <h3 className="dash-sans text-depths text-sm font-bold">Za co płacisz</h3>
              <ul className="mt-3 space-y-3 text-sm">
                <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div>
                    <p className="font-semibold text-depths">Podatek dochodowy</p>
                    <p className="text-muted text-xs">PIT-36 · dopiero w zeznaniu do 30 kwietnia</p>
                  </div>
                  <span className="dash-mono text-base font-black text-depths">{formatPln(0)}</span>
                </li>
                <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div>
                    <p className="font-semibold text-depths">Twój ZUS</p>
                    <p className="text-muted text-xs">NDG - brak składek społecznych</p>
                  </div>
                  <span className="dash-mono text-base font-black text-depths">{formatPln(0)}</span>
                </li>
                <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div>
                    <p className="font-semibold text-depths">Składka zdrowotna</p>
                    <p className="text-muted text-xs">NDG - brak obowiązku</p>
                  </div>
                  <span className="dash-mono text-base font-black text-depths">{formatPln(0)}</span>
                </li>
                <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div>
                    <p className="font-semibold text-depths">ZUS pracowników</p>
                    <p className="text-muted text-xs">Studenci &lt;26 lat - zwolnienie</p>
                  </div>
                  <span className="dash-mono text-base font-black text-depths">{formatPln(0)}</span>
                </li>
                <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div>
                    <p className="font-semibold text-depths">VAT</p>
                    <p className="text-muted text-xs">NDG nie jest podatnikiem VAT</p>
                  </div>
                  <span className="dash-mono text-base font-black text-depths">{formatPln(0)}</span>
                </li>
              </ul>
              <div className="mt-4 border-t border-panel-frame/20 pt-4">
                <p className="text-muted mb-2 text-xs">
                  Dochód narastająco vs kwota wolna {formatCurrencyPln(PIT_TAX_FREE_AMOUNT)}
                </p>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="dash-mono text-sm font-bold text-depths">
                    {formatPln(dochodNarastajacoOdStycznia)}
                  </span>
                  <span className="text-muted text-xs">/ {formatCurrencyPln(PIT_TAX_FREE_AMOUNT)}</span>
                </div>
                <div
                  className="mt-2 h-3 overflow-hidden rounded-full bg-panel-frame/50"
                  role="progressbar"
                  aria-valuenow={Math.round(pitFreePct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-lime transition-[width]"
                    style={{ width: `${Math.min(100, pitFreePct)}%` }}
                  />
                </div>
              </div>
            </article>

            <article className="card-quiet p-4">
              <ProfitSummary
                gross={totals.gross}
                payouts={paidPayoutsSum}
                pit={summaryPit}
                zusOwn={summaryZusWlasciciel}
                zusEmployees={summaryZusPracownicy}
                health={summaryZdrowotna}
                costs={summaryKoszty}
                netProfit={netProfit}
              />
            </article>
          </div>
        ) : (
          <>
        <div className="mt-5 space-y-4">
          <article className="card-quiet p-4">
            <h3 className="dash-sans text-depths text-sm font-bold">Za co płacisz</h3>
            <ul className="mt-3 space-y-3 text-sm">
              <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div>
                  <p className="font-semibold text-depths">Podatek dochodowy</p>
                  <p className="text-muted text-xs">
                    Zaliczka PIT 12%
                    {viewMode === "month" ? " · przelew do 20. dnia kolejnego miesiąca" : " · suma zaliczek w okresie"}
                  </p>
                </div>
                <span className="dash-mono text-base font-black text-depths">{formatPln(summaryPit)}</span>
              </li>
              <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div>
                  <p className="font-semibold text-depths">Twój ZUS</p>
                  <p className="text-muted text-xs">
                    Tylko składki społeczne
                    {ulgaNumer != null
                      ? ` · Ulga na start, miesiąc ${ulgaNumer}/6`
                      : jdgRegistrationDate
                        ? " · Preferencyjny (po Ulgi na start)"
                        : ""}
                    {viewMode === "year" ? " · × 12" : ""}
                  </p>
                </div>
                <span className="dash-mono text-base font-black text-depths">
                  {formatPln(summaryZusWlasciciel)}
                </span>
              </li>
              <li>
                <label className="grid max-w-md gap-1">
                  <span className="text-muted text-[0.65rem] font-semibold uppercase tracking-wide">
                    Etap ZUS
                  </span>
                  <select
                    value={zusStage}
                    onChange={(e) => setZusStage(e.target.value as JdgZusStage)}
                    className="text-depths rounded-app border border-panel-frame/40 bg-white px-3 py-2 text-sm"
                  >
                    <option value="start">
                      Ulga na start - {formatCurrencyPln(ZUS_ULGA_NA_START_SPOLECZNE)} społeczne
                    </option>
                    <option value="maly">
                      Preferencyjny - {formatCurrencyPln(ZUS_PREFERENCYJNY_SPOLECZNE)} społeczne
                    </option>
                  </select>
                </label>
              </li>
              <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div>
                  <p className="font-semibold text-depths">Składka zdrowotna</p>
                  <p className="text-muted text-xs">
                    9% dochodu, nie mniej niż {formatCurrencyPln(SKLADKA_ZDROWOTNA_MINIMUM)}
                    {viewMode === "year" ? " · × 12" : ""}
                  </p>
                </div>
                <span className="dash-mono text-base font-black text-depths">
                  {formatPln(summaryZdrowotna)}
                </span>
              </li>
              <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div>
                  <p className="font-semibold text-depths">ZUS pracowników</p>
                  <p className="text-muted text-xs">Studenci &lt;26 lat - zwolnienie</p>
                </div>
                <span className="dash-mono text-base font-black text-depths">
                  {formatPln(summaryZusPracownicy)}
                </span>
              </li>
              <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div>
                  <p className="font-semibold text-depths">PIT pracowników</p>
                  <p className="text-muted text-xs">Ulga dla młodych</p>
                </div>
                <span className="dash-mono text-base font-black text-depths">{formatPln(0)}</span>
              </li>
            </ul>
          </article>
        </div>

        <article className="card-quiet mt-5 p-4">
          <ProfitSummary
            gross={totals.gross}
            payouts={paidPayoutsSum}
            pit={summaryPit}
            zusOwn={summaryZusWlasciciel}
            zusEmployees={summaryZusPracownicy}
            health={summaryZdrowotna}
            costs={summaryKoszty}
            netProfit={netProfit}
          />
        </article>

        <p className="mt-4 text-xs font-medium text-claret">
          {viewMode === "month"
            ? "Pamiętaj, aby do 25. dnia miesiąca wysłać plik JPK_V7 (KPiR) z Twojego programu księgowego!"
            : "W ciągu roku JPK_V7 wysyłasz miesięcznie - ten widok pomaga kontrolować sumy roczne."}
        </p>
          </>
        )}
      </section>
      ) : null}

      {viewMode === "month" ? (
        isMonthClosed ? (
          <section className="card-quiet p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-moss/15 text-moss">
                <IconLock className="h-5 w-5" />
              </span>
              <div>
                <p className="section-label text-base !tracking-wide">
                  Miesiąc zamknięty - ukończony etap
                </p>
                <p className="text-muted mt-0.5 text-xs capitalize">
                  {periodLabel} - rozliczenie zakończone i zarchiwizowane. Poniższe liczby są ostateczne i
                  niemodyfikowalne.
                </p>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-dashed border-moss/25 pt-6 sm:grid-cols-4">
              <ClosedFigure label="Przychód" value={formatPln(totals.gross)} />
              <ClosedFigure label="Wypłaty" value={formatPln(paidPayoutsSum)} />
              <ClosedFigure label="Podatek dochodowy" value={formatPln(summaryPit)} />
              <ClosedFigure label="Twój ZUS" value={formatPln(closedZusTotal)} />
              <ClosedFigure label="ZUS pracowników" value={formatPln(summaryZusPracownicy)} />
              <ClosedFigure label="Zdrowotna" value={formatPln(closedZdrowotna)} />
              <ClosedFigure label="Koszty" value={formatPln(summaryKoszty)} />
              <ClosedFigure
                label={closedNetProfit < 0 ? "Strata na rękę" : "Zysk na rękę"}
                value={formatPln(closedNetProfit)}
                tone={closedNetProfit < 0 ? "claret" : "moss"}
                emphasis
              />
            </dl>

            <p className="text-muted mt-6 border-t border-dashed border-moss/25 pt-4 text-[0.7rem]">
              Pliki PDF (ewidencja sprzedaży, zestawienie kosztów) są wciąż dostępne w sekcjach powyżej.
            </p>
          </section>
        ) : (
          <section className="card-quiet p-4 sm:p-5">
            <div>
              <h2 className="section-label text-base">Kreator zamknięcia miesiąca</h2>
              <p className="text-muted mt-1 text-xs capitalize">
                {periodLabel}
                {!canClose ? " - zamknięcie dostępne od 6. dnia następnego miesiąca." : " - spełnij warunki, aby zamknąć miesiąc."}
              </p>
            </div>

            <ul className="mt-4 space-y-2">
              <li
                className={`flex items-center gap-2 rounded-ledger border px-3 py-2 text-sm ${
                  lessonsReady ? "border-moss/30 bg-moss/5 text-moss" : "border-claret/25 bg-claret/5 text-claret"
                }`}
              >
                <span className="dash-mono text-xs font-bold">{lessonsReady ? "✓" : "✗"}</span>
                <span className="font-medium">
                  Warunek 1 - wszystkie lekcje mają status VERIFIED lub UNPAID (brak PLANNED / do weryfikacji)
                </span>
              </li>
              <li
                className={`flex items-center gap-2 rounded-ledger border px-3 py-2 text-sm ${
                  payoutsReady ? "border-moss/30 bg-moss/5 text-moss" : "border-claret/25 bg-claret/5 text-claret"
                }`}
              >
                <span className="dash-mono text-xs font-bold">{payoutsReady ? "✓" : "✗"}</span>
                <span className="font-medium">Warunek 2 - wszystkie wypłaty tutorów mają status PAID</span>
              </li>
              <li>
                <label className="flex cursor-pointer items-center gap-2 rounded-ledger border border-panel-frame/25 bg-snow px-3 py-2 text-sm text-depths hover:bg-paper">
                  <input
                    type="checkbox"
                    checked={bankReconciled}
                    onChange={() => setBankReconciled((v) => !v)}
                    disabled={!canClose}
                  />
                  <span className="font-medium">Warunek 3 - potwierdzam zgodność salda z kontem bankowym</span>
                </label>
              </li>
            </ul>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmCloseOpen(true)}
                disabled={!canClose || !checklistComplete}
                className="btn-block bg-[#000C4A] px-5 py-2.5 text-xs text-lime disabled:opacity-50"
              >
                Zamknij miesiąc
              </button>
            </div>
          </section>
        )
      ) : (
        <section className="card-quiet p-4 sm:p-5">
          <h2 className="dash-sans text-depths text-base font-semibold tracking-tight">Zamknięcia w roku {selectedYear}</h2>
          <p className="text-muted mt-1 text-xs">
            Zamknięcie dotyczy zawsze konkretnego miesiąca - tu widzisz statusy. Przełącz na widok miesięczny, aby
            zamknąć wybrany miesiąc.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {monthBreakdown.map((row) => (
              <li
                key={row.monthKey}
                className="flex items-center justify-between gap-2 border-b-2 border-paper px-1 py-2 last:border-0"
              >
                <span className="text-depths text-xs font-medium capitalize">{row.label}</span>
                {row.closed ? (
                  <span className="text-[0.65rem] font-bold uppercase text-moss">Zamknięty</span>
                ) : (
                  <span className="text-[0.65rem] font-bold uppercase text-muted">Otwarty</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={confirmCloseOpen}
        tone="positive"
        title={`Zamknąć ${periodLabel}?`}
        description="Miesiąc zostanie oznaczony jako zamknięty - dodawanie/usuwanie kosztów oraz edycja lekcji, wypłat i wydatków za ten miesiąc będzie zablokowana. Tej operacji nie można cofnąć z UI."
        confirmLabel="Zamknij miesiąc"
        successMessage="Miesiąc został zamknięty."
        onConfirm={handleCloseMonth}
        onCancel={() => setConfirmCloseOpen(false)}
      />

      <ConfirmDialog
        open={confirmJdgOpen}
        tone="danger"
        title="Przejść na JDG?"
        description="Przełączenie z działalności nierejestrowanej (NDG) na jednoosobową działalność gospodarczą (JDG) jest nieodwracalne. Zapiszemy datę rejestracji jako dziś i od tego momentu panel będzie liczył zaliczki PIT, ZUS oraz limit VAT jak dla KPiR."
        confirmLabel="Przejdź na JDG"
        successMessage="Tryb prawny: JDG."
        onConfirm={handleSwitchToJdg}
        onCancel={() => setConfirmJdgOpen(false)}
      />
    </div>
  );
}

/** Pozycja w statycznym, archiwalnym podsumowaniu zamkniętego miesiąca - bez interakcji. */
function ClosedFigure({
  label,
  value,
  tone = "depths",
  emphasis = false,
}: {
  label: string;
  value: string;
  tone?: "depths" | "moss" | "claret";
  emphasis?: boolean;
}) {
  const toneClass = tone === "moss" ? "text-moss" : tone === "claret" ? "text-claret" : "text-depths";
  return (
    <div>
      <p className="section-label !text-muted">{label}</p>
      <p className={`dash-mono mt-1 ${emphasis ? "text-lg font-black" : "text-sm font-bold"} ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

/** Uproszczone podsumowanie P&L - te same pozycje w NDG i JDG (zera tam, gdzie nie dotyczy). */
function ProfitSummary({
  gross,
  payouts,
  pit,
  zusOwn,
  zusEmployees,
  health,
  costs,
  netProfit,
}: {
  gross: number;
  payouts: number;
  pit: number;
  zusOwn: number;
  zusEmployees: number;
  health: number;
  costs: number;
  netProfit: number;
}) {
  const row = "flex justify-between gap-4";
  return (
    <>
      <h3 className="section-label">Podsumowanie</h3>
      <ul className="mt-3 space-y-2 text-sm">
        <li className={row}>
          <span className="font-semibold uppercase tracking-wide text-depths">Przychód</span>
          <span className="font-bold dash-mono text-depths">{formatPln(gross)}</span>
        </li>
        <li className={`${row} text-toffee`}>
          <span className="font-semibold uppercase tracking-wide">− Wypłaty</span>
          <span className="font-bold dash-mono">{formatPln(payouts)}</span>
        </li>
        <li className={`${row} text-toffee`}>
          <span className="font-semibold uppercase tracking-wide">− Podatek dochodowy</span>
          <span className="font-bold dash-mono">{formatPln(pit)}</span>
        </li>
        <li className={`${row} text-toffee`}>
          <span className="font-semibold uppercase tracking-wide">− Twój ZUS</span>
          <span className="font-bold dash-mono">{formatPln(zusOwn)}</span>
        </li>
        <li className={`${row} text-toffee`}>
          <span className="font-semibold uppercase tracking-wide">− ZUS pracowników</span>
          <span className="font-bold dash-mono">{formatPln(zusEmployees)}</span>
        </li>
        <li className={`${row} text-toffee`}>
          <span className="font-semibold uppercase tracking-wide">− Zdrowotna</span>
          <span className="font-bold dash-mono">{formatPln(health)}</span>
        </li>
        <li className={`${row} text-toffee`}>
          <span className="font-semibold uppercase tracking-wide">− Koszty</span>
          <span className="font-bold dash-mono">{formatPln(costs)}</span>
        </li>
        <li
          className={`${row} items-end border-t-2 border-depths/15 pt-3 ${
            netProfit < 0 ? "border-claret/40" : "border-moss/30"
          }`}
        >
          <span
            className={`dash-sans text-lg font-black uppercase tracking-tight sm:text-xl ${
              netProfit < 0 ? "text-claret" : "text-moss"
            }`}
          >
            {netProfit < 0 ? "Strata na rękę" : "Zysk na rękę"}
          </span>
          <span className="dash-mono text-2xl font-black tabular-nums text-depths sm:text-3xl">
            {formatPln(netProfit)}
          </span>
        </li>
      </ul>
    </>
  );
}
