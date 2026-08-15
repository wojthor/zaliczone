"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { markPayoutPaid, unmarkPayoutPaid } from "@/lib/actions/admin";
import { TUTOR_SHARE, bonusProgress } from "@/lib/dates";
import type { FinanceLineUi, Payout } from "@/lib/types/database";
import { FinanceTile, FinanceTilesRow } from "@/components/admin/finance-tile";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { listaPlacTitles, previousMonthKey } from "./lista-plac/lista-plac-shared";

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

function nextMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y!, m!, 15);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
  return [...map.values()].sort((a, b) => {
    const aPaid = a.payoutStatus === "PAID" ? 1 : 0;
    const bPaid = b.payoutStatus === "PAID" ? 1 : 0;
    if (aPaid !== bPaid) return aPaid - bPaid;
    return a.tutorName.localeCompare(b.tutorName, "pl");
  });
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
  const [unmarkRow, setUnmarkRow] = useState<TutorRollup | null>(null);
  const [manualAmount, setManualAmount] = useState("");
  const nowKey = useMemo(() => currentMonthKey(), []);
  const monthOptions = useMemo(() => {
    const keys = new Set<string>();
    for (const l of financeLines) {
      keys.add(l.monthKey);
      keys.add(nextMonthKey(l.monthKey));
    }
    keys.add(nowKey);
    return [...keys].sort().reverse();
  }, [financeLines, nowKey]);

  const [selectedMonthKey, setSelectedMonthKey] = useState(nowKey);

  /** Miesiąc wypłaty (wybór w UI) → lista dotyczy poprzedniego miesiąca lekcji. */
  const workMonthKey = useMemo(() => previousMonthKey(selectedMonthKey), [selectedMonthKey]);

  const linesForMonth = useMemo(
    () => financeLines.filter((l) => l.monthKey === workMonthKey),
    [financeLines, workMonthKey],
  );

  const payoutsForMonth = useMemo(
    () => payouts.filter((p) => p.month === workMonthKey),
    [payouts, workMonthKey],
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

  const monthLabel = formatMonthLongPl(workMonthKey);
  const payrollTitles = useMemo(() => listaPlacTitles(selectedMonthKey), [selectedMonthKey]);

  const paidCount = rollups.filter((r) => r.payoutStatus === "PAID").length;

  async function handleConfirmPaid() {
    if (!confirmRow) return;
    const parsed = Number(manualAmount.replace(",", "."));
    const finalAmount = Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : confirmRow.tutorPayoutPln;
    await markPayoutPaid(confirmRow.tutorId, workMonthKey, finalAmount, {
      lessonCount: confirmRow.lessonCount,
      lessonsAmount: confirmRow.lessonsPayoutPln,
      bonusAmount: confirmRow.bonusPln,
    });
  }

  async function handleUnmarkPaid() {
    if (!unmarkRow) return;
    await unmarkPayoutPaid(unmarkRow.tutorId, workMonthKey);
  }

  const th =
    "dash-sans sticky top-0 z-[1] border-b-2 border-paper bg-paper px-2 py-2 text-left text-[0.65rem] font-bold uppercase leading-tight text-depths sm:px-2.5 sm:py-2 sm:text-[0.7rem]";
  const td =
    "border-b-2 border-paper px-2 py-2 align-middle text-[0.8rem] sm:px-2.5 sm:py-2.5 sm:text-sm";

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
            <span className="section-label !text-muted">
              Miesiąc wypłaty
            </span>
            <select
              className="dash-sans text-depths rounded-app border border-mist bg-snow px-3 py-2 text-sm font-medium"
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              aria-label="Wybierz miesiąc wypłaty"
            >
              {monthOptions.map((key) => (
                <option key={key} value={key}>
                  {formatMonthLongPl(key)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <FinanceTilesRow columns={3}>
        <FinanceTile label="Przychód" tone="navy">
          {formatMoney(totals.przychod)}
        </FinanceTile>
        <FinanceTile label="Do wypłaty / Wypłacone" tone="orange">
          {formatMoney(totals.doWyplaty)}
          <span className="opacity-40"> / </span>
          {formatMoney(totals.wyplacone)}
        </FinanceTile>
        <FinanceTile label="Marża agencji" tone="green">
          {formatMoney(totals.zysk)}
        </FinanceTile>
      </FinanceTilesRow>

      <section className="rounded-app bg-snow p-3 sm:p-4">
        <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="section-label leading-snug">
              {payrollTitles.title}
            </h2>
            <p className="dash-sans text-muted mt-1 text-xs leading-snug">{payrollTitles.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PayoutProgressStat total={rollups.length} paid={paidCount} />
            <a
              href={`/admin/wyplaty/lista-plac?month=${selectedMonthKey}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#000C4A] px-2.5 py-1 text-[0.65rem] font-bold text-lime sm:px-3 sm:py-1.5 sm:text-xs"
            >
              Wygeneruj listę płac PDF
            </a>
          </div>
        </div>

        {rollups.length === 0 ? (
          <p className="dash-sans text-muted mt-6 py-6 text-center text-sm font-medium">
            Brak zatwierdzonych lekcji za okres {monthLabel}.
          </p>
        ) : (
          <div className="mt-4 max-h-[min(28rem,55vh)] overflow-auto rounded-app bg-paper/40 scrollbar-panel">
            <table className="table-fixed min-w-200 w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={`${th} w-[4%]`}>Lp.</th>
                  <th scope="col" className={`${th} w-[16%]`}>Nauczyciel</th>
                  <th scope="col" className={`${th} w-[18%]`}>Nr konta</th>
                  <th scope="col" className={`${th} w-[7%] text-right`}>Lekcje</th>
                  <th scope="col" className={`${th} w-[8%] text-right`}>Godziny</th>
                  <th scope="col" className={`${th} w-[12%] text-right`}>Wynagrodzenie</th>
                  <th scope="col" className={`${th} w-[10%] text-right`}>Premia</th>
                  <th scope="col" className={`${th} w-[11%] text-right`}>Razem</th>
                  <th scope="col" className={`${th} w-[14%] text-center`}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rollups.map((row, i) => {
                  const isPaid = row.payoutStatus === "PAID";
                  const account = row.bankAccount?.trim() || null;
                  const rail = isPaid ? "status-rail-verified" : "status-rail-pending";
                  return (
                    <tr
                      key={row.tutorId}
                      className={`${
                        isPaid
                          ? "bg-mist/60 hover:bg-mist"
                          : i % 2 === 1
                            ? "bg-paper/80 hover:bg-paper"
                            : "bg-snow hover:bg-paper"
                      }`}
                    >
                      <td className={`${td} dash-mono text-muted text-center tabular-nums`}>{i + 1}</td>
                      <td className={`${td} status-rail ${rail} dash-sans font-semibold text-depths`}>
                        {row.tutorName}
                      </td>
                      <td className={td}>
                        {account ? (
                          <span className="dash-mono text-depths break-all text-[0.75rem] font-medium leading-snug sm:text-[0.8rem]">
                            {account}
                          </span>
                        ) : (
                          <span className="dash-sans text-[0.7rem] font-semibold text-claret">brak rachunku</span>
                        )}
                      </td>
                      <td className={`${td} dash-mono text-right font-bold tabular-nums text-depths`}>
                        {row.lessonCount}
                      </td>
                      <td className={`${td} dash-mono text-right font-bold tabular-nums text-depths`}>
                        {row.hours}
                      </td>
                      <td className={`${td} dash-mono text-right font-bold tabular-nums text-depths`}>
                        {formatMoney(row.lessonsPayoutPln)}
                      </td>
                      <td
                        className={`${td} dash-mono text-right font-bold tabular-nums ${
                          row.bonusPln > 0 ? "text-moss" : "text-muted"
                        }`}
                      >
                        {row.bonusPln > 0 ? formatMoney(row.bonusPln) : "—"}
                      </td>
                      <td className={`${td} dash-mono text-right font-bold tabular-nums text-depths`}>
                        {formatMoney(row.tutorPayoutPln)}
                      </td>
                      <td className={`${td} text-center`}>
                        {isPaid ? (
                          <button
                            type="button"
                            onClick={() => setUnmarkRow(row)}
                            className="badge-done transition hover:opacity-90"
                            title="Kliknij, aby odznaczyć"
                          >
                            Wypłacone
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmRow(row);
                              setManualAmount(row.tutorPayoutPln.toFixed(2));
                            }}
                            className="btn-block dash-sans bg-[#000C4A] px-2.5 py-1.5 text-[0.65rem] text-lime transition-opacity hover:opacity-90"
                          >
                            Oznacz jako wypłacone
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
            ? `Za ${monthLabel}. Wyliczona kwota to ${formatMoney(confirmRow.tutorPayoutPln)} — możesz ją skorygować poniżej. Upewnij się, że przelew już wyszedł z banku.`
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

      <ConfirmDialog
        open={unmarkRow !== null}
        tone="danger"
        title={unmarkRow ? `Odznacz wypłatę: ${unmarkRow.tutorName}` : ""}
        description={
          unmarkRow
            ? `Za ${monthLabel}. Status wróci do „do wypłaty”. Używaj tylko gdy oznaczenie było pomyłką.`
            : undefined
        }
        confirmLabel="Odznacz"
        successMessage="Wypłata odznaczona."
        onConfirm={handleUnmarkPaid}
        onSuccess={() => router.refresh()}
        onCancel={() => setUnmarkRow(null)}
      />
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
        className="h-1 w-full overflow-hidden rounded-full bg-mist"
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
