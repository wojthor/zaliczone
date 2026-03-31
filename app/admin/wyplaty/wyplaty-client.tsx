"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DEMO_FINANCE_LINES, type DemoFinanceLine } from "@/lib/demo-data";
import { ADMIN_TUTORS, type AdminTutor } from "@/lib/admin-demo";

/** Udział w kwocie wpłaty od klienta przypisywany nauczycielowi (demo). Reszta = zysk agencji. */
const TUTOR_SHARE_OF_CLIENT_PAYMENT = 0.7;
const AGENCY_SHARE_OF_CLIENT_PAYMENT = 1 - TUTOR_SHARE_OF_CLIENT_PAYMENT;

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

function getLineIndexInDemo(line: DemoFinanceLine): number {
  return DEMO_FINANCE_LINES.findIndex((l) => l.id === line.id);
}

function tutorForLine(line: DemoFinanceLine): AdminTutor {
  const idx = Math.max(0, getLineIndexInDemo(line));
  return ADMIN_TUTORS[idx % ADMIN_TUTORS.length]!;
}

type TutorRollup = {
  tutorId: string;
  tutorName: string;
  lessonCount: number;
  clientTotalPln: number;
  tutorPayoutPln: number;
};

function buildRollups(lines: DemoFinanceLine[]): TutorRollup[] {
  const map = new Map<string, TutorRollup>();
  for (const line of lines) {
    const t = tutorForLine(line);
    const prev = map.get(t.id) ?? {
      tutorId: t.id,
      tutorName: t.name,
      lessonCount: 0,
      clientTotalPln: 0,
      tutorPayoutPln: 0,
    };
    prev.lessonCount += 1;
    prev.clientTotalPln += line.amountPln;
    prev.tutorPayoutPln += Math.round(line.amountPln * TUTOR_SHARE_OF_CLIENT_PAYMENT * 100) / 100;
    map.set(t.id, prev);
  }
  return [...map.values()].sort((a, b) => a.tutorName.localeCompare(b.tutorName, "pl"));
}

function formatMoney(pln: number): string {
  return `${pln.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} zł`;
}

export function WyplatyClient() {
  const nowKey = useMemo(() => currentMonthKey(), []);
  const monthOptions = useMemo(() => {
    const keys = [...new Set(DEMO_FINANCE_LINES.map((l) => monthKeyFromLessonDateDdMm(l.date)))];
    keys.sort();
    if (!keys.includes(nowKey)) keys.push(nowKey);
    return keys.slice().reverse();
  }, [nowKey]);

  const [selectedMonthKey, setSelectedMonthKey] = useState(nowKey);
  const [payoutDatesByTutor, setPayoutDatesByTutor] = useState<Record<string, string>>({});

  const linesForMonth = useMemo(
    () => DEMO_FINANCE_LINES.filter((l) => monthKeyFromLessonDateDdMm(l.date) === selectedMonthKey),
    [selectedMonthKey],
  );

  const { rollups, totals } = useMemo(() => {
    const przychod = linesForMonth.reduce((s, l) => s + l.amountPln, 0);
    const r = buildRollups(linesForMonth);
    const koszty = Math.round(r.reduce((acc, x) => acc + x.tutorPayoutPln, 0) * 100) / 100;
    const zysk = Math.round((przychod - koszty) * 100) / 100;
    return { rollups: r, totals: { przychod, koszty, zysk } };
  }, [linesForMonth]);

  const monthLabel = formatMonthLongPl(selectedMonthKey);

  const markPaid = (tutorId: string) => {
    const d = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(new Date());
    setPayoutDatesByTutor((prev) => ({ ...prev, [tutorId]: d }));
  };

  const th =
    "sticky top-0 z-[1] border-b border-panel-frame/40 bg-jodhpur/95 px-2 py-2 text-left text-[0.65rem] font-bold uppercase leading-tight text-depths shadow-[inset_0_-1px_0_0_rgb(136_154_204/0.35)] sm:px-2.5 sm:py-2 sm:text-[0.7rem]";
  const td =
    "border-b border-panel-frame/15 px-2 py-2 align-middle text-[0.8rem] sm:px-2.5 sm:py-2.5 sm:text-sm";

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-depths text-xl font-semibold tracking-tight sm:text-2xl">Wypłaty i Bilans</h1>
          <p className="text-muted mt-1 max-w-2xl text-xs leading-relaxed sm:text-sm">
            Podsumowanie wpłat od klientów vs wypłat dla nauczycieli w wybranym miesiącu. W demo przyjęto podział:{" "}
            <strong className="font-semibold text-depths/85">{Math.round(TUTOR_SHARE_OF_CLIENT_PAYMENT * 100)}%</strong> dla zespołu,{" "}
            <strong className="font-semibold text-depths/85">{Math.round(AGENCY_SHARE_OF_CLIENT_PAYMENT * 100)}%</strong> zysk agencji od
            każdej opłaconej lekcji.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1">
            <span className="text-depths/80 text-[0.65rem] font-semibold sm:text-xs">Miesiąc</span>
            <select
              className="text-depths rounded-app border-2 border-panel-frame bg-luster px-3 py-2 text-sm font-medium"
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              aria-label="Wybierz miesiąc"
            >
              {monthOptions.map((key) => (
                <option key={key} value={key}>
                  {formatMonthLongPl(key)}
                </option>
              ))}
            </select>
          </label>
          <Link
            href="/admin/rozliczenia"
            className="rounded-full border border-panel-frame/50 bg-snow px-3 py-2 text-xs font-bold text-depths"
          >
            Rozliczenia
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-app border-2 border-panel-frame bg-snow p-4 shadow-sm">
          <p className="text-muted text-[0.65rem] font-semibold uppercase tracking-wide">Przychód</p>
          <p className="text-depths mt-1 text-2xl font-black tabular-nums sm:text-[1.75rem]">{formatMoney(totals.przychod)}</p>
          <p className="text-depths/70 mt-2 text-xs font-medium leading-snug">Wpłaty od klientów (suma kwot lekcji w miesiącu).</p>
        </article>
        <article className="rounded-app border-2 border-panel-frame bg-snow p-4 shadow-sm">
          <p className="text-muted text-[0.65rem] font-semibold uppercase tracking-wide">Koszty</p>
          <p className="text-depths mt-1 text-2xl font-black tabular-nums sm:text-[1.75rem]">{formatMoney(totals.koszty)}</p>
          <p className="text-depths/70 mt-2 text-xs font-medium leading-snug">Wypłaty dla zespołu ({Math.round(TUTOR_SHARE_OF_CLIENT_PAYMENT * 100)}% przychodu).</p>
        </article>
        <article className="rounded-app border-2 border-green-700/35 bg-green-700/[0.07] p-4 shadow-sm ring-1 ring-green-700/20">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-green-900">Twój zysk netto</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-green-800 sm:text-[1.75rem]">{formatMoney(totals.zysk)}</p>
          <p className="mt-2 text-xs font-medium leading-snug text-green-900/85">
            Przychód − koszty (= {Math.round(AGENCY_SHARE_OF_CLIENT_PAYMENT * 100)}% przychodu w tym modelu).
          </p>
        </article>
      </section>

      <section className="rounded-app border border-panel-frame/35 bg-snow p-3 sm:p-4">
        <h2 className="text-depths text-base font-semibold tracking-tight">Lista do wypłaty</h2>
        <p className="text-muted mt-1 text-xs capitalize">{monthLabel} — nauczyciele z co najmniej jedną lekcją w danych demo.</p>

        {rollups.length === 0 ? (
          <p className="text-muted mt-6 py-6 text-center text-sm font-medium">Brak lekcji w tym miesiącu (demo).</p>
        ) : (
          <div className="mt-4 max-h-[min(28rem,55vh)] overflow-auto rounded-app border border-panel-frame/25 scrollbar-panel">
            <table className="table-fixed min-w-[36rem] w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={`${th} w-[28%]`}>
                    Nauczyciel
                  </th>
                  <th scope="col" className={`${th} w-[16%]`}>
                    Lekcje
                  </th>
                  <th scope="col" className={`${th} w-[22%]`}>
                    Do wypłaty
                  </th>
                  <th scope="col" className={`${th} w-[34%]`}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {rollups.map((row, i) => {
                  const paidLabel = payoutDatesByTutor[row.tutorId];
                  return (
                    <tr key={row.tutorId} className={`${i % 2 === 1 ? "bg-luster/35" : "bg-snow"} hover:bg-luster/50`}>
                      <td className={`${td} font-semibold text-depths`}>{row.tutorName}</td>
                      <td className={`${td} tabular-nums font-bold text-depths`}>{row.lessonCount}</td>
                      <td className={`${td} font-bold tabular-nums text-depths`}>{formatMoney(row.tutorPayoutPln)}</td>
                      <td className={td}>
                        {paidLabel ? (
                          <span className="inline-flex items-center rounded-full bg-green-700/15 px-2.5 py-1 text-[0.7rem] font-bold text-green-800">
                            Wypłacono {paidLabel}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => markPaid(row.tutorId)}
                            className="rounded-full bg-[#000C4A] px-3 py-1.5 text-[0.7rem] font-bold text-lime transition-opacity hover:opacity-90"
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
    </div>
  );
}
