"use client";

import type { OperatingExpense, Payout } from "@/lib/types/database";

function formatMonthLongPl(monthKey: string): string {
  const [ys, ms] = monthKey.split("-");
  const d = new Date(Number(ys), Number(ms) - 1, 15);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

function formatPln(n: number): string {
  return `${n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
}

function formatExpenseDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

function payoutLessonsAndBonus(p: Payout): { lessons: number; bonus: number } {
  const bonus = Number(p.bonus_amount ?? 0);
  const lessons =
    p.lessons_amount != null
      ? Number(p.lessons_amount)
      : Math.round((Number(p.amount) - bonus) * 100) / 100;
  return { lessons, bonus };
}

export type YearCostPrintRow = {
  monthKey: string;
  label: string;
  payoutsPln: number;
  bonusesPln: number;
  extraCostsPln: number;
  totalPln: number;
};

export function buildYearCostRows(
  year: string,
  payouts: Payout[],
  expenses: OperatingExpense[],
): YearCostPrintRow[] {
  const keys = new Set<string>();
  const yearNum = Number(year);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const lastMonthInYear =
    yearNum < currentYear ? 12 : yearNum === currentYear ? currentMonth : 0;
  for (let m = 1; m <= lastMonthInYear; m++) {
    keys.add(`${year}-${String(m).padStart(2, "0")}`);
  }
  for (const p of payouts) {
    if (p.month.startsWith(`${year}-`)) keys.add(p.month);
  }
  for (const e of expenses) {
    if (e.month.startsWith(`${year}-`)) keys.add(e.month);
  }
  return [...keys]
    .sort()
    .map((monthKey) => {
      let payoutsPln = 0;
      let bonusesPln = 0;
      for (const p of payouts) {
        if (p.month !== monthKey || p.status !== "PAID") continue;
        payoutsPln += Number(p.amount);
        bonusesPln += payoutLessonsAndBonus(p).bonus;
      }
      payoutsPln = Math.round(payoutsPln * 100) / 100;
      bonusesPln = Math.round(bonusesPln * 100) / 100;
      const extraCostsPln =
        Math.round(
          expenses
            .filter((e) => e.month === monthKey)
            .reduce((s, e) => s + Number(e.amount_pln), 0) * 100,
        ) / 100;
      const totalPln = Math.round((payoutsPln + extraCostsPln) * 100) / 100;
      return {
        monthKey,
        label: formatMonthLongPl(monthKey),
        payoutsPln,
        bonusesPln,
        extraCostsPln,
        totalPln,
      };
    });
}

export function ZestawienieKosztowPrintView({
  periodLabel,
  expenses,
  periodIsMonth = false,
  yearCostRows,
  companyName = "ZALICZONE",
  companyNip = "………………",
  companyAddress = "……………………………………",
}: {
  periodLabel: string;
  expenses: OperatingExpense[];
  periodIsMonth?: boolean;
  yearCostRows?: YearCostPrintRow[];
  companyName?: string;
  companyNip?: string;
  companyAddress?: string;
}) {
  const displayPeriod = periodIsMonth ? formatMonthLongPl(periodLabel) : periodLabel;

  if (!periodIsMonth && yearCostRows) {
    const totals = {
      payoutsPln: Math.round(yearCostRows.reduce((s, r) => s + r.payoutsPln, 0) * 100) / 100,
      bonusesPln: Math.round(yearCostRows.reduce((s, r) => s + r.bonusesPln, 0) * 100) / 100,
      extraCostsPln: Math.round(yearCostRows.reduce((s, r) => s + r.extraCostsPln, 0) * 100) / 100,
      totalPln: Math.round(yearCostRows.reduce((s, r) => s + r.totalPln, 0) * 100) / 100,
    };

    return (
      <div className="min-h-screen bg-white p-6 text-black print:p-4">
        <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
          <p className="text-sm text-neutral-600">
            Zestawienie kosztów roczne — drukuj / zapisz PDF.
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
            Zestawienie kosztów — podział miesięczny
          </h1>
          <p className="mt-1 text-sm capitalize">{displayPeriod}</p>
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
              <th className="border border-black bg-neutral-100 px-2 py-2 text-left font-bold">
                Miesiąc
              </th>
              <th className="border border-black bg-neutral-100 px-2 py-2 text-right font-bold">
                Wypłaty
              </th>
              <th className="border border-black bg-neutral-100 px-2 py-2 text-right font-bold">
                Premie
              </th>
              <th className="border border-black bg-neutral-100 px-2 py-2 text-right font-bold">
                Koszty dodatkowe
              </th>
              <th className="border border-black bg-neutral-100 px-2 py-2 text-right font-bold">
                Suma
              </th>
            </tr>
          </thead>
          <tbody>
            {yearCostRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="border border-black px-2 py-6 text-center text-neutral-500">
                  Brak kosztów w tym roku.
                </td>
              </tr>
            ) : (
              yearCostRows.map((row) => (
                <tr key={row.monthKey}>
                  <td className="border border-black px-2 py-2 capitalize">{row.label}</td>
                  <td className="border border-black px-2 py-2 text-right tabular-nums">
                    {formatPln(row.payoutsPln)}
                  </td>
                  <td className="border border-black px-2 py-2 text-right tabular-nums">
                    {formatPln(row.bonusesPln)}
                  </td>
                  <td className="border border-black px-2 py-2 text-right tabular-nums">
                    {formatPln(row.extraCostsPln)}
                  </td>
                  <td className="border border-black px-2 py-2 text-right font-semibold tabular-nums">
                    {formatPln(row.totalPln)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="border border-black px-2 py-2.5 font-bold">Suma roku</td>
              <td className="border border-black px-2 py-2.5 text-right font-bold tabular-nums">
                {formatPln(totals.payoutsPln)}
              </td>
              <td className="border border-black px-2 py-2.5 text-right font-bold tabular-nums">
                {formatPln(totals.bonusesPln)}
              </td>
              <td className="border border-black px-2 py-2.5 text-right font-bold tabular-nums">
                {formatPln(totals.extraCostsPln)}
              </td>
              <td className="border border-black px-2 py-2.5 text-right font-bold tabular-nums">
                {formatPln(totals.totalPln)}
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
            <p className="mt-1 text-xs">Podpis</p>
          </div>
        </section>
      </div>
    );
  }

  const rows = [...expenses].sort(
    (a, b) =>
      a.invoice_date.localeCompare(b.invoice_date) ||
      a.expense_name.localeCompare(b.expense_name, "pl") ||
      a.id.localeCompare(b.id),
  );
  const total = Math.round(rows.reduce((s, e) => s + Number(e.amount_pln), 0) * 100) / 100;

  return (
    <div className="min-h-screen bg-white p-6 text-black print:p-4">
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-neutral-600">
          Zestawienie kosztów — drukuj / zapisz PDF.
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
        <h1 className="text-xl font-bold uppercase tracking-wide">Zestawienie kosztów</h1>
        <p className="mt-1 text-sm capitalize">
          {displayPeriod} — rachunki i faktury (poza wypłatami tutorów)
        </p>
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
            <th className="w-[6%] border border-black bg-neutral-100 px-1.5 py-2 text-left font-bold">
              Lp.
            </th>
            <th className="w-[12%] border border-black bg-neutral-100 px-1.5 py-2 text-left font-bold">
              Data rachunku/faktury
            </th>
            <th className="w-[14%] border border-black bg-neutral-100 px-1.5 py-2 text-left font-bold">
              Numer dokumentu
            </th>
            <th className="w-[28%] border border-black bg-neutral-100 px-1.5 py-2 text-left font-bold">
              Nazwa wydatku
            </th>
            <th className="w-[24%] border border-black bg-neutral-100 px-1.5 py-2 text-left font-bold">
              Dane wystawcy
            </th>
            <th className="w-[16%] border border-black bg-neutral-100 px-1.5 py-2 text-right font-bold">
              Kwota
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="border border-black px-2 py-6 text-center text-neutral-500">
                Brak kosztów w tym okresie.
              </td>
            </tr>
          ) : (
            rows.map((e, i) => (
              <tr key={e.id}>
                <td className="border border-black px-1.5 py-1.5 tabular-nums">{i + 1}</td>
                <td className="border border-black px-1.5 py-1.5 tabular-nums">
                  {formatExpenseDate(e.invoice_date)}
                </td>
                <td className="border border-black px-1.5 py-1.5">{e.document_number || "—"}</td>
                <td className="border border-black px-1.5 py-1.5 font-medium">{e.expense_name}</td>
                <td className="border border-black px-1.5 py-1.5">{e.issuer_name}</td>
                <td className="border border-black px-1.5 py-1.5 text-right font-semibold tabular-nums">
                  {formatPln(Number(e.amount_pln))}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={5} className="border border-black px-1.5 py-2.5 text-right font-bold">
              Suma
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
          <p className="mt-1 text-xs">Podpis</p>
        </div>
      </section>
    </div>
  );
}
