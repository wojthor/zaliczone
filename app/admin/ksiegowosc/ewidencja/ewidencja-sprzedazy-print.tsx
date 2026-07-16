"use client";

import type { FinanceLineUi } from "@/lib/types/database";

/**
 * Zestawienie sprzedaży (ewidencja sprzedaży) — § 11 / § 17 rozporządzenia
 * Ministra Finansów i Gospodarki z 6.09.2025 w sprawie KPiR (od 1.01.2026).
 * Wymagane minimum: lp., data uzyskania przychodu, kwota przychodu.
 * Opis sprzedaży — praktyczne uzupełnienie (zalecane).
 */

function formatMonthLongPl(monthKey: string): string {
  const [ys, ms] = monthKey.split("-");
  const d = new Date(Number(ys), Number(ms) - 1, 15);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

function formatDdMmYyyy(dateIso: string): string {
  const [y, m, d] = dateIso.split("-");
  if (!y || !m || !d) return dateIso;
  return `${d}.${m}.${y}`;
}

function formatPln(n: number): string {
  return n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function extractService(line: FinanceLineUi): string {
  const subject = line.subject?.trim() || line.label.split("·")[0]?.trim() || "Korepetycje";
  const buyer = line.studentName?.trim();
  const base = `Usługa edukacyjna — korepetycje (${subject})`;
  return buyer ? `${base}, uczeń: ${buyer}` : base;
}

function revenueDateIso(line: FinanceLineUi, month: string): string {
  // Data uzyskania przychodu: data wpływu na konto, inaczej dzień lekcji
  if (line.paymentReceivedAtIso) return line.paymentReceivedAtIso;
  if (line.dateIso) return line.dateIso;
  return `${month}-01`;
}

export function EwidencjaSprzedazyPrintView({
  month,
  lines,
  companyName = "ZALICZONE",
  companyNip = "………………",
  companyAddress = "……………………………………",
}: {
  month: string;
  lines: FinanceLineUi[];
  companyName?: string;
  companyNip?: string;
  companyAddress?: string;
}) {
  const rows = [...lines].sort((a, b) =>
    revenueDateIso(a, month).localeCompare(revenueDateIso(b, month)),
  );
  const total = rows.reduce((s, l) => s + l.amountPln, 0);
  const monthLabel = formatMonthLongPl(month);

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
          Zestawienie sprzedaży (ewidencja sprzedaży)
        </h1>
        <p className="mt-1 text-sm capitalize">Okres: {monthLabel}</p>
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

      <p className="mt-4 text-[11px] leading-relaxed text-neutral-700">
        Zgodnie z rozporządzeniem MF (KPiR, od 1.01.2026) ewidencja zawiera co najmniej:{" "}
        <strong>lp.</strong>, <strong>datę uzyskania przychodu</strong>,{" "}
        <strong>kwotę przychodu</strong>. Kolumna „Opis sprzedaży” uzupełnia dokument praktycznie.
        Zapisy w ewidencji: raz dziennie po zakończeniu dnia. Do KPiR zbiorczo na koniec miesiąca.
      </p>

      <table className="mt-5 w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-[8%] border border-black bg-neutral-100 px-2 py-2 text-left font-bold">
              Lp.
            </th>
            <th className="w-[18%] border border-black bg-neutral-100 px-2 py-2 text-left font-bold">
              Data uzyskania przychodu
            </th>
            <th className="border border-black bg-neutral-100 px-2 py-2 text-left font-bold">
              Opis sprzedaży
            </th>
            <th className="w-[18%] border border-black bg-neutral-100 px-2 py-2 text-right font-bold">
              Kwota przychodu (zł)
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="border border-black px-2 py-6 text-center text-neutral-500">
                Brak pozycji VERIFIED w tym miesiącu.
              </td>
            </tr>
          ) : (
            rows.map((line, i) => (
              <tr key={line.id}>
                <td className="border border-black px-2 py-2 tabular-nums">{i + 1}</td>
                <td className="border border-black px-2 py-2 tabular-nums">
                  {formatDdMmYyyy(revenueDateIso(line, month))}
                </td>
                <td className="border border-black px-2 py-2">{extractService(line)}</td>
                <td className="border border-black px-2 py-2 text-right tabular-nums">
                  {formatPln(line.amountPln)}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="border border-black px-2 py-2.5 text-right font-bold">
              Suma przychodów w miesiącu
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

      <p className="mt-8 text-[11px] leading-relaxed text-neutral-600">
        Wygenerowano w ZALICZONE na podstawie lekcji VERIFIED. Ewidencję przechowuj w formie
        zbroszurowanej, z ponumerowanymi kartami.
      </p>
    </div>
  );
}
