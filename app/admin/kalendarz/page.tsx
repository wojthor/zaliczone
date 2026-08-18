import { DATES } from "@/lib/dates";
import { KalendarzClient } from "./kalendarz-client";

function previousMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y!, m! - 2, 15);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthKey(d = new Date()): string {
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

function lastDayOfMonthIso(year: number, month1Based: number): string {
  const d = new Date(year, month1Based, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AdminKalendarzPage() {
  const today = new Date();
  const monthKey = currentMonthKey(today);
  const prevKey = previousMonthKey(monthKey);
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const prevLabel = formatMonthLongPl(prevKey);

  const ewidencjaDeadlineIsoDate = isoFromYmd(y, m, DATES.ewidencja.deadlineDayOfNextMonth);
  const rachunekSendIso = isoFromYmd(y, m, DATES.rachunek.sendDayOfNextMonth);
  const rachunekDeadlineIso = isoFromYmd(y, m, DATES.rachunek.signedDeadlineDayOfNextMonth);
  const verificationIso = isoFromYmd(y, m, DATES.verification.fromDayOfNextMonth);
  const payoutDeadlineIso = isoFromYmd(y, m, DATES.payout.deadlineDayOfNextMonth);
  const monthCloseIso = isoFromYmd(y, m, DATES.monthClose.targetDayOfNextMonth);
  const financeReviewIso = isoFromYmd(y, m, DATES.financeReview.dayOfNextMonth);
  const taxesIso = isoFromYmd(y, m, DATES.taxes.deadlineDayOfNextMonth);

  const yearEndYear = m === 1 || m === 2 || m === 3 || m === 4 ? y : y + 1;
  const yearClosedLabel = String(yearEndYear - 1);

  const deadlines = [
    {
      id: "ewidencja-deadline",
      label: `Ewidencje podpisane (do) · ${prevLabel}`,
      dateLabel: formatDayPl(ewidencjaDeadlineIsoDate),
      dateIso: ewidencjaDeadlineIsoDate,
      daysLeft: daysUntilIso(ewidencjaDeadlineIsoDate, today),
      href: "/admin/wyplaty",
    },
    {
      id: "rachunek-send",
      label: `Wysyłka rachunków do podpisania · ${prevLabel}`,
      dateLabel: formatDayPl(rachunekSendIso),
      dateIso: rachunekSendIso,
      daysLeft: daysUntilIso(rachunekSendIso, today),
      href: "/admin/wyplaty",
    },
    {
      id: "rachunek-deadline",
      label: `Rachunki podpisane (do) · ${prevLabel}`,
      dateLabel: formatDayPl(rachunekDeadlineIso),
      dateIso: rachunekDeadlineIso,
      daysLeft: daysUntilIso(rachunekDeadlineIso, today),
      href: "/admin/wyplaty",
    },
    {
      id: "verification",
      label: `Weryfikacja z systemem · ${prevLabel}`,
      dateLabel: formatDayPl(verificationIso),
      dateIso: verificationIso,
      daysLeft: daysUntilIso(verificationIso, today),
      href: "/admin/rozliczenia",
    },
    {
      id: "payout",
      label: `Wypłaty + odznaczenie · ${prevLabel}`,
      dateLabel: formatDayPl(payoutDeadlineIso),
      dateIso: payoutDeadlineIso,
      daysLeft: daysUntilIso(payoutDeadlineIso, today),
      href: "/admin/wyplaty",
    },
    {
      id: "month-close",
      label: `Zamknięcie miesiąca + koszty · ${prevLabel}`,
      dateLabel: formatDayPl(monthCloseIso),
      dateIso: monthCloseIso,
      daysLeft: daysUntilIso(monthCloseIso, today),
      href: "/admin/ksiegowosc",
    },
    {
      id: "finance-review",
      label: `Weryfikacja finansów (limity) · ${prevLabel}`,
      dateLabel: formatDayPl(financeReviewIso),
      dateIso: financeReviewIso,
      daysLeft: daysUntilIso(financeReviewIso, today),
      href: "/admin/ksiegowosc",
    },
    {
      id: "taxes",
      label: "Podatki / zaliczka PIT (JDG)",
      dateLabel: formatDayPl(taxesIso),
      dateIso: taxesIso,
      daysLeft: daysUntilIso(taxesIso, today),
      href: "/admin/ksiegowosc",
    },
    {
      id: "year-cost-summary",
      label: `Zestawienie kosztów rok ${yearClosedLabel}`,
      dateLabel: formatDayPl(isoFromYmd(yearEndYear, 1, DATES.yearEnd.costSummaryDay)),
      dateIso: isoFromYmd(yearEndYear, 1, DATES.yearEnd.costSummaryDay),
      daysLeft: daysUntilIso(isoFromYmd(yearEndYear, 1, DATES.yearEnd.costSummaryDay), today),
      href: "/admin/ksiegowosc/koszty",
    },
    {
      id: "year-pit11",
      label: `PIT-11 do US · rok ${yearClosedLabel}`,
      dateLabel: formatDayPl(lastDayOfMonthIso(yearEndYear, DATES.yearEnd.pit11ToUsMonth)),
      dateIso: lastDayOfMonthIso(yearEndYear, DATES.yearEnd.pit11ToUsMonth),
      daysLeft: daysUntilIso(lastDayOfMonthIso(yearEndYear, DATES.yearEnd.pit11ToUsMonth), today),
      href: "/admin/ksiegowosc",
    },
    {
      id: "year-pit-teachers",
      label: `PIT-y do nauczycieli · rok ${yearClosedLabel}`,
      dateLabel: formatDayPl(lastDayOfMonthIso(yearEndYear, DATES.yearEnd.pitToTeachersMonth)),
      dateIso: lastDayOfMonthIso(yearEndYear, DATES.yearEnd.pitToTeachersMonth),
      daysLeft: daysUntilIso(lastDayOfMonthIso(yearEndYear, DATES.yearEnd.pitToTeachersMonth), today),
      href: "/admin/nauczyciele",
    },
    {
      id: "year-pit36",
      label: `PIT-36 właściciela · rok ${yearClosedLabel}`,
      dateLabel: formatDayPl(lastDayOfMonthIso(yearEndYear, DATES.yearEnd.pit36Month)),
      dateIso: lastDayOfMonthIso(yearEndYear, DATES.yearEnd.pit36Month),
      daysLeft: daysUntilIso(lastDayOfMonthIso(yearEndYear, DATES.yearEnd.pit36Month), today),
      href: "/admin/ksiegowosc",
    },
    {
      id: "year-close",
      label: `Zamknięcie roku ${yearClosedLabel}`,
      dateLabel: formatDayPl(isoFromYmd(yearEndYear, 5, 1)),
      dateIso: isoFromYmd(yearEndYear, 5, 1),
      daysLeft: daysUntilIso(isoFromYmd(yearEndYear, 5, 1), today),
      href: "/admin/ksiegowosc",
    },
  ];

  return <KalendarzClient deadlines={deadlines} />;
}
