"use client";

import Link from "next/link";
import { useState } from "react";
import { LedgerBand, LedgerStat } from "@/components/admin/ledger-stat";

type ChecklistItem = { id: string; label: string };

const NEW_EMPLOYEE_ITEMS: ChecklistItem[] = [
  { id: "ne-1", label: "Załóż konto w systemie" },
  { id: "ne-2", label: "Pobierz dane do umowy zlecenie" },
  { id: "ne-3", label: "Zgłoś studenta do ZUS (ZZA) w ciągu 7 dni" },
  { id: "ne-4", label: "Podpisz oświadczenie o statusie studenta < 26 lat" },
];

const PAYOUT_ITEMS: ChecklistItem[] = [
  { id: "po-1", label: "Wyślij prośbę o ewidencję (przycisk na Wypłatach)" },
  { id: "po-2", label: "Odbierz podpisany skan PDF od tutora" },
  { id: "po-3", label: "Wykonaj przelew wychodzący w banku" },
  { id: "po-4", label: "Odznacz jako „WYPŁACONE” w systemie" },
];

type DeadlineItem = {
  id: string;
  label: string;
  dateLabel: string;
  daysLeft: number;
  href: string;
};

function readChecklistState(storageKey: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function usePersistedChecklist(storageKey: string, items: ChecklistItem[]) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => readChecklistState(storageKey));

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const doneCount = items.filter((item) => checked[item.id]).length;
  const progress = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  return { checked, toggle, doneCount, progress };
}

function ChecklistCard({
  title,
  subtitle,
  items,
  storageKey,
  accent,
}: {
  title: string;
  subtitle: string;
  items: ChecklistItem[];
  storageKey: string;
  accent: "lime" | "butter";
}) {
  const { checked, toggle, doneCount, progress } = usePersistedChecklist(storageKey, items);
  const bar = accent === "lime" ? "bg-lime" : "bg-butter";

  return (
    <article className="rounded-app border border-panel-frame/35 bg-snow p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="dash-sans text-depths text-base font-bold tracking-tight">{title}</h3>
          <p className="dash-sans text-muted mt-1 text-xs leading-relaxed">{subtitle}</p>
        </div>
        <span className="dash-mono text-muted shrink-0 rounded-full bg-luster px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
          {doneCount}/{items.length}
        </span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-luster">
        <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${progress}%` }} />
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const isDone = Boolean(checked[item.id]);
          return (
            <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-app border border-transparent px-2 py-2 transition hover:border-panel-frame/30 hover:bg-luster/50">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggle(item.id)}
                  className="mt-0.5 size-4 shrink-0 accent-[#000C4A]"
                />
                <span className={`dash-sans text-sm leading-snug ${isDone ? "text-muted line-through" : "text-depths"}`}>
                  {item.label}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

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
  deadlines,
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
  deadlines: DeadlineItem[];
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
        <LedgerBand columns={4}>
          <LedgerStat label="Przychód" tick="neutral" ink="depths">
            {formatPln(verifiedMonthSumPln)}
          </LedgerStat>
          <LedgerStat label="Koszty · wypłaty / wszystkie" tick="butter" ink="toffee">
            {formatPln(payoutCostPln)}
            <span className="text-luster/40"> / </span>
            {formatPln(totalCostPln)}
          </LedgerStat>
          <LedgerStat label="Marża agencji" tick="lime" ink="moss">
            {formatPln(agencyProfitPln)}
          </LedgerStat>
          <LedgerStat label="Nieopłacone" tick={unpaidMonthSumPln > 0 ? "claret" : "neutral"} ink="claret">
            −{formatPln(unpaidMonthSumPln)}
          </LedgerStat>
        </LedgerBand>
      </section>

      <section>
        <h2 className="dash-sans text-muted mb-3 text-xs font-semibold uppercase tracking-wide">Zespół i lekcje</h2>
        <div className="grid gap-3 lg:grid-cols-3">
          <article className="rounded-app border border-panel-frame/35 bg-snow p-4">
            <p className="dash-sans text-muted text-[10px] font-semibold uppercase tracking-wide">Nauczyciele</p>
            <p className="dash-mono text-depths mt-1 text-2xl font-bold tabular-nums">{tutorCount}</p>
          </article>

          <article className="rounded-app border border-panel-frame/35 bg-snow p-4">
            <p className="dash-sans text-muted text-[10px] font-semibold uppercase tracking-wide">Uczniowie</p>
            <p className="dash-mono text-depths mt-1 text-2xl font-bold tabular-nums">{studentCount}</p>
          </article>

          <article className="rounded-app border border-panel-frame/35 bg-snow p-4">
            <p className="dash-sans text-muted text-[10px] font-semibold uppercase tracking-wide">Lekcje · {monthLabel}</p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <div className="status-rail status-rail-pending pl-2.5">
                <p className="dash-sans text-toffee text-[10px] font-bold uppercase tracking-wide">Do zatw.</p>
                <p className="dash-mono text-toffee mt-0.5 text-lg font-bold tabular-nums">{pendingMonthCount}</p>
              </div>
              <div className="status-rail status-rail-verified pl-2.5">
                <p className="dash-sans text-moss text-[10px] font-bold uppercase tracking-wide">Zatw.</p>
                <p className="dash-mono text-moss mt-0.5 text-lg font-bold tabular-nums">{verifiedMonthCount}</p>
              </div>
              <div className="status-rail status-rail-unpaid pl-2.5">
                <p className="dash-sans text-claret text-[10px] font-bold uppercase tracking-wide">Nieopł.</p>
                <p className="dash-mono text-claret mt-0.5 text-lg font-bold tabular-nums">{unpaidMonthCount}</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section>
        <h2 className="dash-sans text-muted mb-3 text-xs font-semibold uppercase tracking-wide">Najważniejsze daty</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {deadlines.map((d) => {
            const overdue = d.daysLeft < 0;
            const soon = d.daysLeft >= 0 && d.daysLeft <= 3;
            const rail = overdue ? "status-rail-unpaid" : soon ? "status-rail-pending" : "status-rail-neutral";
            const daysTone = overdue ? "text-claret" : soon ? "text-toffee" : "text-muted";
            return (
              <Link
                key={d.id}
                href={d.href}
                className={`status-rail ${rail} rounded-app border border-panel-frame/35 bg-snow p-4 transition hover:bg-luster/60`}
              >
                <p className="dash-sans text-muted text-[10px] font-semibold uppercase tracking-wide">{d.label}</p>
                <p className="dash-sans text-depths mt-1.5 text-sm font-bold capitalize">{d.dateLabel}</p>
                <p className={`dash-mono mt-2 text-xs font-bold ${daysTone}`}>{daysLeftLabel(d.daysLeft)}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="dash-sans text-muted mb-3 text-xs font-semibold uppercase tracking-wide">Checklisty</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChecklistCard
            title="Nowy pracownik"
            subtitle="Formalności po dodaniu konta."
            items={NEW_EMPLOYEE_ITEMS}
            storageKey="zaliczone-admin-checklist-new-employee"
            accent="lime"
          />
          <ChecklistCard
            title="Proces wypłat"
            subtitle="Cykl na koniec miesiąca — od ewidencji po przelew."
            items={PAYOUT_ITEMS}
            storageKey="zaliczone-admin-checklist-payouts"
            accent="butter"
          />
        </div>
      </section>
    </div>
  );
}
