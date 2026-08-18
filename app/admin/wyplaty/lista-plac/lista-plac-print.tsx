"use client";

import { listaPlacTitles, type ListaPlacRow } from "./lista-plac-shared";

export type { ListaPlacRow };

function formatPln(n: number): string {
  return `${n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
}

export function ListaPlacPrintView({
  monthKey,
  rows,
}: {
  monthKey: string;
  rows: ListaPlacRow[];
}) {
  const { title, subtitle } = listaPlacTitles(monthKey);
  const totalHours = Math.round(rows.reduce((s, r) => s + r.hours, 0) * 10) / 10;
  const totalLessons = Math.round(rows.reduce((s, r) => s + r.lessonsPayoutPln, 0) * 100) / 100;
  const totalBonus = Math.round(rows.reduce((s, r) => s + r.bonusPln, 0) * 100) / 100;
  const totalAll = Math.round(rows.reduce((s, r) => s + r.totalPln, 0) * 100) / 100;
  const generatedAt = new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-white p-6 text-black print:p-4">
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-neutral-600">Lista płac - drukuj lub zapisz jako PDF.</p>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full bg-[#000C4A] px-4 py-2 text-sm font-bold text-lime"
        >
          Drukuj / Zapisz PDF
        </button>
      </div>

      <header className="border-b-2 border-black pb-3">
        <h1 className="text-lg font-bold leading-snug sm:text-xl">{title}</h1>
        <p className="mt-1.5 text-sm text-neutral-700">{subtitle}</p>
        <p className="mt-1 text-xs text-neutral-500">Wygenerowano: {generatedAt}</p>
      </header>

      {rows.length === 0 ? (
        <p className="mt-8 text-center text-sm text-neutral-600">
          Brak zatwierdzonych lekcji (VERIFIED) za ten okres.
        </p>
      ) : (
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-black bg-neutral-100 px-2 py-2 text-left font-bold">Lp.</th>
              <th className="border border-black bg-neutral-100 px-2 py-2 text-left font-bold">
                Nauczyciel
              </th>
              <th className="border border-black bg-neutral-100 px-2 py-2 text-left font-bold">
                Nr konta
              </th>
              <th className="border border-black bg-neutral-100 px-2 py-2 text-right font-bold">
                Lekcje
              </th>
              <th className="border border-black bg-neutral-100 px-2 py-2 text-right font-bold">
                Godziny
              </th>
              <th className="border border-black bg-neutral-100 px-2 py-2 text-right font-bold">
                Wynagrodzenie
              </th>
              <th className="border border-black bg-neutral-100 px-2 py-2 text-right font-bold">
                Premia
              </th>
              <th className="border border-black bg-neutral-100 px-2 py-2 text-right font-bold">
                Razem
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.tutorId}>
                <td className="border border-black px-2 py-1.5 text-center">{i + 1}</td>
                <td className="border border-black px-2 py-1.5 font-medium">{row.tutorName}</td>
                <td className="border border-black px-2 py-1.5 font-mono text-xs">
                  {row.bankAccount || "-"}
                </td>
                <td className="border border-black px-2 py-1.5 text-right tabular-nums">
                  {row.lessonCount}
                </td>
                <td className="border border-black px-2 py-1.5 text-right tabular-nums">
                  {row.hours.toLocaleString("pl-PL", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 1,
                  })}
                </td>
                <td className="border border-black px-2 py-1.5 text-right tabular-nums">
                  {formatPln(row.lessonsPayoutPln)}
                </td>
                <td className="border border-black px-2 py-1.5 text-right tabular-nums">
                  {formatPln(row.bonusPln)}
                </td>
                <td className="border border-black px-2 py-1.5 text-right font-semibold tabular-nums">
                  {formatPln(row.totalPln)}
                </td>
              </tr>
            ))}
            <tr className="bg-neutral-50 font-bold">
              <td className="border border-black px-2 py-2" colSpan={3}>
                Razem
              </td>
              <td className="border border-black px-2 py-2 text-right tabular-nums">
                {rows.reduce((s, r) => s + r.lessonCount, 0)}
              </td>
              <td className="border border-black px-2 py-2 text-right tabular-nums">
                {totalHours.toLocaleString("pl-PL", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 1,
                })}
              </td>
              <td className="border border-black px-2 py-2 text-right tabular-nums">
                {formatPln(totalLessons)}
              </td>
              <td className="border border-black px-2 py-2 text-right tabular-nums">
                {formatPln(totalBonus)}
              </td>
              <td className="border border-black px-2 py-2 text-right tabular-nums">
                {formatPln(totalAll)}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      <section className="mt-10 grid gap-8 text-sm sm:grid-cols-2">
        <div>
          <p className="font-semibold">Sporządził / zatwierdził:</p>
          <div className="mt-10 border-b border-black" />
          <p className="mt-1 text-xs text-neutral-600">data i podpis</p>
        </div>
        <div>
          <p className="font-semibold">Uwagi:</p>
          <div className="mt-10 border-b border-black" />
          <div className="mt-6 border-b border-black" />
        </div>
      </section>
    </div>
  );
}
