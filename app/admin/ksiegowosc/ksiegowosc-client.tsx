"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { closeMonth, type MonthCloseChecklist } from "@/lib/actions/admin";
import { canCloseMonth } from "@/lib/dates";
import type { FinanceLineUi, Payout } from "@/lib/types/database";

const TUTOR_SHARE = 0.7;
const AGENCY_SHARE = 0.3;
const PIT_RATE = 0.12;

type JdgZusStage = "start" | "maly";

const ZUS_OPTIONS: Record<JdgZusStage, { label: string; amountLabel: string; monthlyAmount: number; note: string }> = {
  start: {
    label: "Ulga na start (tylko zdrowotne)",
    amountLabel: "~410,00 zł",
    monthlyAmount: 410,
    note: "Przez pierwsze 6 miesięcy firmy.",
  },
  maly: {
    label: "Mały ZUS (preferencyjny)",
    amountLabel: "~480,00 zł + składka zdrowotna",
    monthlyAmount: 890,
    note: "Składki społeczne w stawce preferencyjnej + ok. 410 zł zdrowotnej miesięcznie.",
  },
};

type LedgerRow = {
  id: string;
  lessonDate: string;
  paidAt: string;
  serviceName: string;
  buyer: string;
  grossPln: number;
};

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

const EMPTY_CHECKLIST: MonthCloseChecklist = {
  ewidencjaGenerated: false,
  pendingCleared: false,
  payoutsCalculated: false,
  pitZusNoted: false,
};

export function KsiegowoscClient({
  financeLines,
  payouts,
  closedMonths = [],
}: {
  financeLines: FinanceLineUi[];
  payouts: Payout[];
  closedMonths?: string[];
}) {
  const router = useRouter();
  const [pendingClose, startClose] = useTransition();
  const nowKey = useMemo(() => currentMonthKey(), []);
  const [selectedMonthKey, setSelectedMonthKey] = useState(nowKey);
  const [zusStage, setZusStage] = useState<JdgZusStage>("start");
  const [checklist, setChecklist] = useState<MonthCloseChecklist>(EMPTY_CHECKLIST);
  const [closeFeedback, setCloseFeedback] = useState("");

  const linesForMonth = useMemo(
    () => financeLines.filter((l) => l.monthKey === selectedMonthKey),
    [financeLines, selectedMonthKey],
  );

  const ledgerRows: LedgerRow[] = useMemo(() => {
    return linesForMonth.map((l) => ({
      id: l.id,
      lessonDate: l.date,
      paidAt: l.paymentReceivedAt ?? l.date,
      serviceName: `Korepetycje - ${extractSubject(l.label)}`,
      buyer: l.studentName,
      grossPln: l.amountPln,
    }));
  }, [linesForMonth]);

  const totals = useMemo(() => {
    const gross = linesForMonth.reduce((s, l) => s + l.amountPln, 0);
    const tutorShare = Math.round(gross * TUTOR_SHARE * 100) / 100;
    const agencyShare = Math.round(gross * AGENCY_SHARE * 100) / 100;
    return { gross, tutorShare, agencyShare, lessonCount: linesForMonth.length };
  }, [linesForMonth]);

  const monthLabel = useMemo(() => formatMonthLongPl(selectedMonthKey), [selectedMonthKey]);
  const monthOptions = useMemo(() => {
    const keys = new Set(financeLines.map((l) => l.monthKey));
    for (const p of payouts) keys.add(p.month);
    keys.add(nowKey);
    return [...keys].sort().reverse();
  }, [financeLines, payouts, nowKey]);

  const paidPayoutsSum = useMemo(
    () =>
      payouts
        .filter((p) => p.month === selectedMonthKey && p.status === "PAID")
        .reduce((sum, p) => sum + Number(p.amount), 0),
    [payouts, selectedMonthKey],
  );

  const taxableIncome = useMemo(() => {
    const raw = totals.gross - paidPayoutsSum;
    return Math.max(0, Math.round(raw * 100) / 100);
  }, [totals.gross, paidPayoutsSum]);

  const suggestedPit = useMemo(
    () => Math.round(taxableIncome * PIT_RATE * 100) / 100,
    [taxableIncome],
  );

  const selectedZus = ZUS_OPTIONS[zusStage];

  const netProfit = useMemo(() => {
    const raw = totals.gross - paidPayoutsSum - suggestedPit - selectedZus.monthlyAmount;
    return Math.round(raw * 100) / 100;
  }, [totals.gross, paidPayoutsSum, suggestedPit, selectedZus.monthlyAmount]);

  const isMonthClosed = closedMonths.includes(selectedMonthKey);
  const canClose = canCloseMonth(selectedMonthKey);
  const checklistComplete =
    checklist.ewidencjaGenerated &&
    checklist.pendingCleared &&
    checklist.payoutsCalculated &&
    checklist.pitZusNoted;

  function toggleCheck(key: keyof MonthCloseChecklist) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
    setCloseFeedback("");
  }

  function handleCloseMonth() {
    setCloseFeedback("");
    startClose(async () => {
      try {
        await closeMonth(selectedMonthKey, checklist);
        setCloseFeedback("Miesiąc został zamknięty.");
        setChecklist(EMPTY_CHECKLIST);
        router.refresh();
      } catch (err) {
        setCloseFeedback(err instanceof Error ? err.message : "Nie udało się zamknąć miesiąca.");
      }
    });
  }

  const th =
    "border-b border-panel-frame/40 bg-jodhpur/90 px-1 py-1 text-left text-[0.55rem] font-bold uppercase leading-tight text-depths sm:px-1.5 sm:py-1.5 sm:text-[0.6rem]";
  const td =
    "border-b border-panel-frame/15 px-1 py-1 align-top text-[0.62rem] leading-tight break-words sm:px-1.5 sm:py-1.5 sm:text-[0.7rem]";
  const rowZebra = "bg-snow even:bg-luster/40 hover:bg-luster/60";

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-depths text-lg font-semibold tracking-tight sm:text-xl">Księgowość</h1>
            {isMonthClosed ? (
              <span className="rounded-full bg-green-700/15 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-green-800">
                Miesiąc zamknięty
              </span>
            ) : null}
          </div>
          <p className="text-muted mt-0.5 text-[0.7rem] capitalize leading-snug sm:text-xs">
            {monthLabel} — ewidencja sprzedaży bezrachunkowej (tylko VERIFIED).
          </p>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-4">
        <article className="rounded-app border border-panel-frame/35 bg-snow p-3">
          <p className="text-muted text-[10px] font-semibold uppercase tracking-wide">Przychód brutto</p>
          <p className="text-depths mt-1 text-xl font-black tabular-nums">{formatPln(totals.gross)}</p>
        </article>
        <article className="rounded-app border border-panel-frame/35 bg-snow p-3">
          <p className="text-muted text-[10px] font-semibold uppercase tracking-wide">Koszty 70%</p>
          <p className="mt-1 text-xl font-black tabular-nums text-amber-800">{formatPln(totals.tutorShare)}</p>
        </article>
        <article className="rounded-app border border-green-700/35 bg-green-700/[0.07] p-3 ring-1 ring-green-700/20">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-green-900">Marża 30%</p>
          <p className="mt-1 text-xl font-black tabular-nums text-green-800">{formatPln(totals.agencyShare)}</p>
        </article>
        <article className="rounded-app border border-panel-frame/35 bg-snow p-3">
          <p className="text-muted text-[10px] font-semibold uppercase tracking-wide">Lekcje VERIFIED</p>
          <p className="text-depths mt-1 text-xl font-black tabular-nums">{totals.lessonCount}</p>
        </article>
      </section>

      <div className="flex flex-wrap items-end gap-2 sm:gap-3">
        <label className="grid min-w-0 gap-0.5">
          <span className="text-depths/80 text-[0.65rem] font-semibold sm:text-xs">Miesiąc</span>
          <select
            className="text-depths rounded-app border border-panel-frame/40 bg-white px-2 py-1 text-xs font-medium sm:px-2.5 sm:py-1.5"
            value={selectedMonthKey}
            onChange={(e) => {
              setSelectedMonthKey(e.target.value);
              setChecklist(EMPTY_CHECKLIST);
              setCloseFeedback("");
            }}
            aria-label="Miesiąc ewidencji sprzedaży"
          >
            {monthOptions.map((key) => (
              <option key={key} value={key}>
                {formatMonthLongPl(key)}
                {closedMonths.includes(key) ? " · zamknięty" : ""}
              </option>
            ))}
          </select>
        </label>
        <a
          href={`/admin/ksiegowosc/ewidencja?month=${selectedMonthKey}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-[#000C4A] px-2.5 py-1 text-[0.65rem] font-bold text-lime sm:px-3 sm:py-1.5 sm:text-xs"
        >
          Wygeneruj ewidencję PDF
        </a>
      </div>

      <div>
        <h2 className="text-depths mb-1 text-sm font-semibold">Ewidencja sprzedaży</h2>
        {ledgerRows.length === 0 ? (
          <p className="text-muted py-4 text-xs">Brak pozycji VERIFIED w tym miesiącu.</p>
        ) : (
          <div className="max-h-[min(20rem,42vh)] overflow-y-auto overflow-x-hidden rounded-lg border border-panel-frame/35 scrollbar-panel sm:max-h-[min(24rem,50vh)] sm:rounded-app">
            <table className="table-fixed w-full min-w-0 border-collapse">
              <thead className="sticky top-0 z-1 bg-jodhpur/95 shadow-[inset_0_-1px_0_0_rgb(136_154_204/0.35)]">
                <tr>
                  <th scope="col" className={`${th} w-[6%]`}>Lp.</th>
                  <th scope="col" className={`${th} w-[12%]`}>Data wykon.</th>
                  <th scope="col" className={`${th} w-[12%]`}>Data zapłaty</th>
                  <th scope="col" className={`${th} w-[32%]`}>Nazwa usługi</th>
                  <th scope="col" className={`${th} w-[26%]`}>Nabywca</th>
                  <th scope="col" className={`${th} w-[12%] text-right`}>Brutto</th>
                </tr>
              </thead>
              <tbody>
                {ledgerRows.map((r, i) => (
                  <tr key={r.id} className={rowZebra}>
                    <td className={`${td} tabular-nums text-muted`}>{i + 1}</td>
                    <td className={`${td} tabular-nums`}>{r.lessonDate}</td>
                    <td className={`${td} tabular-nums`}>{r.paidAt}</td>
                    <td className={`${td} font-medium`}>{r.serviceName}</td>
                    <td className={td}>{r.buyer}</td>
                    <td className={`${td} text-right font-bold tabular-nums`}>{r.grossPln} zł</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <section className="rounded-app border border-panel-frame/40 bg-white p-4 sm:p-5">
        <h2 className="text-depths text-base font-semibold tracking-tight">Rozliczenia — Zrób to sam</h2>
        <p className="text-muted mt-1 text-xs">
          Tylko to, co dotyczy Twojej firmy ·{" "}
          <span className="capitalize">{monthLabel}</span> · dane VERIFIED + wypłaty PAID
        </p>

        <div className="mt-5 space-y-4">
          <article className="rounded-app border border-panel-frame/30 bg-snow p-4">
            <h3 className="text-depths text-sm font-bold">1. Twój podatek dochodowy (PIT-12)</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-depths/90">Przychód (Ewidencja)</span>
                <span className="font-bold tabular-nums">{formatPln(totals.gross)}</span>
              </li>
              <li className="text-muted text-xs leading-snug">
                Zwolnione z VAT na mocy art. 43 ust. 1 pkt 27 ustawy o VAT — nie doliczasz podatku VAT do lekcji.
              </li>
              <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-depths/90">Koszt (Wynagrodzenia studentów)</span>
                <span className="font-bold tabular-nums text-amber-900">{formatPln(paidPayoutsSum)}</span>
              </li>
              <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-panel-frame/20 pt-2">
                <span className="font-semibold text-depths">Dochód (Zysk)</span>
                <span className="text-base font-black tabular-nums">{formatPln(taxableIncome)}</span>
              </li>
              <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="font-semibold text-depths">Twój podatek PIT (12%)</span>
                <span className="text-base font-black tabular-nums text-green-800">{formatPln(suggestedPit)}</span>
              </li>
            </ul>
            <p className="text-depths mt-3 text-xs leading-relaxed">
              👉 <strong>Gdzie i do kiedy płacisz:</strong> Przelej tę kwotę do{" "}
              <strong>20. dnia kolejnego miesiąca</strong> na swój indywidualny Mikrorachunek Podatkowy w Urzędzie
              Skarbowym.
            </p>
          </article>

          <article className="rounded-app border border-panel-frame/30 bg-snow p-4">
            <h3 className="text-depths text-sm font-bold">2. Składki i podatki za studentów (poniżej 26 lat)</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="text-depths/90">ZUS za studentów-zleceniobiorców</span>
                <span className="font-bold tabular-nums text-green-800">0,00 zł</span>
              </li>
              <li className="text-muted text-xs">Status studenta zwalnia Cię całkowicie ze składek ZUS.</li>
              <li className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="text-depths/90">Podatek PIT-4 za studentów</span>
                <span className="font-bold tabular-nums text-green-800">0,00 zł</span>
              </li>
              <li className="text-muted text-xs">Ulga dla młodych zwalnia ich z podatku — nic nie potrącasz.</li>
            </ul>
            <p className="text-depths mt-3 text-xs leading-relaxed">
              👉 <strong>Gdzie i do kiedy płacisz:</strong> Nic nigdzie nie płacisz. W segregatorze trzymaj podpisaną
              umowę i oświadczenie o statusie studenta z ważną legitymacją.
            </p>
          </article>

          <article className="rounded-app border border-panel-frame/30 bg-snow p-4">
            <h3 className="text-depths text-sm font-bold">3. Twój własny ZUS (właściciel JDG)</h3>
            <label className="mt-3 grid max-w-sm gap-1">
              <span className="text-muted text-xs font-semibold">Wybierz etap</span>
              <select
                value={zusStage}
                onChange={(e) => setZusStage(e.target.value as JdgZusStage)}
                className="text-depths rounded-app border border-panel-frame/40 bg-white px-3 py-2 text-sm"
              >
                <option value="start">Ulga na start — ~410,00 zł / mies.</option>
                <option value="maly">Mały ZUS — ~480,00 zł + zdrowotna</option>
              </select>
            </label>
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-depths">{selectedZus.label}</span>
              <span className="text-base font-black tabular-nums text-depths">{selectedZus.amountLabel}</span>
            </div>
            <p className="text-muted mt-1 text-xs">{selectedZus.note}</p>
            <p className="text-depths mt-3 text-xs leading-relaxed">
              👉 <strong>Gdzie i do kiedy płacisz:</strong> Przelej tę kwotę do{" "}
              <strong>20. dnia kolejnego miesiąca</strong> na swoje indywidualne konto w ZUS.
            </p>
          </article>
        </div>

        <article
          className={`mt-5 rounded-app border-2 p-4 ${
            netProfit < 0
              ? "border-red-500/40 bg-red-50/70"
              : "border-green-700/40 bg-green-700/[0.08]"
          }`}
        >
          <h3 className={`text-sm font-bold ${netProfit < 0 ? "text-red-900" : "text-green-900"}`}>
            Podsumowanie — zysk po wszystkich wydatkach
          </h3>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li className="flex justify-between gap-4">
              <span className="text-depths/90">Przychód (Ewidencja)</span>
              <span className="font-semibold tabular-nums">{formatPln(totals.gross)}</span>
            </li>
            <li className="flex justify-between gap-4 text-amber-900">
              <span>− Wynagrodzenia studentów (PAID)</span>
              <span className="font-semibold tabular-nums">{formatPln(paidPayoutsSum)}</span>
            </li>
            <li className="flex justify-between gap-4 text-green-800">
              <span>− Twój PIT (12%)</span>
              <span className="font-semibold tabular-nums">{formatPln(suggestedPit)}</span>
            </li>
            <li className="flex justify-between gap-4 text-depths">
              <span>− Twój ZUS ({selectedZus.label})</span>
              <span className="font-semibold tabular-nums">{formatPln(selectedZus.monthlyAmount)}</span>
            </li>
            <li
              className={`flex justify-between gap-4 border-t pt-2 ${
                netProfit < 0 ? "border-red-400/40" : "border-green-700/30"
              }`}
            >
              <span className={`text-base font-bold ${netProfit < 0 ? "text-red-900" : "text-green-900"}`}>
                {netProfit < 0 ? "Strata na rękę" : "Zostaje zysku na rękę"}
              </span>
              <span
                className={`text-xl font-black tabular-nums ${
                  netProfit < 0 ? "text-red-700" : "text-green-800"
                }`}
              >
                {formatPln(netProfit)}
              </span>
            </li>
          </ul>
        </article>

        <p className="mt-4 text-xs font-medium text-red-800">
          Pamiętaj, aby do 25. dnia miesiąca wysłać plik JPK_V7 (KPiR) z Twojego programu księgowego!
        </p>
      </section>

      <section className="rounded-app border border-panel-frame/40 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-depths text-base font-semibold tracking-tight">Zamknięcie miesiąca</h2>
            <p className="text-muted mt-1 text-xs capitalize">
              {monthLabel}
              {!canClose
                ? " — zamknięcie dostępne od 5. dnia następnego miesiąca."
                : isMonthClosed
                  ? " — ten miesiąc jest już zamknięty (możesz ponowić zapis checklisty)."
                  : " — potwierdź checklistę i zamknij miesiąc."}
            </p>
          </div>
          {isMonthClosed ? (
            <span className="rounded-full bg-green-700/15 px-2.5 py-1 text-[0.65rem] font-bold text-green-800">
              Zamknięty
            </span>
          ) : null}
        </div>

        <ul className="mt-4 space-y-2">
          {(
            [
              ["ewidencjaGenerated", "Ewidencja sprzedaży wygenerowana"],
              ["pendingCleared", "Wszystkie PENDING przeniesione / rozliczone"],
              ["payoutsCalculated", "Wypłaty obliczone"],
              ["pitZusNoted", "PIT / ZUS zapisane w notes"],
            ] as const
          ).map(([key, label]) => (
            <li key={key}>
              <label className="flex cursor-pointer items-center gap-2 rounded-app border border-panel-frame/25 bg-snow px-3 py-2 text-sm text-depths hover:bg-luster/40">
                <input
                  type="checkbox"
                  checked={checklist[key]}
                  onChange={() => toggleCheck(key)}
                  disabled={!canClose && !isMonthClosed}
                />
                <span className="font-medium">{label}</span>
              </label>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCloseMonth}
            disabled={pendingClose || !canClose || !checklistComplete}
            className="rounded-full bg-[#000C4A] px-4 py-2 text-xs font-bold text-lime disabled:opacity-50"
          >
            {pendingClose ? "Zamykanie…" : isMonthClosed ? "Ponów zamknięcie" : "Zamknij miesiąc"}
          </button>
          {closeFeedback ? (
            <p
              className={`text-sm font-medium ${
                closeFeedback.includes("zamknięty") || closeFeedback.includes("zamknięta")
                  ? "text-green-800"
                  : "text-red-700"
              }`}
            >
              {closeFeedback}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
