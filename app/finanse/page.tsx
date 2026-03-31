"use client";

import { useEffect, useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { DEMO_CENNIK, DEMO_FINANCE_LINES, DEMO_STUDENTS } from "@/lib/demo-data";

function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function enumerateMonthsInclusive(from: string, to: string): string[] {
  if (from > to) return [];
  const out: string[] = [];
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  let y = fy!;
  let mo = fm!;
  while (y < ty! || (y === ty! && mo <= tm!)) {
    out.push(`${y}-${String(mo).padStart(2, "0")}`);
    mo += 1;
    if (mo > 12) {
      mo = 1;
      y += 1;
    }
  }
  return out;
}

function formatMonthLongPl(monthKey: string): string {
  const [ys, ms] = monthKey.split("-");
  const d = new Date(Number(ys), Number(ms) - 1, 15);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

function monthKeyFromFinanceDate(dateLabel: string): string {
  const [, mm] = dateLabel.split(".");
  const y = new Date().getFullYear();
  return `${y}-${String(Number(mm ?? "1")).padStart(2, "0")}`;
}

function minutesFromFinanceLabel(label: string): number {
  const match = label.match(/(\d+)\s*min/);
  return match ? Number(match[1]) : 60;
}

export default function FinansePage() {
  const nowKey = useMemo(() => currentMonthKey(), []);
  const [selectedMonthKey, setSelectedMonthKey] = useState(nowKey);
  const [cennikOpen, setCennikOpen] = useState(false);

  const earliestDemoKey = useMemo(
    () =>
      DEMO_FINANCE_LINES.reduce(
        (min, line) => (monthKeyFromFinanceDate(line.date) < min ? monthKeyFromFinanceDate(line.date) : min),
        monthKeyFromFinanceDate(DEMO_FINANCE_LINES[0]!.date),
      ),
    [],
  );

  const monthOptions = useMemo(() => enumerateMonthsInclusive(earliestDemoKey, nowKey).slice().reverse(), [earliestDemoKey, nowKey]);
  const linesForMonth = useMemo(
    () => DEMO_FINANCE_LINES.filter((line) => monthKeyFromFinanceDate(line.date) === selectedMonthKey),
    [selectedMonthKey],
  );
  const total = useMemo(() => linesForMonth.reduce((sum, line) => sum + line.amountPln, 0), [linesForMonth]);
  const hoursMonth = useMemo(
    () => Math.round((linesForMonth.reduce((sum, line) => sum + minutesFromFinanceLabel(line.label), 0) / 60) * 10) / 10,
    [linesForMonth],
  );

  useEffect(() => {
    if (!cennikOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCennikOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cennikOpen]);

  const monthLabel = formatMonthLongPl(selectedMonthKey);
  const isCurrentMonth = selectedMonthKey === nowKey;

  return (
    <PageShell title="Finanse">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-muted max-w-xl text-sm font-medium">
          Podsumowanie wpływów z lekcji, liczby godzin i bazy uczniów. Wersja odzyskana z bardziej rozbudowanego panelu.
        </p>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
          <label className="grid w-full shrink-0 gap-1 sm:w-auto">
            <span className="text-depths/80 text-xs font-semibold">Stawki</span>
            <button
              type="button"
              onClick={() => setCennikOpen(true)}
              className="text-depths rounded-app border-2 border-panel-frame bg-luster px-3 py-2 text-sm font-medium transition-colors hover:bg-luster/90"
            >
              Cennik
            </button>
          </label>
          <label className="grid w-full shrink-0 gap-1 sm:w-auto sm:min-w-56">
            <span className="text-depths/80 text-xs font-semibold">Miesiąc</span>
            <select
              className="text-depths rounded-app border-2 border-panel-frame bg-luster px-3 py-2 text-sm font-medium"
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
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

      {cennikOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-[#000C4A]/50" aria-label="Zamknij cennik" onClick={() => setCennikOpen(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-app border border-panel-frame/70 bg-snow/95 p-6 shadow-lg sm:p-8">
            <button
              type="button"
              onClick={() => setCennikOpen(false)}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-xl font-light leading-none text-depths/60 transition-colors hover:bg-luster/80 hover:text-depths"
              aria-label="Zamknij cennik"
            >
              ×
            </button>
            <h2 className="pr-12 text-lg font-medium tracking-tight text-depths">Cennik</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Wszystkie kwoty dotyczą jednej godziny zajęć. W tabeli widać cenę zajęć i Twoją stawkę.
            </p>
            <table className="mt-6 w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-panel-frame/35 text-xs font-medium text-muted">
                  <th className="pb-3 pr-2">Zajęcia</th>
                  <th className="pb-3 px-2 text-right">Cena zajęć</th>
                  <th className="pb-3 pl-2 text-right">Twoja stawka</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_CENNIK.map((row, index) => (
                  <tr key={row.label} className={index > 0 ? "border-t border-panel-frame/35" : ""}>
                    <th className="py-3.5 pr-2 text-sm font-medium leading-snug text-depths">{row.label}</th>
                    <td className="px-2 py-3.5 text-right text-sm font-semibold tabular-nums text-depths">{row.forClientPln} zł / godz.</td>
                    <td className="pl-2 py-3.5 text-right text-sm font-semibold tabular-nums text-depths">{row.yourSharePln} zł / godz.</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-app bg-[#000C4A] p-4 text-luster">
          <p className="text-xs font-semibold uppercase tracking-wide text-luster/75">
            {isCurrentMonth ? "Ten miesiąc" : "Wybrany miesiąc"}
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums text-lime">{total.toLocaleString("pl-PL")} zł</p>
          <p className="mt-1 text-xs capitalize text-luster/65">{monthLabel}</p>
        </div>
        <div className="rounded-app border-2 border-panel-frame bg-jodhpur p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Godziny</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-depths">{hoursMonth}</p>
          <p className="mt-1 text-xs font-medium text-depths/70">zaliczone w miesiącu</p>
        </div>
        <div className="rounded-app border-2 border-panel-frame bg-snow p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Uczniowie</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-depths">{DEMO_STUDENTS.length}</p>
          <p className="mt-1 text-xs font-medium text-depths/70">aktywnych w bazie</p>
        </div>
      </div>

      <section className="rounded-app bg-luster/60 p-4">
        <h2 className="text-base font-semibold tracking-tight text-depths">Saldo za lekcje</h2>
        <p className="mt-1 text-xs font-medium capitalize text-muted">Wpływy · {monthLabel}</p>
        {linesForMonth.length === 0 ? (
          <p className="mt-6 text-sm font-medium text-muted">Brak wpływów w tym miesiącu.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {linesForMonth.map((line) => (
              <li
                key={line.id}
                className="flex flex-col gap-3 rounded-app bg-snow px-4 py-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-depths">{line.studentName}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {line.label} · {line.date}
                  </p>
                </div>
                <p className="shrink-0 self-start rounded-app bg-[#000C4A] px-3 py-2 text-base font-bold tabular-nums text-lime sm:self-center sm:text-right">
                  +{line.amountPln} zł
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
