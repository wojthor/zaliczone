"use client";

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
  const classLevel = (line.classLevel ?? "").trim() || "—";
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

  return (
    <div className="min-h-screen bg-white p-6 text-black print:p-4">
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-neutral-600">
          Ewidencja zajęć dydaktycznych — drukuj lub zapisz jako PDF.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full bg-[#000C4A] px-4 py-2 text-sm font-bold text-lime"
        >
          Drukuj / Zapisz PDF
        </button>
      </div>

      <header className="border-b-2 border-black pb-3">
        <h1 className="text-xl font-bold uppercase tracking-wide">
          Ewidencja zajęć dydaktycznych
        </h1>
        <p className="mt-1 text-sm">Umowa zlecenia · ZALICZONE · {monthLabel}</p>
      </header>

      <section className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
        <p>
          <span className="font-semibold">Pracownik (zleceniobiorca):</span> {tutorName}
        </p>
        <p>
          <span className="font-semibold">Okres rozliczeniowy:</span>{" "}
          <span className="capitalize">{monthLabel}</span>
        </p>
      </section>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-black bg-neutral-100 px-2 py-2 text-left font-bold">Data</th>
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
              <td colSpan={6} className="border border-black px-2 py-6 text-center text-neutral-500">
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
              {hoursFromMinutes(totalMinutes)}
            </td>
            <td className="border border-black px-2 py-2.5" />
          </tr>
        </tfoot>
      </table>

      <section className="mt-12 grid gap-10 sm:grid-cols-2">
        <div>
          <div className="h-12 border-b border-black" />
          <p className="mt-1 text-xs">Data i podpis zleceniobiorcy</p>
        </div>
        <div>
          <div className="h-12 border-b border-black" />
          <p className="mt-1 text-xs">Data i podpis zleceniodawcy</p>
        </div>
      </section>

      <p className="mt-8 text-[11px] leading-relaxed text-neutral-600">
        Dokument wygenerowany w systemie ZALICZONE na podstawie lekcji o statusie VERIFIED. Każda
        godzina dydaktyczna stanowi osobny wiersz. Poziom nauczania pochodzi z kartoteki ucznia;
        forma zajęć dydaktycznych odpowiada przedmiotowi lekcji. Wydrukuj, podpisz i przekaż skan
        do placówki.
      </p>
    </div>
  );
}
