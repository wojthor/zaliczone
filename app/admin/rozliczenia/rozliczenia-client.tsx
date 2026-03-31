"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DEMO_FINANCE_LINES } from "@/lib/demo-data";
import { ADMIN_TUTORS } from "@/lib/admin-demo";

type PaymentMethod = "Przelew" | "BLIK";

type PayRow = (typeof DEMO_FINANCE_LINES)[number] & {
  tutorName: string;
  subject: string;
  paymentMethod: PaymentMethod;
  paidAt?: string;
};

export function RozliczeniaClient() {
  const [rows, setRows] = useState<PayRow[]>(() =>
    DEMO_FINANCE_LINES.map((r, i) => ({
      ...r,
      tutorName: ADMIN_TUTORS[i % ADMIN_TUTORS.length]?.name ?? "Nieprzypisany",
      subject: normalizeSubject(extractSubject(r.label)),
      paymentMethod: i % 2 === 0 ? "Przelew" : "BLIK",
      paidAt: i >= 3 ? formatYmd(new Date()) : undefined,
    })),
  );
  const [query, setQuery] = useState("");
  const [counterDay, setCounterDay] = useState<"today" | "yesterday">("yesterday");
  const [movingId, setMovingId] = useState<string | null>(null);

  const queryNorm = query.trim().toLowerCase();
  const matchesQuery = (r: PayRow) =>
    [r.tutorName, r.subject, r.date, r.studentName, String(r.amountPln), r.paymentMethod, r.paidAt ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(queryNorm);

  const pending = useMemo(() => rows.filter((r) => !r.paidAt && matchesQuery(r)), [rows, queryNorm]);
  const paid = useMemo(() => rows.filter((r) => !!r.paidAt && matchesQuery(r)), [rows, queryNorm]);

  const dayKey = useMemo(() => getDayKey(counterDay), [counterDay]);
  const dayTotals = useMemo(() => {
    const allForDay = rows.filter((r) => dateLabelToKey(r.date) === dayKey);
    const paidForDay = allForDay.filter((r) => !!r.paidAt).length;
    return { paid: paidForDay, total: allForDay.length };
  }, [rows, dayKey]);
  const dayLabel = useMemo(() => dayKeyToLabel(dayKey), [dayKey]);
  const dayAllPaid = dayTotals.total > 0 && dayTotals.paid === dayTotals.total;

  const pendingByDay = useMemo(() => groupByDayDesc(pending), [pending]);
  const paidByDay = useMemo(() => groupByDayDesc(paid), [paid]);

  function markPaid(id: string) {
    if (movingId) return;
    setMovingId(id);
    window.setTimeout(() => {
      setRows((prev) => prev.map((x) => (x.id === id ? { ...x, paidAt: formatYmd(new Date()) } : x)));
      setMovingId(null);
    }, 520);
  }

  return (
    <div className="min-w-0 space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-depths text-lg font-semibold tracking-tight sm:text-xl">Rozliczenia</h1>
          <p className="text-muted mt-0.5 text-[0.7rem] leading-snug sm:text-xs">
            Zaliczone lekcje — Przelew / BLIK. Od lg: dwie kolumny obok siebie.
          </p>
        </div>
        <Link
          href="/admin/ksiegowosc"
          className="shrink-0 rounded-full bg-[#000C4A] px-2.5 py-1 text-center text-[0.65rem] font-bold text-lime transition-opacity hover:opacity-90 sm:px-3 sm:py-1.5 sm:text-xs"
        >
          Księgowość →
        </Link>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Szukaj…"
        className="w-full min-w-0 rounded-app border border-panel-frame/40 bg-white px-2.5 py-1.5 text-xs text-depths placeholder:text-muted sm:px-3 sm:py-2"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[0.7rem] sm:text-xs">
        <p className="font-semibold text-depths">
          Stan — {dayLabel}:{" "}
          <span className={dayAllPaid ? "text-green-700" : "text-orange-600"}>
            {dayTotals.paid}/{dayTotals.total}
          </span>
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setCounterDay("today")}
            className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold sm:px-2.5 sm:text-xs ${
              counterDay === "today" ? "bg-[#000C4A] text-lime" : "bg-jodhpur text-depths"
            }`}
          >
            Dzisiaj
          </button>
          <button
            type="button"
            onClick={() => setCounterDay("yesterday")}
            className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold sm:px-2.5 sm:text-xs ${
              counterDay === "yesterday" ? "bg-[#000C4A] text-lime" : "bg-jodhpur text-depths"
            }`}
          >
            Wczoraj
          </button>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start lg:gap-3">
        <PaymentsTable
          title="Oczekujące wpłaty"
          subtitle="Tylko zaliczone lekcje."
          empty="Brak oczekujących wpłat."
          groups={pendingByDay}
          variant="pending"
          movingId={movingId}
          onMarkPaid={markPaid}
        />
        <PaymentsTable
          title="Opłacone"
          subtitle="Data zapłaty z momentu oznaczenia w systemie."
          empty="Brak opłaconych pozycji."
          groups={paidByDay}
          variant="paid"
          movingId={null}
          onMarkPaid={() => {}}
        />
      </div>
    </div>
  );
}

function PaymentsTable({
  title,
  subtitle,
  empty,
  groups,
  variant,
  movingId,
  onMarkPaid,
}: {
  title: string;
  subtitle: string;
  empty: string;
  groups: [string, PayRow[]][];
  variant: "pending" | "paid";
  movingId: string | null;
  onMarkPaid: (id: string) => void;
}) {
  const th =
    "border-b border-panel-frame/40 bg-jodhpur/90 px-1 py-1 text-left text-[0.55rem] font-bold uppercase leading-tight text-depths sm:px-1.5 sm:py-1.5 sm:text-[0.6rem]";
  const td =
    "border-b border-panel-frame/15 px-1 py-1 align-top text-[0.62rem] leading-tight break-words sm:px-1.5 sm:py-1.5 sm:text-[0.7rem]";
  const row = "bg-snow even:bg-luster/40 hover:bg-luster/60";

  return (
    <div className="min-w-0">
      <h2 className="text-depths text-sm font-semibold">{title}</h2>
      <p className="text-muted mb-1 text-[0.65rem] leading-tight">{subtitle}</p>
      {groups.length === 0 ? (
        <p className="text-muted py-4 text-xs">{empty}</p>
      ) : (
        <div className="max-h-[min(20rem,42vh)] overflow-y-auto overflow-x-hidden rounded-lg border border-panel-frame/35 scrollbar-panel sm:max-h-[min(22rem,48vh)] sm:rounded-app">
          <table className="table-fixed w-full min-w-0 border-collapse">
            <thead className="sticky top-0 z-1 bg-jodhpur/95 shadow-[inset_0_-1px_0_0_rgb(136_154_204/0.35)]">
              <tr>
                <th scope="col" className={`${th} w-[10%]`}>
                  Data
                </th>
                <th scope="col" className={`${th} w-[16%]`}>
                  Korep.
                </th>
                <th scope="col" className={`${th} w-[16%]`}>
                  Przedm.
                </th>
                <th scope="col" className={`${th} w-[18%]`}>
                  Uczeń
                </th>
                <th scope="col" className={`${th} w-[11%] text-right`}>
                  Kwota
                </th>
                <th scope="col" className={`${th} w-[9%]`}>
                  Płatn.
                </th>
                {variant === "pending" ? (
                  <th scope="col" className={`${th} w-[20%] text-right`}>
                    Akcja
                  </th>
                ) : (
                  <th scope="col" className={`${th} w-[20%]`}>
                    Zapłata
                  </th>
                )}
              </tr>
            </thead>
            {groups.map(([dayLabelText, dayRows]) => (
              <tbody key={dayLabelText}>
                <tr>
                  <td
                    colSpan={7}
                    className="border-b border-panel-frame/25 bg-luster/80 px-1.5 py-1 text-[9px] font-bold uppercase tracking-wide text-muted"
                  >
                    {dayLabelText}
                  </td>
                </tr>
                {dayRows.map((r) => (
                  <tr key={r.id} className={`${row} ${movingId === r.id ? "hop-to-paid" : ""}`}>
                    <td className={`${td} tabular-nums`}>{r.date}</td>
                    <td className={td}>{r.tutorName}</td>
                    <td className={td}>{r.subject}</td>
                    <td className={`${td} font-medium`}>{r.studentName}</td>
                    <td className={`${td} text-right tabular-nums font-bold ${variant === "paid" ? "text-green-700" : "text-aster"}`}>
                      {r.amountPln} zł
                    </td>
                    <td className={td}>{r.paymentMethod}</td>
                    {variant === "pending" ? (
                      <td className={`${td} text-right`}>
                        <button
                          type="button"
                          title="Oznacz jako opłacone"
                          onClick={() => onMarkPaid(r.id)}
                          disabled={movingId !== null}
                          className="w-full max-w-full rounded-md bg-[#000C4A] px-0.5 py-1 text-center text-[0.55rem] font-bold leading-[1.15] text-lime sm:px-1 sm:text-[0.6rem] disabled:opacity-60"
                        >
                          Opłać
                        </button>
                      </td>
                    ) : (
                      <td className={`${td} tabular-nums`}>{r.paidAt}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </div>
  );
}

function groupByDayDesc(rows: PayRow[]): [string, PayRow[]][] {
  const map = new Map<string, PayRow[]>();
  for (const r of rows) {
    const k = dateLabelToKey(r.date);
    const list = map.get(k) ?? [];
    list.push(r);
    map.set(k, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([k, list]) => [dayKeyToLabel(k), list] as [string, PayRow[]]);
}

function normalizeSubject(s: string): string {
  const t = s.trim();
  const lower = t.toLowerCase();
  if (lower.includes("polski")) {
    if (lower.includes("j.") || lower.startsWith("j")) return "Język polski";
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function extractSubject(label: string): string {
  return label.split("·")[0]?.trim().replace("J. ", "") ?? "Lekcja";
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getDayKey(day: "today" | "yesterday"): string {
  const now = new Date();
  if (day === "yesterday") now.setDate(now.getDate() - 1);
  return formatYmd(now);
}

function dateLabelToKey(dateLabel: string): string {
  const [d, m] = dateLabel.split(".").map(Number);
  const y = new Date().getFullYear();
  return formatYmd(new Date(y, (m ?? 1) - 1, d ?? 1));
}

function dayKeyToLabel(dayKey: string): string {
  const [y, mo, da] = dayKey.split("-").map(Number);
  const date = new Date(y ?? 0, (mo ?? 1) - 1, da ?? 1);
  return new Intl.DateTimeFormat("pl-PL", { weekday: "short", day: "numeric", month: "long", year: "numeric" }).format(date);
}
