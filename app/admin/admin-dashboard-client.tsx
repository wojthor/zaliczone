"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FinanceTile } from "@/components/admin/finance-tile";

type ExpiringContract = {
  id: string;
  name: string;
  daysLeft: number;
};

type MonthDeadline = {
  id: string;
  label: string;
  dateIso: string;
  daysLeft: number;
  href: string;
};

function formatPln(n: number): string {
  return `${n.toLocaleString("pl-PL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} zł`;
}

function daysLeftLabel(days: number): string {
  if (days > 1) return `za ${days} dni`;
  if (days === 1) return "jutro";
  if (days === 0) return "dziś";
  if (days === -1) return "wczoraj";
  return `${Math.abs(days)} dni po terminie`;
}

const WEEKDAY_LABELS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const DEADLINES_DONE_KEY = "zaliczone-admin-deadlines-done";
const DEADLINES_STATUS_KEY = "zaliczone-admin-deadlines-status";

const MONTHLY_CYCLE: Array<{ id: string; day: number; label: string; href: string }> = [
  { id: "ewidencja-mail", day: 1, label: "Mail o ewidencjach", href: "/admin/wyplaty" },
  { id: "ewidencja-deadline", day: 3, label: "Ewidencje podpisane (do)", href: "/admin/wyplaty" },
  { id: "rachunek-send", day: 3, label: "Wysyłka rachunków do podpisania", href: "/admin/wyplaty" },
  { id: "rachunek-deadline", day: 5, label: "Rachunki podpisane (do)", href: "/admin/wyplaty" },
  { id: "verification", day: 6, label: "Weryfikacja z systemem", href: "/admin/rozliczenia" },
  { id: "payout", day: 10, label: "Wypłaty + odznaczenie", href: "/admin/wyplaty" },
  { id: "month-close", day: 15, label: "Zamknięcie miesiąca + koszty", href: "/admin/ksiegowosc" },
  { id: "finance-review", day: 16, label: "Weryfikacja finansów (limity)", href: "/admin/ksiegowosc" },
  { id: "taxes", day: 20, label: "Podatki / zaliczka PIT (JDG)", href: "/admin/ksiegowosc" },
];

function toIsoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function deadlineDoneKey(d: Pick<MonthDeadline, "dateIso" | "id">): string {
  return `${d.dateIso}:${d.id}`;
}

function readDeadlinesDone(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const statusRaw = localStorage.getItem(DEADLINES_STATUS_KEY);
    if (statusRaw) {
      const statuses = JSON.parse(statusRaw) as Record<string, string>;
      const done: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(statuses)) {
        if (v === "done") done[k] = true;
      }
      return done;
    }
    const raw = localStorage.getItem(DEADLINES_DONE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function persistDeadlineDone(doneMap: Record<string, boolean>) {
  try {
    localStorage.setItem(DEADLINES_DONE_KEY, JSON.stringify(doneMap));
    let statuses: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(DEADLINES_STATUS_KEY);
      if (raw) statuses = JSON.parse(raw) as Record<string, string>;
    } catch {
      /* ignore */
    }
    for (const [k, v] of Object.entries(doneMap)) {
      if (v) statuses[k] = "done";
      else if (statuses[k] === "done") statuses[k] = "todo";
    }
    localStorage.setItem(DEADLINES_STATUS_KEY, JSON.stringify(statuses));
  } catch {
    /* ignore */
  }
}

function daysUntilFromIso(iso: string, today = new Date()): number {
  const target = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

function buildMonthCycleDeadlines(year: number, monthIndex0: number, today = new Date()): MonthDeadline[] {
  const monthLabel = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(
    new Date(year, monthIndex0, 15),
  );
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  return MONTHLY_CYCLE.filter((item) => item.day <= daysInMonth).map((item) => {
    const dateIso = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(item.day).padStart(2, "0")}`;
    return {
      id: item.id,
      label: `${item.label} · ${monthLabel}`,
      dateIso,
      daysLeft: daysUntilFromIso(dateIso, today),
      href: item.href,
    };
  });
}

/** Bieżący + następny miesiąc — żeby „kolejne terminy” nie znikały pod koniec miesiąca. */
function buildHomeDeadlines(): MonthDeadline[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const next = new Date(y, m + 1, 1);
  const map = new Map<string, MonthDeadline>();
  for (const d of buildMonthCycleDeadlines(y, m, now)) map.set(`${d.dateIso}:${d.id}`, d);
  for (const d of buildMonthCycleDeadlines(next.getFullYear(), next.getMonth(), now)) {
    map.set(`${d.dateIso}:${d.id}`, d);
  }
  return [...map.values()].sort((a, b) => a.dateIso.localeCompare(b.dateIso));
}

/** Uproszczony kalendarz — tylko bieżący miesiąc, bez listy i nawigacji. */
function CurrentMonthCalendar({ monthLabel }: { monthLabel: string }) {
  const todayIso = toIsoLocal(new Date());
  const year = Number(todayIso.slice(0, 4));
  const month = Number(todayIso.slice(5, 7)) - 1;
  const [selectedIso, setSelectedIso] = useState<string | null>(todayIso);
  const [done, setDone] = useState<Record<string, boolean>>(() => readDeadlinesDone());
  const deadlines = useMemo(() => buildHomeDeadlines(), []);

  function isDone(d: MonthDeadline): boolean {
    return Boolean(done[deadlineDoneKey(d)]);
  }

  function toggleDone(d: MonthDeadline) {
    const key = deadlineDoneKey(d);
    setDone((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      persistDeadlineDone(next);
      return next;
    });
  }

  const byDate = useMemo(() => {
    const map = new Map<string, MonthDeadline[]>();
    for (const d of deadlines) {
      // Na siatce kalendarza tylko bieżący miesiąc
      if (Number(d.dateIso.slice(0, 4)) !== year || Number(d.dateIso.slice(5, 7)) - 1 !== month) continue;
      const list = map.get(d.dateIso) ?? [];
      list.push(d);
      map.set(d.dateIso, list);
    }
    return map;
  }, [deadlines, year, month]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: Array<{ day: number | null; iso: string | null }> = [];
    for (let i = 0; i < startOffset; i++) result.push({ day: null, iso: null });
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      result.push({ day, iso });
    }
    while (result.length % 7 !== 0) result.push({ day: null, iso: null });
    return result;
  }, [year, month]);

  const selectedItems = selectedIso ? (byDate.get(selectedIso) ?? []) : [];

  const previousItems = useMemo(() => {
    if (!selectedIso) return [];
    const past = deadlines
      .filter((d) => d.dateIso < selectedIso)
      .sort((a, b) => b.dateIso.localeCompare(a.dateIso) || b.id.localeCompare(a.id));
    return past.slice(0, 1);
  }, [deadlines, selectedIso]);

  const followingItems = useMemo(() => {
    if (!selectedIso) return [];
    return deadlines
      .filter((d) => d.dateIso > selectedIso)
      .sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.id.localeCompare(b.id));
  }, [deadlines, selectedIso]);

  const selectedLabel = selectedIso
    ? new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long" }).format(
        new Date(`${selectedIso}T12:00:00`),
      )
    : null;

  function renderDeadlineRow(d: MonthDeadline, tone: "past" | "focus" | "future") {
    const checked = isDone(d);
    const urgent = !checked && d.daysLeft <= 5;
    const isPast = tone === "past";
    const isFocus = tone === "focus";

    const cardClass = checked
      ? isPast
        ? "border-depths/15 bg-depths/5 opacity-55"
        : "border-depths/25 bg-depths/10"
      : isPast
        ? "border-panel-frame/15 bg-luster/20 opacity-50"
        : urgent
          ? isFocus
            ? "border-steel/50 bg-steel/15 ring-1 ring-steel/20"
            : "border-steel/35 bg-steel/10"
          : isFocus
            ? "border-depths/25 bg-depths/5 ring-1 ring-depths/10"
            : "border-panel-frame/25 bg-luster/30";

    return (
      <li key={`${d.dateIso}:${d.id}:${tone}`} className={`rounded-app border px-3 py-2 ${cardClass}`}>
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggleDone(d)}
            className="mt-0.5 size-4 shrink-0 accent-depths"
          />
          <span className="min-w-0 flex-1">
            {tone !== "focus" ? (
              <span className="dash-sans text-muted mb-0.5 block text-[10px] font-semibold capitalize">
                {new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long" }).format(
                  new Date(`${d.dateIso}T12:00:00`),
                )}
              </span>
            ) : null}
            <span
              className={`dash-sans block text-xs font-semibold ${
                checked
                  ? "text-depths line-through"
                  : isPast
                    ? "text-muted"
                    : urgent
                      ? "text-steel"
                      : "text-depths"
              }`}
            >
              {d.label}
            </span>
            <span className="mt-1 flex items-center justify-between gap-2">
              <span
                className={`dash-mono text-[11px] font-bold ${
                  checked ? "text-depths" : isPast ? "text-muted" : urgent ? "text-steel" : "text-muted"
                }`}
              >
                {checked ? "✓ zrobione" : daysLeftLabel(d.daysLeft)}
              </span>
              <Link
                href={d.href}
                className={`dash-sans text-[11px] font-bold hover:underline ${
                  isPast ? "text-muted" : "text-depths"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                Otwórz →
              </Link>
            </span>
          </span>
        </label>
      </li>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <article className="rounded-app border border-panel-frame/35 bg-snow p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="dash-sans text-depths text-sm font-bold capitalize">{monthLabel}</p>
          <Link
            href="/admin/kalendarz"
            className="dash-sans text-[11px] font-bold text-depths hover:underline"
          >
            Pełny kalendarz →
          </Link>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAY_LABELS.map((w) => (
            <span key={w} className="dash-sans text-muted py-1 text-[10px] font-bold uppercase">
              {w}
            </span>
          ))}
          {cells.map((cell, i) => {
            if (!cell.day || !cell.iso) {
              return <span key={`e-${i}`} className="aspect-square" />;
            }
            const dayItems = byDate.get(cell.iso) ?? [];
            const marked = dayItems.length > 0;
            const openItems = dayItems.filter((d) => !isDone(d));
            const allDone = marked && openItems.length === 0;
            const hasUrgent = openItems.some((d) => d.daysLeft <= 5);
            const isToday = cell.iso === todayIso;
            const isSelected = cell.iso === selectedIso;
            const dayTone = allDone
              ? "bg-depths/15 text-depths hover:bg-depths/25"
              : hasUrgent
                ? "bg-steel/25 text-steel hover:bg-steel/40"
                : marked
                  ? "bg-lime/35 text-depths hover:bg-lime/50"
                  : "text-depths hover:bg-luster/70";
            const dotTone = allDone
              ? "bg-depths"
              : hasUrgent
                ? "bg-steel"
                : "bg-lime";
            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => setSelectedIso(cell.iso)}
                className={`dash-mono relative flex aspect-square items-center justify-center rounded-full text-xs font-bold transition ${
                  isSelected ? "bg-depths text-snow" : isToday ? "bg-lime text-depths" : dayTone
                }`}
              >
                {cell.day}
                {marked && !isSelected ? (
                  <span className={`absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full ${dotTone}`} />
                ) : null}
              </button>
            );
          })}
        </div>
      </article>

      <article className="rounded-app border border-panel-frame/35 bg-snow p-4">
        <p className="dash-sans text-muted text-[10px] font-semibold uppercase tracking-wide">
          Terminy · odhacz zrobione
        </p>

        <div className="mt-3 max-h-[28rem] space-y-3 overflow-y-auto overscroll-contain pr-1 scrollbar-panel sm:max-h-[32rem]">
          {previousItems.length > 0 ? (
            <div>
              <p className="dash-sans text-muted/70 mb-1.5 text-[9px] font-semibold uppercase tracking-wide">
                Poprzedni
              </p>
              <ul className="space-y-1.5">{previousItems.map((d) => renderDeadlineRow(d, "past"))}</ul>
            </div>
          ) : null}

          <div className="rounded-app bg-depths/5 px-3 py-3">
            <p className="dash-sans text-depths text-center text-sm font-bold capitalize">{selectedLabel}</p>
            {selectedItems.length === 0 ? (
              <p className="dash-sans text-muted mt-2 text-center text-xs">Brak terminów w tym dniu.</p>
            ) : (
              <ul className="mt-2.5 space-y-2">{selectedItems.map((d) => renderDeadlineRow(d, "focus"))}</ul>
            )}
          </div>

          <div>
            <p className="dash-sans text-muted mb-1.5 text-[9px] font-semibold uppercase tracking-wide">
              Kolejne terminy
            </p>
            {followingItems.length === 0 ? (
              <p className="dash-sans text-muted text-xs">Brak kolejnych terminów.</p>
            ) : (
              <ul className="space-y-1.5">{followingItems.map((d) => renderDeadlineRow(d, "future"))}</ul>
            )}
          </div>
        </div>

        <Link
          href="/admin/kalendarz"
          className="dash-sans mt-4 inline-block text-[11px] font-bold text-depths hover:underline"
        >
          Pełny kalendarz i checklisty →
        </Link>
      </article>
    </div>
  );
}

function LessonsDonut({
  pending,
  verified,
  unpaid,
}: {
  pending: number;
  verified: number;
  unpaid: number;
}) {
  const total = pending + verified + unpaid;
  const pendingDeg = total > 0 ? (pending / total) * 360 : 0;
  const verifiedDeg = total > 0 ? (verified / total) * 360 : 0;
  const pendingLight = "#D5ED21";
  const verifiedLight = "#000C4A";
  const unpaidLight = "#AAAAAA";
  const background =
    total > 0
      ? `conic-gradient(${pendingLight} 0deg ${pendingDeg}deg, ${verifiedLight} ${pendingDeg}deg ${pendingDeg + verifiedDeg}deg, ${unpaidLight} ${pendingDeg + verifiedDeg}deg 360deg)`
      : "var(--color-luster)";

  return (
    <div className="flex h-full items-center gap-6">
      <div className="relative size-28 shrink-0 rounded-full sm:size-32" style={{ background }}>
        <div className="absolute inset-[10px] flex items-center justify-center rounded-full bg-snow">
          <span className="dash-mono text-depths text-2xl font-bold tabular-nums sm:text-3xl">{total}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2.5">
        <li className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: pendingLight }} />
          <span className="dash-sans flex-1 text-xs font-semibold sm:text-sm" style={{ color: "#000C4A" }}>
            Do zatwierdzenia
          </span>
          <span className="dash-mono text-sm font-bold tabular-nums" style={{ color: "#000C4A" }}>
            {pending}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: verifiedLight }} />
          <span className="dash-sans flex-1 text-xs font-semibold sm:text-sm" style={{ color: "#000C4A" }}>
            Zatwierdzone
          </span>
          <span className="dash-mono text-sm font-bold tabular-nums" style={{ color: "#000C4A" }}>
            {verified}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: unpaidLight }} />
          <span className="dash-sans flex-1 text-xs font-semibold sm:text-sm" style={{ color: "#AAAAAA" }}>
            Nieopłacone
          </span>
          <span className="dash-mono text-sm font-bold tabular-nums" style={{ color: "#AAAAAA" }}>
            {unpaid}
          </span>
        </li>
      </ul>
    </div>
  );
}

function RevenueSplitDonut({
  costs,
  margin,
  unpaid,
}: {
  costs: number;
  margin: number;
  unpaid: number;
}) {
  const total = costs + margin + unpaid;
  const costsDeg = total > 0 ? (Math.max(costs, 0) / total) * 360 : 0;
  const marginDeg = total > 0 ? (Math.max(margin, 0) / total) * 360 : 0;
  const costsColor = "#D5ED21";
  const marginColor = "#000C4A";
  const unpaidColor = "#AAAAAA";
  const background =
    total > 0
      ? `conic-gradient(${costsColor} 0deg ${costsDeg}deg, ${marginColor} ${costsDeg}deg ${costsDeg + marginDeg}deg, ${unpaidColor} ${costsDeg + marginDeg}deg 360deg)`
      : "var(--color-luster)";
  const marginPct = total > 0 ? Math.round((margin / total) * 100) : 0;

  return (
    <div className="flex h-full items-center gap-3">
      <div className="relative size-14 shrink-0 rounded-full" style={{ background }}>
        <div className="absolute inset-[5px] flex flex-col items-center justify-center rounded-full bg-snow">
          <span className="dash-mono text-depths text-xs font-bold tabular-nums">{marginPct}%</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1">
        <li className="flex items-center gap-1.5">
          <span className="size-1.5 shrink-0 rounded-full" style={{ background: costsColor }} />
          <span className="dash-sans flex-1 truncate text-[10px] font-semibold" style={{ color: "#000C4A" }}>
            Koszty
          </span>
          <span className="dash-mono text-[10px] font-bold tabular-nums" style={{ color: "#000C4A" }}>
            {formatPln(costs)}
          </span>
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-1.5 shrink-0 rounded-full" style={{ background: marginColor }} />
          <span className="dash-sans flex-1 truncate text-[10px] font-semibold" style={{ color: "#000C4A" }}>
            Marża
          </span>
          <span className="dash-mono text-[10px] font-bold tabular-nums" style={{ color: "#000C4A" }}>
            {formatPln(margin)}
          </span>
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-1.5 shrink-0 rounded-full" style={{ background: unpaidColor }} />
          <span className="dash-sans flex-1 truncate text-[10px] font-semibold" style={{ color: "#AAAAAA" }}>
            Nieopł.
          </span>
          <span className="dash-mono text-[10px] font-bold tabular-nums" style={{ color: "#AAAAAA" }}>
            {formatPln(unpaid)}
          </span>
        </li>
      </ul>
    </div>
  );
}

export function AdminDashboardClient({
  todayLabel,
  monthLabel,
  verifiedMonthSumPln,
  payoutCostPln,
  totalCostPln,
  agencyProfitPln,
  unpaidMonthSumPln,
  tutorCount,
  studentCount,
  pendingMonthCount,
  verifiedMonthCount,
  unpaidMonthCount,
  expiringContracts,
}: {
  todayLabel: string;
  monthLabel: string;
  verifiedMonthSumPln: number;
  payoutCostPln: number;
  totalCostPln: number;
  agencyProfitPln: number;
  unpaidMonthSumPln: number;
  tutorCount: number;
  studentCount: number;
  pendingMonthCount: number;
  verifiedMonthCount: number;
  unpaidMonthCount: number;
  expiringContracts: ExpiringContract[];
}) {
  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="dash-sans text-depths text-2xl font-bold tracking-tight sm:text-3xl">Główna</h1>
          <p className="dash-sans text-muted mt-1 text-sm capitalize">{todayLabel}</p>
        </div>
        <div className="dash-sans rounded-full border border-panel-frame/40 bg-snow px-3.5 py-1.5 text-xs font-semibold text-muted">
          Miesiąc <span className="text-depths ml-1 font-bold capitalize">{monthLabel}</span>
        </div>
      </header>

      <section>
        <h2 className="dash-sans text-muted mb-3 text-xs font-semibold uppercase tracking-wide">Finanse miesiąca</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <FinanceTile label="Przychód" tone="navy">
            {formatPln(verifiedMonthSumPln)}
          </FinanceTile>
          <FinanceTile label="Koszty · wypłaty / wszystkie" tone="orange">
            {formatPln(payoutCostPln)}
            <span className="opacity-40"> / </span>
            {formatPln(totalCostPln)}
          </FinanceTile>
          <FinanceTile label="Marża agencji" tone="green">
            {formatPln(agencyProfitPln)}
          </FinanceTile>
          <FinanceTile label="Nieopłacone" tone="red">
            −{formatPln(unpaidMonthSumPln)}
          </FinanceTile>
          <article className="rounded-3xl border border-panel-frame/35 bg-snow p-4 sm:p-5">
            <p className="dash-sans text-muted text-[10px] font-bold uppercase tracking-[0.16em]">Podział</p>
            <div className="mt-2.5">
              <RevenueSplitDonut
                costs={totalCostPln}
                margin={agencyProfitPln}
                unpaid={unpaidMonthSumPln}
              />
            </div>
          </article>
        </div>
      </section>

      <section>
        <h2 className="dash-sans text-muted mb-3 text-xs font-semibold uppercase tracking-wide">Zespół i lekcje</h2>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="flex flex-col gap-3">
            <article className="rounded-app border border-panel-frame/35 bg-snow p-4">
              <p className="dash-sans text-muted text-[10px] font-semibold uppercase tracking-wide">Nauczyciele</p>
              <p className="dash-mono text-depths mt-1 text-2xl font-bold tabular-nums">{tutorCount}</p>
            </article>

            <article className="rounded-app border border-panel-frame/35 bg-snow p-4">
              <p className="dash-sans text-muted text-[10px] font-semibold uppercase tracking-wide">Uczniowie</p>
              <p className="dash-mono text-depths mt-1 text-2xl font-bold tabular-nums">{studentCount}</p>
            </article>
          </div>

          <article className="rounded-app border border-panel-frame/35 bg-snow p-4 lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:border-r sm:border-panel-frame/25 sm:pr-4">
                <p className="dash-sans text-muted text-[10px] font-semibold uppercase tracking-wide">
                  Umowy - 30 dni
                </p>
                <ul className="mt-2.5 max-h-40 space-y-1.5 overflow-y-auto pr-1 scrollbar-panel">
                  {expiringContracts.length === 0 ? (
                    <li className="dash-sans text-muted text-xs">Brak umów kończących się wkrótce.</li>
                  ) : (
                    expiringContracts.map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-2">
                        <Link
                          href={`/admin/nauczyciele/${t.id}`}
                          className="dash-sans text-depths min-w-0 truncate text-xs font-semibold hover:underline"
                        >
                          {t.name}
                        </Link>
                        <span
                          className={`dash-mono shrink-0 text-[11px] font-bold tabular-nums ${
                            t.daysLeft <= 7 ? "text-claret" : "text-toffee"
                          }`}
                        >
                          {daysLeftLabel(t.daysLeft)}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div>
                <p className="dash-sans text-muted text-[10px] font-semibold uppercase tracking-wide">
                  Lekcje - {monthLabel}
                </p>
                <div className="mt-2.5 flex items-center">
                  <LessonsDonut
                    pending={pendingMonthCount}
                    verified={verifiedMonthCount}
                    unpaid={unpaidMonthCount}
                  />
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section>
        <h2 className="dash-sans text-muted mb-3 text-xs font-semibold uppercase tracking-wide">
          Kalendarz · {monthLabel}
        </h2>
        <CurrentMonthCalendar monthLabel={monthLabel} />
      </section>
    </div>
  );
}
