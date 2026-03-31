"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DEMO_FINANCE_LINES } from "@/lib/demo-data";

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

function monthKeyFromLessonDateDdMm(dateLabel: string): string {
  const [, mm] = dateLabel.split(".");
  const y = new Date().getFullYear();
  return `${y}-${String(Number(mm ?? "1")).padStart(2, "0")}`;
}

function formatMonthLongPl(monthKey: string): string {
  const [ys, ms] = monthKey.split("-");
  const d = new Date(Number(ys), Number(ms) - 1, 15);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

function extractSubject(label: string): string {
  return label.split("·")[0]?.trim().replace("J. ", "") ?? "Lekcja";
}

export function KsiegowoscClient() {
  const nowKey = useMemo(() => currentMonthKey(), []);
  const [selectedMonthKey, setSelectedMonthKey] = useState(nowKey);
  const [generatedStamp, setGeneratedStamp] = useState<string | null>(null);

  const ledgerRows: LedgerRow[] = useMemo(() => {
    return DEMO_FINANCE_LINES.filter((l) => monthKeyFromLessonDateDdMm(l.date) === selectedMonthKey).map((l) => ({
      id: l.id,
      lessonDate: l.date,
      paidAt: `${nowKey}-30`,
      serviceName: `Korepetycje - ${extractSubject(l.label)}`,
      buyer: l.studentName,
      grossPln: l.amountPln,
    }));
  }, [selectedMonthKey, nowKey]);

  const monthLabel = useMemo(() => formatMonthLongPl(selectedMonthKey), [selectedMonthKey]);
  const monthOptions = useMemo(() => {
    const keys = [...new Set(DEMO_FINANCE_LINES.map((l) => monthKeyFromLessonDateDdMm(l.date)))];
    keys.sort();
    if (!keys.includes(nowKey)) keys.push(nowKey);
    return keys.slice().reverse();
  }, [nowKey]);

  const th =
    "border-b border-panel-frame/40 bg-jodhpur/90 px-1 py-1 text-left text-[0.55rem] font-bold uppercase leading-tight text-depths sm:px-1.5 sm:py-1.5 sm:text-[0.6rem]";
  const td =
    "border-b border-panel-frame/15 px-1 py-1 align-top text-[0.62rem] leading-tight break-words sm:px-1.5 sm:py-1.5 sm:text-[0.7rem]";
  const rowZebra = "bg-snow even:bg-luster/40 hover:bg-luster/60";

  return (
    <div className="min-w-0 space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-depths text-lg font-semibold tracking-tight sm:text-xl">Księgowość</h1>
          <p className="text-muted mt-0.5 text-[0.7rem] capitalize leading-snug sm:text-xs">{monthLabel} — ewidencja sprzedaży.</p>
        </div>
        <Link
          href="/admin/rozliczenia"
          className="shrink-0 rounded-full bg-[#000C4A] px-2.5 py-1 text-center text-[0.65rem] font-bold text-lime transition-opacity hover:opacity-90 sm:px-3 sm:py-1.5 sm:text-xs"
        >
          ← Rozliczenia
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-2 sm:gap-3">
        <label className="grid min-w-0 gap-0.5">
          <span className="text-depths/80 text-[0.65rem] font-semibold sm:text-xs">Miesiąc</span>
          <select
            className="text-depths rounded-app border border-panel-frame/40 bg-white px-2 py-1 text-xs font-medium sm:px-2.5 sm:py-1.5"
            value={selectedMonthKey}
            onChange={(e) => setSelectedMonthKey(e.target.value)}
            aria-label="Miesiąc ewidencji sprzedaży"
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
          onClick={() => setGeneratedStamp(new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(new Date()))}
          className="rounded-full bg-[#000C4A] px-2.5 py-1 text-[0.65rem] font-bold text-lime sm:px-3 sm:py-1.5 sm:text-xs"
        >
          Wygeneruj
        </button>
        <Link href="/admin/dokumenty" className="rounded-full bg-jodhpur px-2.5 py-1 text-[0.65rem] font-bold text-depths sm:px-3 sm:py-1.5 sm:text-xs">
          Archiwum →
        </Link>
      </div>

      {generatedStamp ? (
        <p className="text-muted text-[0.65rem] font-medium sm:text-xs">
          Wygenerowano: {generatedStamp}
        </p>
      ) : null}

      <div>
        <h2 className="text-depths mb-1 text-sm font-semibold">Ewidencja sprzedaży</h2>
        {ledgerRows.length === 0 ? (
          <p className="text-muted py-4 text-xs">Brak pozycji w tym miesiącu (demo).</p>
        ) : (
          <div className="max-h-[min(20rem,42vh)] overflow-y-auto overflow-x-hidden rounded-lg border border-panel-frame/35 scrollbar-panel sm:max-h-[min(24rem,50vh)] sm:rounded-app">
            <table className="table-fixed w-full min-w-0 border-collapse">
              <thead className="sticky top-0 z-1 bg-jodhpur/95 shadow-[inset_0_-1px_0_0_rgb(136_154_204/0.35)]">
                <tr>
                  <th scope="col" className={`${th} w-[6%]`}>
                    Lp.
                  </th>
                  <th scope="col" className={`${th} w-[12%]`}>
                    <span className="sm:hidden">Wykon.</span>
                    <span className="hidden sm:inline">Data wykonania</span>
                  </th>
                  <th scope="col" className={`${th} w-[12%]`}>
                    <span className="sm:hidden">Zapłata</span>
                    <span className="hidden sm:inline">Data zapłaty</span>
                  </th>
                  <th scope="col" className={`${th} w-[32%]`}>
                    Nazwa usługi
                  </th>
                  <th scope="col" className={`${th} w-[26%]`}>
                    Nabywca
                  </th>
                  <th scope="col" className={`${th} w-[12%] text-right`}>
                    Brutto
                  </th>
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
                    <td className={`${td} text-right tabular-nums font-bold`}>{r.grossPln} zł</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
