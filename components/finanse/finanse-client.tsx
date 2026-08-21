"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { tutorPayoutFromCennik, sumTutorPayoutFromCennik, financeLinesHours } from "@/lib/data/mappers";
import { TUTOR_SHARE, bonusProgress, ewidencjaAvailableFromHint, isEwidencjaPdfAvailable } from "@/lib/dates";
import type { FinanceLineUi, Payout } from "@/lib/types/database";
import type { PriceTier } from "@/lib/types/messages";

function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function enumerateMonthsInclusive(from: string, to: string): string[] {
  if (from > to) return [];
  const out: string[] = [];
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  let y = fy!;
  let mo = fm!;
  while (y < ty! || (y === ty! && mo <= tm!)) {
    out.push(`${y}-${String(mo).padStart(2, "0")}`);
    mo += 1;
    if (mo > 12) {
      mo = 1;
      y += 1;
    }
  }
  return out;
}

function formatMonthLongPl(monthKey: string): string {
  const [ys, ms] = monthKey.split("-");
  const d = new Date(Number(ys), Number(ms) - 1, 15);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

export function FinanseClient({
  financeLines,
  studentCount,
  priceTiers,
  payouts = [],
  closedMonths = [],
}: {
  financeLines: FinanceLineUi[];
  studentCount: number;
  priceTiers: PriceTier[];
  payouts?: Payout[];
  closedMonths?: string[];
}) {
  const nowKey = useMemo(() => currentMonthKey(), []);
  const [selectedMonthKey, setSelectedMonthKey] = useState(nowKey);
  const [cennikOpen, setCennikOpen] = useState(false);

  const earliestKey = useMemo(() => {
    if (financeLines.length === 0) return nowKey;
    return financeLines.reduce(
      (min, line) => (line.monthKey < min ? line.monthKey : min),
      financeLines[0]!.monthKey,
    );
  }, [financeLines, nowKey]);

  const monthOptions = useMemo(
    () => enumerateMonthsInclusive(earliestKey, nowKey).slice().reverse(),
    [earliestKey, nowKey],
  );
  const linesForMonth = useMemo(
    () => financeLines.filter((line) => line.monthKey === selectedMonthKey),
    [financeLines, selectedMonthKey],
  );
  const lessonsSharePln = useMemo(
    () => sumTutorPayoutFromCennik(linesForMonth, priceTiers, TUTOR_SHARE),
    [linesForMonth, priceTiers],
  );
  const hoursMonth = useMemo(() => financeLinesHours(linesForMonth), [linesForMonth]);
  const bonus = useMemo(() => bonusProgress(hoursMonth), [hoursMonth]);
  const expectedPayoutPln = useMemo(
    () => Math.round((lessonsSharePln + (bonus.achieved ? bonus.bonusPln : 0)) * 100) / 100,
    [lessonsSharePln, bonus],
  );
  const studentsInMonth = useMemo(
    () => new Set(linesForMonth.map((line) => line.studentName)).size,
    [linesForMonth],
  );
  const payoutForMonth = useMemo(
    () => payouts.find((p) => p.month === selectedMonthKey) ?? null,
    [payouts, selectedMonthKey],
  );

  useEffect(() => {
    if (!cennikOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCennikOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cennikOpen]);

  const monthLabel = formatMonthLongPl(selectedMonthKey);
  const isCurrentMonth = selectedMonthKey === nowKey;
  const hasVerifiedLessons = linesForMonth.length > 0;
  const dateUnlocked = isEwidencjaPdfAvailable(selectedMonthKey);
  const canGenerateEwidencja = hasVerifiedLessons && dateUnlocked;
  const isPayoutMarkedPaid = payoutForMonth?.status === "PAID";
  const monthPicker = (
    <label className="grid w-full max-w-full gap-1 sm:w-auto sm:min-w-56">
      <span className="text-depths/80 text-xs font-semibold">Miesiąc</span>
      <select
        className="text-depths rounded-full border border-panel-frame/50 bg-snow px-4 py-2 text-sm font-medium"
        value={selectedMonthKey}
        onChange={(e) => setSelectedMonthKey(e.target.value)}
      >
        {monthOptions.map((key) => (
          <option key={key} value={key}>
            {formatMonthLongPl(key)}
            {closedMonths.includes(key) ? " · zamknięty" : ""}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <PageShell title="Finanse" titleAside={monthPicker}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-muted max-w-xl text-sm font-medium">
          Widzisz tu tylko zarobki z lekcji, które placówka już zatwierdziła. Od tej kwoty liczymy
          Twoją wypłatę.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto">
          <label className="grid w-full shrink-0 gap-1 sm:w-auto">
            <span className="text-depths/80 text-xs font-semibold">Stawki</span>
            <button
              type="button"
              onClick={() => setCennikOpen(true)}
              className="landing-navy rounded-full px-4 py-2 text-sm font-semibold text-lime transition hover:brightness-110"
            >
              Cennik
            </button>
          </label>
        </div>
      </div>

      <section className="tutor-panel-surface mb-4 flex flex-wrap items-center justify-between gap-3 border border-depths/10 px-4 py-3.5">
        <div className="min-w-0">
          <p className="section-label">Ewidencja zajęć</p>
          <p className="text-muted mt-0.5 text-[11px] leading-snug">PDF za {monthLabel}</p>
        </div>
        {canGenerateEwidencja ? (
          <a
            href={`/finanse/ewidencja?month=${selectedMonthKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="landing-navy inline-flex shrink-0 items-center rounded-full px-4 py-2 text-xs font-semibold text-lime"
          >
            Generuj
          </a>
        ) : (
          <p className="text-muted max-w-[16rem] shrink-0 text-right text-[11px] leading-snug">
            {hasVerifiedLessons ? ewidencjaAvailableFromHint(monthLabel) : "Brak zatwierdzonych lekcji"}
          </p>
        )}
      </section>

      {cennikOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button type="button" className="absolute inset-0 bg-[#000C4A]/50" aria-label="Zamknij cennik" onClick={() => setCennikOpen(false)} />
          <div className="confirm-dialog-in relative z-10 flex max-h-[min(92dvh,36rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-app border border-panel-frame/70 bg-snow/95 sm:rounded-app">
            <span className="mx-auto mt-2 mb-1 block h-1 w-10 shrink-0 rounded-full bg-panel-frame/40 sm:hidden" />
            <div className="relative shrink-0 px-5 pt-3 sm:px-8 sm:pt-8">
              <button
                type="button"
                onClick={() => setCennikOpen(false)}
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-xl font-light leading-none text-depths/60 transition-colors hover:bg-luster/80 hover:text-depths touch-manipulation"
                aria-label="Zamknij cennik"
              >
                ×
              </button>
              <h2 className="pr-12 text-lg font-medium tracking-tight text-depths">Cennik</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Aktualne stawki za godzinę zajęć (umowa zlecenia).
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-8">
            {priceTiers.length === 0 ? (
              <p className="mt-6 text-sm font-medium text-muted">Brak pozycji w cenniku.</p>
            ) : (
              <table className="table-fixed mt-6 w-full min-w-0 border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-paper">
                    <th className="section-label !text-muted pb-2.5">Poziom</th>
                    <th className="section-label !text-muted pb-2.5 text-right">Cena</th>
                    <th className="section-label !text-muted pb-2.5 text-right">Twoja stawka</th>
                  </tr>
                </thead>
                <tbody>
                  {priceTiers.map((row) => (
                    <tr key={row.id || row.label} className="border-b-2 border-paper last:border-0">
                      <th className="dash-sans text-depths py-2.5 text-sm font-bold">{row.label}</th>
                      <td className="dash-mono py-2.5 text-right text-sm font-bold">
                        {Number(row.client_rate_pln)} zł
                      </td>
                      <td className="dash-mono py-2.5 text-right text-sm font-bold">
                        {Number(row.worker_rate_pln)} zł
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-[1.75rem] bg-[#000C4A] p-4 text-luster sm:col-span-2 lg:col-span-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.08em] text-lime/80">
              {isCurrentMonth ? "Do wypłaty w tym miesiącu" : "Do wypłaty"}
            </p>
            {isPayoutMarkedPaid ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-lime px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.06em] text-depths">
                <span aria-hidden>✓</span>
                Wypłacono
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-2xl font-black tabular-nums text-lime">
            {expectedPayoutPln.toLocaleString("pl-PL")} zł
          </p>
          <p className="mt-1 text-xs capitalize text-luster/65">
            {linesForMonth.length} lekcji · {hoursMonth} h · {monthLabel}
            {bonus.achieved ? ` · +premia ${bonus.bonusPln} zł` : null}
          </p>
        </div>
        <div className="soft-panel p-4">
          <p className="section-label !text-muted">
            {isCurrentMonth ? "Godziny w tym miesiącu" : "Godziny w wybranym miesiącu"}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-depths">
            {hoursMonth}
            <span className="text-muted text-base font-semibold"> h</span>
          </p>
          <p className="mt-1 text-xs font-medium text-depths/70">
            {monthLabel}
          </p>
        </div>
        <div className="soft-panel p-4">
          <p className="section-label !text-muted">
            {isCurrentMonth ? "Uczniowie w tym miesiącu" : "Uczniowie w wybranym miesiącu"}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-depths">
            {studentsInMonth}
          </p>
          <p className="mt-1 text-xs font-medium text-depths/70">
            {monthLabel} · {studentCount} łącznie w bazie
          </p>
        </div>
      </div>

      <section className="soft-panel p-4">
        <h2 className="section-label">Twoje zatwierdzone lekcje</h2>
        <p className="mt-1 text-xs font-medium capitalize text-muted">
          Kwoty według Twojej stawki · {monthLabel}
        </p>
        {linesForMonth.length === 0 ? (
          <p className="mt-6 text-sm font-medium text-muted">Brak zatwierdzonych lekcji w tym miesiącu.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {linesForMonth.map((line) => (
              <li
                key={line.id}
                className="tutor-panel-soft flex flex-col gap-3 rounded-[1.35rem] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-depths">{line.studentName}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {line.label} · {line.date}
                  </p>
                </div>
                <p className="shrink-0 self-start rounded-full bg-[#000C4A] px-3.5 py-1.5 text-sm font-bold tabular-nums text-lime sm:self-center">
                  +{tutorPayoutFromCennik(line, priceTiers, TUTOR_SHARE)} zł
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
