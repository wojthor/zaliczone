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
  bankAccount: string | null;
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

function buildRollups(
  lines: FinanceLineUi[],
  payouts: Payout[],
  bankAccounts: Record<string, string | null>,
): TutorRollup[] {
  const payoutMap = new Map(payouts.map((p) => [p.tutor_id, p]));
  const map = new Map<string, TutorRollup>();
  for (const line of lines) {
    const prev = map.get(line.tutorId) ?? {
      tutorId: line.tutorId,
      tutorName: line.tutorName,
      bankAccount: bankAccounts[line.tutorId] ?? null,
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
    const b = bonusProgress(row.hours);
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
  bankAccounts,
}: {
  financeLines: FinanceLineUi[];
  payouts: Payout[];
  bankAccounts: Record<string, string | null>;
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
    const r = buildRollups(linesForMonth, payoutsForMonth, bankAccounts);
    const rowTotal = (x: TutorRollup) =>
      Math.round((x.lessonsPayoutPln + x.bonusPln) * 100) / 100;
    const koszty = Math.round(r.reduce((acc, x) => acc + rowTotal(x), 0) * 100) / 100;
    const doWyplaty =
      Math.round(
        r.filter((x) => x.payoutStatus !== "PAID").reduce((acc, x) => acc + rowTotal(x), 0) * 100,
      ) / 100;
    const wyplacone =
      Math.round(
        r.filter((x) => x.payoutStatus === "PAID").reduce((acc, x) => acc + rowTotal(x), 0) * 100,
      ) / 100;
    const zysk = Math.round((przychod - koszty) * 100) / 100;
    return { rollups: r, totals: { przychod, koszty, doWyplaty, wyplacone, zysk } };
  }, [linesForMonth, payoutsForMonth, bankAccounts]);

  const monthLabel = formatMonthLongPl(selectedMonthKey);

  const paidCount = rollups.filter((r) => r.payoutStatus === "PAID").length;

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
        <article className="rounded-app border border-panel-frame/35 bg-snow p-4">
          <p className="text-muted text-[10px] font-semibold uppercase tracking-wide">Przychód</p>
          <p className="text-depths mt-1 text-2xl font-black tabular-nums">{formatMoney(totals.przychod)}</p>
        </article>
        <article className="rounded-app border border-amber-500/40 bg-amber-50/80 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900/80">
            Do wypłaty/Wypłacone
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums text-amber-900">
            {formatMoney(totals.doWyplaty)}
            <span className="text-amber-900/50"> / </span>
            {formatMoney(totals.wyplacone)}
          </p>
        </article>
        <article className="rounded-app border border-green-700/35 bg-green-700/[0.07] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-green-900/80">Marża agencji</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-green-800">{formatMoney(totals.zysk)}</p>
        </article>
      </section>

      <section className="rounded-app border border-panel-frame/35 bg-snow p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-depths text-base font-semibold tracking-tight">Lista do wypłaty</h2>
          <PayoutProgressStat total={rollups.length} paid={paidCount} />
        </div>
        <p className="text-muted mt-1 text-xs capitalize">{monthLabel}</p>

        {rollups.length === 0 ? (
          <p className="text-muted mt-6 py-6 text-center text-sm font-medium">Brak zatwierdzonych lekcji w tym miesiącu.</p>
        ) : (
          <div className="mt-4 max-h-[min(28rem,55vh)] overflow-auto rounded-app border border-panel-frame/25 scrollbar-panel">
            <table className="table-fixed min-w-[44rem] w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={`${th} w-[18%]`}>Nauczyciel</th>
                  <th scope="col" className={`${th} w-[10%]`}>Godziny</th>
                  <th scope="col" className={`${th} w-[12%]`}>Premia</th>
                  <th scope="col" className={`${th} w-[16%]`}>Do wypłaty</th>
                  <th scope="col" className={`${th} w-[26%]`}>Nr rachunku</th>
                  <th scope="col" className={`${th} w-[18%]`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rollups.map((row, i) => {
                  const isPaid = row.payoutStatus === "PAID";
                  const account = row.bankAccount?.trim() || null;
                  return (
                    <tr key={row.tutorId} className={`${i % 2 === 1 ? "bg-luster/35" : "bg-snow"} hover:bg-luster/50`}>
                      <td className={`${td} font-semibold text-depths`}>{row.tutorName}</td>
                      <td className={`${td} font-bold tabular-nums text-depths`}>{row.hours}</td>
                      <td className={`${td} font-bold tabular-nums ${row.bonusPln > 0 ? "text-green-800" : "text-muted"}`}>
                        {row.bonusPln > 0 ? `+${formatMoney(row.bonusPln)}` : "—"}
                      </td>
                      <td className={`${td} font-bold tabular-nums text-depths`}>{formatMoney(row.tutorPayoutPln)}</td>
                      <td className={td}>
                        {account ? (
                          <span className="text-depths break-all text-[0.75rem] font-medium tabular-nums leading-snug sm:text-[0.8rem]">
                            {account}
                          </span>
                        ) : (
                          <span className="text-[0.7rem] font-semibold text-red-700">brak rachunku</span>
                        )}
                      </td>
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

function PayoutProgressStat({
  total,
  paid,
}: {
  total: number;
  paid: number;
}) {
  const donePct = total > 0 ? (paid / total) * 100 : 0;

  return (
    <div className="w-full max-w-[14rem] shrink-0 space-y-0.5 sm:w-[14rem]">
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-luster"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total || 100}
        aria-valuenow={paid}
        aria-label={`Wypłacono ${paid} z ${total} pozycji`}
      >
        <div
          className="h-full rounded-full bg-[#000C4A] transition-[width] duration-300 ease-out"
          style={{ width: `${donePct}%` }}
        />
      </div>
      <p className="text-muted text-[0.55rem] tabular-nums leading-none">
        {total === 0 ? "Brak pozycji" : `${paid}/${total} wypłacone`}
      </p>
    </div>
  );
}
