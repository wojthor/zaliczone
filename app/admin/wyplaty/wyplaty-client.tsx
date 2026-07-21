"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markPayoutPaid, requestEwidencjaForMonth } from "@/lib/actions/admin";
import { TUTOR_SHARE, bonusProgress } from "@/lib/dates";
import type { FinanceLineUi, Payout } from "@/lib/types/database";
import { LedgerBand, LedgerStat } from "@/components/admin/ledger-stat";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  const [confirmRow, setConfirmRow] = useState<TutorRollup | null>(null);
  const [manualAmount, setManualAmount] = useState("");
  const [pendingEwidencja, startEwidencja] = useTransition();
  const [ewidencjaFeedback, setEwidencjaFeedback] = useState("");
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

  async function handleConfirmPaid() {
    if (!confirmRow) return;
    const parsed = Number(manualAmount.replace(",", "."));
    const finalAmount = Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : confirmRow.tutorPayoutPln;
    await markPayoutPaid(confirmRow.tutorId, selectedMonthKey, finalAmount, {
      lessonCount: confirmRow.lessonCount,
      lessonsAmount: confirmRow.lessonsPayoutPln,
      bonusAmount: confirmRow.bonusPln,
    });
  }

  function handleRequestEwidencja() {
    setEwidencjaFeedback("");
    startEwidencja(async () => {
      try {
        const { count } = await requestEwidencjaForMonth(selectedMonthKey);
        setEwidencjaFeedback(`Wysłano prośbę mailem do ${count} nauczycieli i odblokowano miesiąc.`);
        router.refresh();
      } catch (err) {
        setEwidencjaFeedback(err instanceof Error ? err.message : "Nie udało się wysłać prośby.");
      }
    });
  }

  const th =
    "dash-sans sticky top-0 z-[1] border-b border-panel-frame/40 bg-jodhpur/95 px-2 py-2 text-left text-[0.65rem] font-bold uppercase leading-tight text-depths shadow-[inset_0_-1px_0_0_rgb(136_154_204/0.35)] sm:px-2.5 sm:py-2 sm:text-[0.7rem]";
  const td =
    "border-b border-panel-frame/15 px-2 py-2 align-middle text-[0.8rem] sm:px-2.5 sm:py-2.5 sm:text-sm";

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="dash-sans text-depths text-xl font-bold tracking-tight sm:text-2xl">Wypłaty i Bilans</h1>
          <p className="dash-sans text-muted mt-1 max-w-2xl text-xs leading-relaxed sm:text-sm">
            Wyłącznie lekcje VERIFIED · model marżowy 70% tutor / 30% agencja.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 sm:gap-3">
          <label className="grid gap-1">
            <span className="dash-sans text-depths/80 text-[0.65rem] font-semibold sm:text-xs">Miesiąc</span>
            <select
              className="dash-sans text-depths rounded-app border-2 border-panel-frame bg-luster px-3 py-2 text-sm font-medium"
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
          <button
            type="button"
            onClick={handleRequestEwidencja}
            disabled={pendingEwidencja}
            className="btn-block bg-[#000C4A] px-4 py-2.5 text-xs text-lime disabled:opacity-60"
          >
            {pendingEwidencja ? "Wysyłanie…" : `Poproś o ewidencję · ${monthLabel}`}
          </button>
        </div>
      </div>
      {ewidencjaFeedback ? (
        <p
          className={`dash-sans text-xs font-semibold ${
            ewidencjaFeedback.includes("Wysłano") ? "text-moss" : "text-claret"
          }`}
        >
          {ewidencjaFeedback}
        </p>
      ) : null}

      <LedgerBand columns={3}>
        <LedgerStat label="Przychód" tick="neutral" ink="depths">
          {formatMoney(totals.przychod)}
        </LedgerStat>
        <LedgerStat label="Do wypłaty / Wypłacone" tick="butter" ink="toffee">
          {formatMoney(totals.doWyplaty)}
          <span className="text-toffee/50"> / </span>
          {formatMoney(totals.wyplacone)}
        </LedgerStat>
        <LedgerStat label="Marża agencji" tick="lime" ink="moss">
          {formatMoney(totals.zysk)}
        </LedgerStat>
      </LedgerBand>

      <section className="rounded-app border border-panel-frame/35 bg-snow p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="dash-sans text-depths text-base font-semibold tracking-tight">Lista do wypłaty</h2>
          <PayoutProgressStat total={rollups.length} paid={paidCount} />
        </div>
        <p className="dash-sans text-muted mt-1 text-xs capitalize">{monthLabel}</p>

        {rollups.length === 0 ? (
          <p className="dash-sans text-muted mt-6 py-6 text-center text-sm font-medium">
            Brak zatwierdzonych lekcji w tym miesiącu.
          </p>
        ) : (
          <div className="mt-4 max-h-[min(28rem,55vh)] overflow-auto rounded-app border border-panel-frame/25 scrollbar-panel">
            <table className="table-fixed min-w-176 w-full border-collapse">
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
                  const rail = isPaid ? "status-rail-verified" : "status-rail-pending";
                  return (
                    <tr key={row.tutorId} className={`${i % 2 === 1 ? "bg-luster/35" : "bg-snow"} hover:bg-luster/50`}>
                      <td className={`${td} status-rail ${rail} dash-sans font-semibold text-depths`}>{row.tutorName}</td>
                      <td className={`${td} dash-mono font-bold text-depths`}>{row.hours}</td>
                      <td className={`${td} dash-mono font-bold ${row.bonusPln > 0 ? "text-moss" : "text-muted"}`}>
                        {row.bonusPln > 0 ? `+${formatMoney(row.bonusPln)}` : "—"}
                      </td>
                      <td className={`${td} dash-mono font-bold text-depths`}>{formatMoney(row.tutorPayoutPln)}</td>
                      <td className={td}>
                        {account ? (
                          <span className="dash-mono text-depths break-all text-[0.75rem] font-medium leading-snug sm:text-[0.8rem]">
                            {account}
                          </span>
                        ) : (
                          <span className="dash-sans text-[0.7rem] font-semibold text-claret">brak rachunku</span>
                        )}
                      </td>
                      <td className={td}>
                        {isPaid ? (
                          <span className="dash-sans inline-flex items-center rounded-full bg-moss/15 px-2.5 py-1 text-[0.7rem] font-bold text-moss">
                            Wypłacone
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmRow(row);
                              setManualAmount(row.tutorPayoutPln.toFixed(2));
                            }}
                            className="btn-block dash-sans bg-[#000C4A] px-3 py-1.5 text-[0.7rem] text-lime transition-opacity hover:opacity-90"
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

      <ConfirmDialog
        open={confirmRow !== null}
        tone="positive"
        title={confirmRow ? `Zatwierdź przelew dla ${confirmRow.tutorName}` : ""}
        description={
          confirmRow
            ? `Za ${monthLabel}. Wyliczona kwota to ${formatMoney(confirmRow.tutorPayoutPln)} — możesz ją skorygować poniżej. Upewnij się, że przelew już wyszedł z banku — w systemie nie da się tego odznaczyć.`
            : undefined
        }
        confirmLabel="Zatwierdź przelew"
        successMessage="Wypłata oznaczona jako wykonana."
        onConfirm={handleConfirmPaid}
        onSuccess={() => router.refresh()}
        onCancel={() => setConfirmRow(null)}
      >
        <label className="block text-left">
          <span className="dash-sans text-muted text-[0.65rem] font-semibold uppercase tracking-wide">
            Kwota do wypłaty (można skorygować)
          </span>
          <div className="mt-1 flex items-center gap-2 rounded-app border border-panel-frame/40 bg-white px-3 py-2">
            <input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              className="dash-mono text-depths w-full bg-transparent text-base font-bold outline-none"
              aria-label="Kwota do wypłaty"
            />
            <span className="dash-sans text-muted text-sm font-semibold">zł</span>
          </div>
        </label>
      </ConfirmDialog>
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
    <div className="w-full max-w-56 shrink-0 space-y-0.5 sm:w-56">
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
      <p className="dash-mono text-muted text-[0.55rem] leading-none">
        {total === 0 ? "Brak pozycji" : `${paid}/${total} wypłacone`}
      </p>
    </div>
  );
}
