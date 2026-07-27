"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { tutorPayoutFromCennik, sumTutorPayoutFromCennik, financeLinesHours } from "@/lib/data/mappers";
import { TUTOR_SHARE, bonusProgress } from "@/lib/dates";
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
  ewidencjaUnlockedForMonth,
  priceTiers,
  payouts = [],
  closedMonths = [],
}: {
  financeLines: FinanceLineUi[];
  studentCount: number;
  ewidencjaUnlockedForMonth: string | null;
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
  const isMonthClosed = closedMonths.includes(selectedMonthKey);

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
  const canGenerateEwidencja = linesForMonth.length > 0;

  return (
    <PageShell title="Finanse">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-muted max-w-xl text-sm font-medium">
          Widzisz wyłącznie swoje zarobki z lekcji <strong>zatwierdzonych</strong> przez placówkę —
          to kwota, z której idzie Twoja wypłata.
        </p>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
          <label className="grid w-full shrink-0 gap-1 sm:w-auto">
            <span className="text-depths/80 text-xs font-semibold">Stawki</span>
            <button
              type="button"
              onClick={() => setCennikOpen(true)}
              className="text-depths rounded-app bg-mist px-3 py-2 text-sm font-medium transition-colors hover:bg-paper"
            >
              Cennik
            </button>
          </label>
          <label className="grid w-full shrink-0 gap-1 sm:w-auto sm:min-w-56">
            <span className="text-depths/80 text-xs font-semibold">Miesiąc</span>
            <select
              className="text-depths rounded-app bg-mist px-3 py-2 text-sm font-medium"
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
        </div>
      </div>

      <section className="mb-6 rounded-app border border-panel-frame/40 bg-luster/40 p-4">
        <h2 className="text-depths text-sm font-semibold">Ewidencja zajęć dydaktycznych</h2>
        <p className="text-muted mt-1 text-xs leading-relaxed">
          Generuj PDF ewidencji dla wybranego miesiąca — wiersz na każdą godzinę, z poziomem nauczania
          i formą zajęć.
          {ewidencjaUnlockedForMonth === selectedMonthKey
            ? " Administrator odblokował ten miesiąc do wysyłki."
            : null}
        </p>
        {canGenerateEwidencja ? (
          <a
            href={`/finanse/ewidencja?month=${selectedMonthKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex rounded-full border border-panel-frame/50 bg-snow px-4 py-2 text-xs font-bold text-depths hover:bg-jodhpur"
          >
            Otwórz ewidencję do druku · {monthLabel}
          </a>
        ) : (
          <p className="text-muted mt-3 text-xs">Brak zatwierdzonych lekcji w tym miesiącu — nie ma czego generować.</p>
        )}
      </section>

      {cennikOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-[#000C4A]/50" aria-label="Zamknij cennik" onClick={() => setCennikOpen(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-app border border-panel-frame/70 bg-snow/95 p-6 shadow-lg sm:p-8">
            <button
              type="button"
              onClick={() => setCennikOpen(false)}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-xl font-light leading-none text-depths/60 transition-colors hover:bg-luster/80 hover:text-depths"
              aria-label="Zamknij cennik"
            >
              ×
            </button>
            <h2 className="pr-12 text-lg font-medium tracking-tight text-depths">Cennik</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Twoja stawka godzinowa za zajęcia (umowa zlecenia).
            </p>
            {priceTiers.length === 0 ? (
              <p className="mt-6 text-sm font-medium text-muted">Brak pozycji w cenniku.</p>
            ) : (
              <table className="mt-6 w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-panel-frame/35 text-xs font-medium text-muted">
                    <th className="pb-3 pr-2">Zajęcia</th>
                    <th className="pb-3 pl-2 text-right">Twoja stawka</th>
                  </tr>
                </thead>
                <tbody>
                  {priceTiers.map((row, index) => (
                    <tr key={row.id || row.label} className={index > 0 ? "border-t border-panel-frame/35" : ""}>
                      <th className="py-3.5 pr-2 text-sm font-medium leading-snug text-depths">{row.label}</th>
                      <td className="pl-2 py-3.5 text-right text-sm font-semibold tabular-nums text-depths">
                        {Number(row.worker_rate_pln)} zł / godz.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-app bg-[#000C4A] p-4 text-luster sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-luster/75">
            {isCurrentMonth ? "Do wypłaty w tym miesiącu" : "Do wypłaty"}
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums text-lime">
            {expectedPayoutPln.toLocaleString("pl-PL")} zł
          </p>
          <p className="mt-1 text-xs capitalize text-luster/65">
            {linesForMonth.length} lekcji · {hoursMonth} h · {monthLabel}
            {bonus.achieved ? ` · +premia ${bonus.bonusPln} zł` : null}
          </p>
        </div>
        <div className="rounded-app bg-paper p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Godziny / uczniowie</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-depths">
            {hoursMonth}
            <span className="text-muted text-base font-semibold"> h</span>
          </p>
          <p className="mt-1 text-xs font-medium text-depths/70">
            {studentsInMonth} uczniów w mies. · {studentCount} w bazie
          </p>
        </div>
        <div className="rounded-app bg-mist p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Status wypłaty</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-depths">
            {payoutForMonth ? `${Number(payoutForMonth.amount).toLocaleString("pl-PL")} zł` : "—"}
          </p>
          <p
            className={`mt-1 text-xs font-semibold ${
              payoutForMonth?.status === "PAID"
                ? "text-depths"
                : payoutForMonth
                  ? "text-steel"
                  : "text-depths/70"
            }`}
          >
            {payoutForMonth?.status === "PAID"
              ? "Wypłacono"
              : payoutForMonth
                ? "Oczekuje na przelew"
                : isMonthClosed
                  ? "Miesiąc zamknięty"
                  : isCurrentMonth
                    ? "Wypłata po zamknięciu miesiąca"
                    : "Jeszcze nie oznaczona"}
          </p>
        </div>
      </div>

      <section className="rounded-app bg-luster/60 p-4">
        <h2 className="text-base font-semibold tracking-tight text-depths">Twoje zatwierdzone lekcje</h2>
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
                className="flex flex-col gap-3 rounded-app bg-snow px-4 py-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-depths">{line.studentName}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {line.label} · {line.date}
                  </p>
                </div>
                <p className="shrink-0 self-start rounded-app bg-[#000C4A] px-3 py-2 text-base font-bold tabular-nums text-lime sm:self-center">
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
