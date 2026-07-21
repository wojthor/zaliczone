"use client";

import type { FinanceLineUi } from "@/lib/types/database";

/**
 * Ewidencja sprzedaży — miesięczna (pozycje) lub roczna (zestawienie miesięcy).
 */

function formatMonthLongPl(monthKey: string): string {
  const [ys, ms] = monthKey.split("-");
  const d = new Date(Number(ys), Number(ms) - 1, 15);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

function formatPln(n: number): string {
  return `${n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
}

function extractSubject(label: string): string {
  return label.split("·")[0]?.trim().replace("J. ", "") ?? "Lekcja";
}

function serviceName(line: FinanceLineUi): string {
  const subject = line.subject?.trim() || extractSubject(line.label);
  return line.classLevel ? `Korepetycje - ${subject} (${line.classLevel})` : `Korepetycje - ${subject}`;
}

function buildYearMonthRows(lines: FinanceLineUi[]): { monthKey: string; label: string; gross: number }[] {
  const byMonth = new Map<string, number>();
  for (const line of lines) {
    byMonth.set(line.monthKey, (byMonth.get(line.monthKey) ?? 0) + line.amountPln);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, gross]) => ({
      monthKey,
      label: formatMonthLongPl(monthKey),
      gross: Math.round(gross * 100) / 100,
    }));
}

export function EwidencjaSprzedazyPrintView({
  periodLabel,
  lines,
  periodIsMonth = false,
  companyName = "ZALICZONE",
  companyNip = "………………",
  companyAddress = "……………………………………",
}: {
  periodLabel: string;
  lines: FinanceLineUi[];
  periodIsMonth?: boolean;
  companyName?: string;
  companyNip?: string;
  companyAddress?: string;
}) {
  const displayPeriod = periodIsMonth ? formatMonthLongPl(periodLabel) : periodLabel;

  if (!periodIsMonth) {
    const monthRows = buildYearMonthRows(lines);
    const total = monthRows.reduce((s, r) => s + r.gross, 0);

    return (
      <div className="min-h-screen bg-white p-6 text-black print:p-4">
        <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
          <p className="text-sm text-neutral-600">
            Ewidencja roczna — zestawienie miesięcy. Drukuj / zapisz PDF.
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
            Ewidencja sprzedaży bezrachunkowej — zestawienie roczne
          </h1>
          <p className="mt-1 text-sm capitalize">{displayPeriod} — tylko VERIFIED</p>
        </header>

        <section className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
          <p>
            <span className="font-semibold">Nazwa firmy:</span> {companyName}
          </p>
          <p>
            <span className="font-semibold">NIP:</span> {companyNip}
          </p>
          <p className="sm:col-span-2">
            <span className="font-semibold">Adres:</span> {companyAddress}
          </p>
        </section>

        <table className="mt-5 w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-[34%] border border-black bg-neutral-100 px-2 py-2 text-left font-bold">
                Miesiąc
              </th>
              <th className="w-[33%] border border-black bg-neutral-100 px-2 py-2 text-right font-bold">
                Suma z ewidencji miesięcznej
              </th>
              <th className="w-[33%] border border-black bg-neutral-100 px-2 py-2 text-right font-bold">
                Kwota narastająco (suma roku)
              </th>
            </tr>
          </thead>
          <tbody>
            {monthRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="border border-black px-2 py-6 text-center text-neutral-500">
                  Brak pozycji VERIFIED w tym roku.
                </td>
              </tr>
            ) : (
              (() => {
                let running = 0;
                return monthRows.map((row) => {
                  running = Math.round((running + row.gross) * 100) / 100;
                  return (
                    <tr key={row.monthKey}>
                      <td className="border border-black px-2 py-2 capitalize">{row.label}</td>
                      <td className="border border-black px-2 py-2 text-right font-semibold tabular-nums">
                        {formatPln(row.gross)}
                      </td>
                      <td className="border border-black px-2 py-2 text-right font-semibold tabular-nums">
                        {formatPln(running)}
                      </td>
                    </tr>
                  );
                });
              })()
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="border border-black px-2 py-2.5 text-right font-bold">Suma roku</td>
              <td className="border border-black px-2 py-2.5 text-right font-bold tabular-nums">
                {formatPln(total)}
              </td>
              <td className="border border-black px-2 py-2.5 text-right font-bold tabular-nums">
                {formatPln(total)}
              </td>
            </tr>
          </tfoot>
        </table>

        <section className="mt-12 grid gap-10 sm:grid-cols-2">
          <div>
            <div className="h-12 border-b border-black" />
            <p className="mt-1 text-xs">Data</p>
          </div>
          <div>
            <div className="h-12 border-b border-black" />
            <p className="mt-1 text-xs">Podpis osoby prowadzącej ewidencję</p>
          </div>
        </section>
      </div>
    );
  }

  const rows = [...lines].sort(
    (a, b) => a.dateIso.localeCompare(b.dateIso) || a.id.localeCompare(b.id),
  );
  const total = rows.reduce((s, l) => s + l.amountPln, 0);

  return (
    <div className="min-h-screen bg-white p-6 text-black print:p-4">
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-neutral-600">
          Ewidencja sprzedaży — drukuj / zapisz PDF (zbroszuruuj, ponumeruj strony).
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
          Ewidencja sprzedaży bezrachunkowej
        </h1>
        <p className="mt-1 text-sm capitalize">{displayPeriod} — tylko VERIFIED</p>
      </header>

      <section className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
        <p>
          <span className="font-semibold">Nazwa firmy:</span> {companyName}
        </p>
        <p>
          <span className="font-semibold">NIP:</span> {companyNip}
        </p>
        <p className="sm:col-span-2">
          <span className="font-semibold">Adres:</span> {companyAddress}
        </p>
      </section>

      <table className="mt-5 w-full border-collapse text-[0.8rem]">
        <thead>
          <tr>
            <th className="w-[4%] border border-black bg-neutral-100 px-1.5 py-2 text-left font-bold">
              Lp.
            </th>
            <th className="w-[10%] border border-black bg-neutral-100 px-1.5 py-2 text-left font-bold">
              Data sprzedaży
            </th>
            <th className="w-[10%] border border-black bg-neutral-100 px-1.5 py-2 text-left font-bold">
              Data wpływu
            </th>
            <th className="w-[11%] border border-black bg-neutral-100 px-1.5 py-2 text-left font-bold">
              Metoda płatności
            </th>
            <th className="w-[20%] border border-black bg-neutral-100 px-1.5 py-2 text-left font-bold">
              Nazwa usługi
            </th>
            <th className="w-[15%] border border-black bg-neutral-100 px-1.5 py-2 text-left font-bold">
              Nabywca
            </th>
            <th className="w-[12%] border border-black bg-neutral-100 px-1.5 py-2 text-right font-bold">
              Brutto
            </th>
            <th className="w-[18%] border border-black bg-neutral-100 px-1.5 py-2 text-right font-bold">
              Kwota narastająco
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="border border-black px-2 py-6 text-center text-neutral-500">
                Brak pozycji VERIFIED w tym miesiącu.
              </td>
            </tr>
          ) : (
            (() => {
              let running = 0;
              return rows.map((line, i) => {
                running = Math.round((running + line.amountPln) * 100) / 100;
                return (
                  <tr key={line.id}>
                    <td className="border border-black px-1.5 py-1.5 tabular-nums">{i + 1}</td>
                    <td className="border border-black px-1.5 py-1.5 tabular-nums">{line.date}</td>
                    <td className="border border-black px-1.5 py-1.5 tabular-nums">
                      {line.paymentReceivedAt ?? line.date}
                    </td>
                    <td className="border border-black px-1.5 py-1.5">{line.paymentMethod ?? "—"}</td>
                    <td className="border border-black px-1.5 py-1.5">{serviceName(line)}</td>
                    <td className="border border-black px-1.5 py-1.5">{line.studentName}</td>
                    <td className="border border-black px-1.5 py-1.5 text-right font-semibold tabular-nums">
                      {formatPln(line.amountPln)}
                    </td>
                    <td className="border border-black px-1.5 py-1.5 text-right font-semibold tabular-nums">
                      {formatPln(running)}
                    </td>
                  </tr>
                );
              });
            })()
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={6} className="border border-black px-1.5 py-2.5 text-right font-bold">
              Suma przychodów w okresie
            </td>
            <td className="border border-black px-1.5 py-2.5 text-right font-bold tabular-nums">
              {formatPln(total)}
            </td>
            <td className="border border-black px-1.5 py-2.5 text-right font-bold tabular-nums">
              {formatPln(total)}
            </td>
          </tr>
        </tfoot>
      </table>

      <section className="mt-12 grid gap-10 sm:grid-cols-2">
        <div>
          <div className="h-12 border-b border-black" />
          <p className="mt-1 text-xs">Data</p>
        </div>
        <div>
          <div className="h-12 border-b border-black" />
          <p className="mt-1 text-xs">Podpis osoby prowadzącej ewidencję</p>
        </div>
      </section>

      <p className="mt-8 text-[11px] leading-relaxed text-neutral-600">
        Wygenerowano w ZALICZONE na podstawie lekcji VERIFIED. Ewidencję przechowuj w formie
        zbroszurowanej, z ponumerowanymi kartami.
      </p>
    </div>
  );
}
