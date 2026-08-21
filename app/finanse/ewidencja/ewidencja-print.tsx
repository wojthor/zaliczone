"use client";

import Link from "next/link";
import type { FinanceLineUi } from "@/lib/types/database";

function formatMonthLongPl(monthKey: string): string {
  const [ys, ms] = monthKey.split("-");
  const d = new Date(Number(ys), Number(ms) - 1, 15);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

function minutesFromLine(line: FinanceLineUi): number {
  if (line.durationMinutes > 0) return line.durationMinutes;
  const match = line.label.match(/(\d+)\s*min/);
  return match ? Number(match[1]) : 60;
}

function hoursFromMinutes(minutes: number): string {
  return (minutes / 60).toLocaleString("pl-PL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function weekdayFromIso(dateIso: string): string {
  return new Intl.DateTimeFormat("pl-PL", { weekday: "long" }).format(
    new Date(`${dateIso}T12:00:00`),
  );
}

function weekdayShortFromIso(dateIso: string): string {
  return new Intl.DateTimeFormat("pl-PL", { weekday: "short" }).format(
    new Date(`${dateIso}T12:00:00`),
  );
}

function formatDdMmYyyy(dateIso: string): string {
  const [y, m, d] = dateIso.split("-");
  if (!y || !m || !d) return dateIso;
  return `${d}.${m}.${y}`;
}

/**
 * Rozbija lekcję na wiersze godzinowe: pełne godziny + ewentualna reszta.
 * Np. 90 min → 1,00 h + 0,50 h; 60 min → 1,00 h.
 */
function expandLessonToHourRows(line: FinanceLineUi): Array<{
  key: string;
  dateIso: string;
  classLevel: string;
  activityType: string;
  minutes: number;
}> {
  const totalMinutes = minutesFromLine(line);
  const fullHours = Math.floor(totalMinutes / 60);
  const remainder = totalMinutes % 60;
  const classLevel = (line.classLevel ?? "").trim() || "-";
  const activityType = (line.subject ?? "").trim() || "Zajęcia dydaktyczne";
  const dateIso = line.dateIso || `${line.monthKey}-01`;
  const base = { dateIso, classLevel, activityType };

  const rows: Array<{
    key: string;
    dateIso: string;
    classLevel: string;
    activityType: string;
    minutes: number;
  }> = [];

  for (let i = 0; i < fullHours; i++) {
    rows.push({ ...base, key: `${line.id}-h${i + 1}`, minutes: 60 });
  }
  if (remainder > 0 || rows.length === 0) {
    rows.push({
      ...base,
      key: `${line.id}-r`,
      minutes: remainder > 0 ? remainder : totalMinutes,
    });
  }
  return rows;
}

export function EwidencjaPrintView({
  month,
  tutorName,
  lines,
}: {
  month: string;
  tutorName: string;
  lines: FinanceLineUi[];
}) {
  const sortedLines = [...lines].sort((a, b) =>
    (a.dateIso || "").localeCompare(b.dateIso || ""),
  );

  const rows = sortedLines.flatMap(expandLessonToHourRows);
  const totalMinutes = rows.reduce((sum, row) => sum + row.minutes, 0);
  const monthLabel = formatMonthLongPl(month);
  const totalHoursLabel = hoursFromMinutes(totalMinutes);

  return (
    <div className="min-h-dvh bg-[#F0EFEA] text-black print:bg-white print:p-0">
      {/* Pasek akcji - tylko ekran */}
      <div className="sticky top-0 z-20 border-b border-black/10 bg-[#F0EFEA]/95 backdrop-blur-sm print:hidden">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-3 py-2.5 sm:px-6">
          <Link
            href="/finanse"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#000C4A]"
            aria-label="Wróć do finansów"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold uppercase tracking-wide text-[#000C4A]">
              Ewidencja
            </p>
            <p className="truncate text-[11px] capitalize text-neutral-600">{monthLabel}</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="hidden shrink-0 rounded-full bg-[#000C4A] px-4 py-2.5 text-sm font-bold text-[#D5ED21] sm:inline-flex"
          >
            Drukuj / Zapisz PDF
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-10 print:max-w-none print:px-4 print:pb-4 print:pt-4">
        <article className="rounded-xl bg-white p-4 sm:p-6 print:rounded-none print:p-0">
          <header className="border-b-2 border-black pb-3">
            <h1 className="text-base font-bold uppercase leading-snug tracking-wide sm:text-xl">
              Ewidencja zajęć dydaktycznych
            </h1>
            <p className="mt-1 text-xs sm:text-sm">
              Umowa zlecenia · ZALICZONE · <span className="capitalize">{monthLabel}</span>
            </p>
          </header>

          <section className="mt-4 grid gap-2 text-sm sm:grid-cols-2 sm:gap-1">
            <p>
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-neutral-500 sm:inline sm:text-sm sm:normal-case sm:tracking-normal sm:text-black">
                Pracownik (zleceniobiorca)
              </span>{" "}
              <span className="font-medium sm:font-normal">{tutorName}</span>
            </p>
            <p>
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-neutral-500 sm:inline sm:text-sm sm:normal-case sm:tracking-normal sm:text-black">
                Okres rozliczeniowy
              </span>{" "}
              <span className="font-medium capitalize sm:font-normal">{monthLabel}</span>
            </p>
          </section>

          {/* Podsumowanie godzin - widoczne na mobile */}
          <div className="mt-4 flex items-center justify-between rounded-lg bg-[#000C4A] px-3.5 py-3 text-white md:hidden print:hidden">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/70">
              Razem godzin
            </span>
            <span className="text-lg font-extrabold tabular-nums text-[#D5ED21]">
              {totalHoursLabel}
            </span>
          </div>

          {/* Karty - mobile / tablet portrait */}
          <ul className="mt-4 space-y-2 md:hidden print:hidden">
            {rows.length === 0 ? (
              <li className="rounded-lg border border-dashed border-neutral-300 px-3 py-8 text-center text-sm text-neutral-500">
                Brak zatwierdzonych lekcji w tym miesiącu.
              </li>
            ) : (
              rows.map((row) => (
                <li
                  key={row.key}
                  className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold tabular-nums text-[#000C4A]">
                        {formatDdMmYyyy(row.dateIso)}
                        <span className="ml-1.5 font-semibold capitalize text-neutral-500">
                          · {weekdayShortFromIso(row.dateIso)}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-sm font-medium text-neutral-800">
                        {row.activityType}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">{row.classLevel}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-white px-2 py-1 text-sm font-extrabold tabular-nums text-[#000C4A] ring-1 ring-neutral-200">
                      {hoursFromMinutes(row.minutes)} h
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>

          {/* Tabela - desktop ekran + zawsze druk */}
          <div className="mt-6 hidden overflow-x-auto md:block print:mt-6 print:block print:overflow-visible">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-black bg-neutral-100 px-2 py-2 text-left font-bold">
                    Data
                  </th>
                  <th className="border border-black bg-neutral-100 px-2 py-2 text-left font-bold">
                    Dzień tygodnia
                  </th>
                  <th className="border border-black bg-neutral-100 px-2 py-2 text-left font-bold">
                    Poziom nauczania
                  </th>
                  <th className="border border-black bg-neutral-100 px-2 py-2 text-left font-bold">
                    Forma zajęć dydaktycznych
                  </th>
                  <th className="border border-black bg-neutral-100 px-2 py-2 text-right font-bold">
                    Liczba godzin
                  </th>
                  <th className="border border-black bg-neutral-100 px-2 py-2 text-left font-bold">
                    Podpis
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="border border-black px-2 py-6 text-center text-neutral-500"
                    >
                      Brak zatwierdzonych lekcji w tym miesiącu.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.key}>
                      <td className="border border-black px-2 py-2 tabular-nums">
                        {formatDdMmYyyy(row.dateIso)}
                      </td>
                      <td className="border border-black px-2 py-2 capitalize">
                        {weekdayFromIso(row.dateIso)}
                      </td>
                      <td className="border border-black px-2 py-2">{row.classLevel}</td>
                      <td className="border border-black px-2 py-2">{row.activityType}</td>
                      <td className="border border-black px-2 py-2 text-right tabular-nums">
                        {hoursFromMinutes(row.minutes)}
                      </td>
                      <td className="border border-black px-2 py-2">&nbsp;</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="border border-black px-2 py-2.5 text-right font-bold">
                    Razem godzin dydaktycznych
                  </td>
                  <td className="border border-black px-2 py-2.5 text-right font-bold tabular-nums">
                    {totalHoursLabel}
                  </td>
                  <td className="border border-black px-2 py-2.5" />
                </tr>
              </tfoot>
            </table>
          </div>

          <section className="mt-10 grid gap-8 sm:mt-12 sm:grid-cols-2 sm:gap-10 print:mt-12">
            <div>
              <div className="h-12 border-b border-black" />
              <p className="mt-1 text-xs">Data i podpis zleceniobiorcy</p>
            </div>
            <div>
              <div className="h-12 border-b border-black" />
              <p className="mt-1 text-xs">Data i podpis zleceniodawcy</p>
            </div>
          </section>
        </article>
      </div>

      {/* Sticky CTA na telefonie */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:hidden print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex w-full items-center justify-center rounded-full bg-[#000C4A] px-4 py-3.5 text-sm font-extrabold uppercase tracking-wide text-[#D5ED21]"
        >
          Drukuj / Zapisz PDF
        </button>
      </div>
    </div>
  );
}
