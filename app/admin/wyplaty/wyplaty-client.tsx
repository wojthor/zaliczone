"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markPayoutPaid } from "@/lib/actions/admin";
import { TUTOR_SHARE, bonusProgress } from "@/lib/dates";
import type { FinanceLineUi, Payout } from "@/lib/types/database";

const TUTOR_SHARE_OF_CLIENT_PAYMENT = TUTOR_SHARE;

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

type TutorRollup = {
  tutorId: string;
  tutorName: string;
  lessonCount: number;
  hours: number;
  clientTotalPln: number;
  lessonsPayoutPln: number;
  bonusPln: number;
  tutorPayoutPln: number;
  payoutStatus: Payout["status"] | null;
};

function minutesFromLabel(label: string): number {
  const match = label.match(/(\d+)\s*min/);
  return match ? Number(match[1]) : 60;
}

function buildRollups(lines: FinanceLineUi[], payouts: Payout[]): TutorRollup[] {
  const payoutMap = new Map(payouts.map((p) => [p.tutor_id, p]));
  const map = new Map<string, TutorRollup>();
  for (const line of lines) {
    const prev = map.get(line.tutorId) ?? {
      tutorId: line.tutorId,
      tutorName: line.tutorName,
      lessonCount: 0,
      hours: 0,
      clientTotalPln: 0,
      lessonsPayoutPln: 0,
      bonusPln: 0,
      tutorPayoutPln: 0,
      payoutStatus: payoutMap.get(line.tutorId)?.status ?? null,
    };
    prev.lessonCount += 1;
    prev.hours += minutesFromLabel(line.label) / 60;
    prev.clientTotalPln += line.amountPln;
    prev.lessonsPayoutPln += Math.round(line.amountPln * TUTOR_SHARE_OF_CLIENT_PAYMENT * 100) / 100;
    map.set(line.tutorId, prev);
  }
  for (const row of map.values()) {
    row.hours = Math.round(row.hours * 10) / 10;
    const b = bonusProgress(row.lessonCount);
    row.bonusPln = b.achieved ? b.bonusPln : 0;
    row.tutorPayoutPln = Math.round((row.lessonsPayoutPln + row.bonusPln) * 100) / 100;
  }
  return [...map.values()].sort((a, b) => a.tutorName.localeCompare(b.tutorName, "pl"));
}

function formatMoney(pln: number): string {
  return `${pln.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} zł`;
}

export function WyplatyClient({
  financeLines,
  payouts,
}: {
  financeLines: FinanceLineUi[];
  payouts: Payout[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const nowKey = useMemo(() => currentMonthKey(), []);
  const monthOptions = useMemo(() => {
    const keys = [...new Set(financeLines.map((l) => l.monthKey))];
    keys.sort();
    if (!keys.includes(nowKey)) keys.push(nowKey);
    return keys.slice().reverse();
  }, [financeLines, nowKey]);

  const [selectedMonthKey, setSelectedMonthKey] = useState(nowKey);

  const linesForMonth = useMemo(
    () => financeLines.filter((l) => l.monthKey === selectedMonthKey),
    [financeLines, selectedMonthKey],
  );

  const payoutsForMonth = useMemo(
    () => payouts.filter((p) => p.month === selectedMonthKey),
    [payouts, selectedMonthKey],
  );

  const { rollups, totals } = useMemo(() => {
    const przychod = linesForMonth.reduce((s, l) => s + l.amountPln, 0);
    const r = buildRollups(linesForMonth, payoutsForMonth);
    const koszty = Math.round(r.reduce((acc, x) => acc + x.tutorPayoutPln, 0) * 100) / 100;
    const zysk = Math.round((przychod - koszty) * 100) / 100;
    return { rollups: r, totals: { przychod, koszty, zysk } };
  }, [linesForMonth, payoutsForMonth]);

  const monthLabel = formatMonthLongPl(selectedMonthKey);

  const handleMarkPaid = (row: TutorRollup) => {
    startTransition(async () => {
      await markPayoutPaid(row.tutorId, selectedMonthKey, row.tutorPayoutPln, {
        lessonCount: row.lessonCount,
        lessonsAmount: row.lessonsPayoutPln,
        bonusAmount: row.bonusPln,
      });
      router.refresh();
    });
  };

  const th =
    "sticky top-0 z-[1] border-b border-panel-frame/40 bg-jodhpur/95 px-2 py-2 text-left text-[0.65rem] font-bold uppercase leading-tight text-depths shadow-[inset_0_-1px_0_0_rgb(136_154_204/0.35)] sm:px-2.5 sm:py-2 sm:text-[0.7rem]";
  const td =
    "border-b border-panel-frame/15 px-2 py-2 align-middle text-[0.8rem] sm:px-2.5 sm:py-2.5 sm:text-sm";

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-depths text-xl font-semibold tracking-tight sm:text-2xl">Wypłaty i Bilans</h1>
          <p className="text-muted mt-1 max-w-2xl text-xs leading-relaxed sm:text-sm">
            Wyłącznie lekcje VERIFIED · model marżowy 70% tutor / 30% agencja.
          </p>
        </div>
        <label className="grid gap-1">
          <span className="text-depths/80 text-[0.65rem] font-semibold sm:text-xs">Miesiąc</span>
          <select
            className="text-depths rounded-app border-2 border-panel-frame bg-luster px-3 py-2 text-sm font-medium"
            value={selectedMonthKey}
            onChange={(e) => setSelectedMonthKey(e.target.value)}
            aria-label="Wybierz miesiąc"
          >
            {monthOptions.map((key) => (
              <option key={key} value={key}>
                {formatMonthLongPl(key)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-app border-2 border-panel-frame bg-snow p-4 shadow-sm">
          <p className="text-muted text-[0.65rem] font-semibold uppercase tracking-wide">Przychód (VERIFIED)</p>
          <p className="text-depths mt-1 text-2xl font-black tabular-nums sm:text-[1.75rem]">{formatMoney(totals.przychod)}</p>
        </article>
        <article className="rounded-app border-2 border-panel-frame bg-snow p-4 shadow-sm">
          <p className="text-muted text-[0.65rem] font-semibold uppercase tracking-wide">Koszty 70%</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-amber-800 sm:text-[1.75rem]">{formatMoney(totals.koszty)}</p>
        </article>
        <article className="rounded-app border-2 border-green-700/35 bg-green-700/[0.07] p-4 shadow-sm ring-1 ring-green-700/20">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-green-900">Zysk netto 30%</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-green-800 sm:text-[1.75rem]">{formatMoney(totals.zysk)}</p>
        </article>
      </section>

      <section className="rounded-app border border-panel-frame/35 bg-snow p-3 sm:p-4">
        <h2 className="text-depths text-base font-semibold tracking-tight">Lista do wypłaty</h2>
        <p className="text-muted mt-1 text-xs capitalize">{monthLabel}</p>

        {rollups.length === 0 ? (
          <p className="text-muted mt-6 py-6 text-center text-sm font-medium">Brak zatwierdzonych lekcji w tym miesiącu.</p>
        ) : (
          <div className="mt-4 max-h-[min(28rem,55vh)] overflow-auto rounded-app border border-panel-frame/25 scrollbar-panel">
            <table className="table-fixed min-w-[36rem] w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={`${th} w-[24%]`}>Nauczyciel</th>
                  <th scope="col" className={`${th} w-[12%]`}>Godziny</th>
                  <th scope="col" className={`${th} w-[16%]`}>Premia</th>
                  <th scope="col" className={`${th} w-[20%]`}>Do wypłaty</th>
                  <th scope="col" className={`${th} w-[28%]`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rollups.map((row, i) => {
                  const isPaid = row.payoutStatus === "PAID";
                  return (
                    <tr key={row.tutorId} className={`${i % 2 === 1 ? "bg-luster/35" : "bg-snow"} hover:bg-luster/50`}>
                      <td className={`${td} font-semibold text-depths`}>{row.tutorName}</td>
                      <td className={`${td} font-bold tabular-nums text-depths`}>{row.hours}</td>
                      <td className={`${td} font-bold tabular-nums ${row.bonusPln > 0 ? "text-green-800" : "text-muted"}`}>
                        {row.bonusPln > 0 ? `+${formatMoney(row.bonusPln)}` : "—"}
                      </td>
                      <td className={`${td} font-bold tabular-nums text-depths`}>{formatMoney(row.tutorPayoutPln)}</td>
                      <td className={td}>
                        {isPaid ? (
                          <span className="inline-flex items-center rounded-full bg-green-700/15 px-2.5 py-1 text-[0.7rem] font-bold text-green-800">
                            Wypłacone
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(row)}
                            disabled={pending}
                            className="rounded-full bg-[#000C4A] px-3 py-1.5 text-[0.7rem] font-bold text-lime transition-opacity hover:opacity-90 disabled:opacity-60"
                          >
                            Wypłacone
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
