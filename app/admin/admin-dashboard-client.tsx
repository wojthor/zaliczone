"use client";

import { useState } from "react";

type ChecklistItem = { id: string; label: string };

const NEW_EMPLOYEE_ITEMS: ChecklistItem[] = [
  { id: "ne-1", label: "Załóż konto w systemie" },
  { id: "ne-2", label: "Pobierz dane do umowy zlecenie" },
  { id: "ne-3", label: "Zgłoś studenta do ZUS (ZZA) w ciągu 7 dni" },
  { id: "ne-4", label: "Podpisz oświadczenie o statusie studenta < 26 lat" },
];

const PAYOUT_ITEMS: ChecklistItem[] = [
  { id: "po-1", label: "Wyślij prośbę o ewidencję w Powiadomieniach" },
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
  accent: "lime" | "amber";
}) {
  const { checked, toggle, doneCount, progress } = usePersistedChecklist(storageKey, items);
  const ring = accent === "lime" ? "border-[#000C4A]/20" : "border-amber-500/25";
  const bar = accent === "lime" ? "bg-lime" : "bg-amber-500";

  return (
    <article className={`rounded-app border ${ring} bg-snow p-4 sm:p-5`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-depths text-sm font-semibold">{title}</h3>
          <p className="text-muted mt-1 text-xs leading-relaxed">{subtitle}</p>
        </div>
        <span className="text-muted shrink-0 rounded-full bg-luster px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
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
                <span className={`text-sm leading-snug ${isDone ? "text-muted line-through" : "text-depths"}`}>
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
  return `${n.toLocaleString("pl-PL", { maximumFractionDigits: 0 })} zł`;
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
          <h1 className="text-depths text-2xl font-semibold tracking-tight sm:text-3xl">Główna</h1>
        </div>
        <div className="text-right">
          <p className="text-muted text-sm capitalize">{todayLabel}</p>
          <p className="text-muted mt-1 text-xs font-semibold uppercase tracking-wide">
            Miesiąc: <span className="text-depths capitalize">{monthLabel}</span>
          </p>
        </div>
      </header>

      <section>
        <h2 className="text-depths mb-3 text-sm font-semibold uppercase tracking-wide">Finanse miesiąca</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-app border border-panel-frame/35 bg-snow p-4">
            <p className="text-muted text-[10px] font-semibold uppercase tracking-wide">
              Przychód
            </p>
            <p className="text-depths mt-1 text-2xl font-black tabular-nums">
              {formatPln(verifiedMonthSumPln)}
            </p>
          </article>

          <article className="rounded-app border border-amber-500/40 bg-amber-50/80 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900/80">
              Koszty wypłaty/wszystkie
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums text-amber-900">
              {formatPln(payoutCostPln)}
              <span className="text-amber-900/50"> / </span>
              {formatPln(totalCostPln)}
            </p>
          </article>

          <article className="rounded-app border border-green-700/35 bg-green-700/[0.07] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-green-900/80">
              Marża agencji
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums text-green-800">
              {formatPln(agencyProfitPln)}
            </p>
          </article>

          <article className="rounded-app border border-red-400/50 bg-red-50/80 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-red-900/80">Nieopłacone</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-red-700">
              −{formatPln(unpaidMonthSumPln)}
            </p>
          </article>
        </div>
      </section>

      <section>
        <h2 className="text-depths mb-3 text-sm font-semibold uppercase tracking-wide">Zespół i lekcje</h2>
        <div className="grid gap-3 lg:grid-cols-3">
          <article className="rounded-app border border-panel-frame/35 bg-snow p-3">
            <p className="text-muted text-[10px] font-semibold uppercase tracking-wide">
              Nauczyciele{" "}
              <span className="font-medium normal-case tracking-normal">· aktywnych w systemie</span>
            </p>
            <p className="text-depths mt-1 text-2xl font-black tabular-nums">{tutorCount}</p>
          </article>

          <article className="rounded-app border border-panel-frame/35 bg-snow p-3">
            <p className="text-muted text-[10px] font-semibold uppercase tracking-wide">
              Uczniowie <span className="font-medium normal-case tracking-normal">· w bazie</span>
            </p>
            <p className="text-depths mt-1 text-2xl font-black tabular-nums">{studentCount}</p>
          </article>

          <article className="rounded-app border border-panel-frame/35 bg-snow p-3">
            <p className="text-muted text-[10px] font-semibold uppercase tracking-wide">
              Lekcje · {monthLabel}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Do zatwierdz.</p>
                <p className="mt-0.5 text-xl font-black tabular-nums text-amber-900">{pendingMonthCount}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-green-800">Zatwierdzone</p>
                <p className="mt-0.5 text-xl font-black tabular-nums text-green-800">{verifiedMonthCount}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-red-800">Nieopłacone</p>
                <p className="mt-0.5 text-xl font-black tabular-nums text-red-700">{unpaidMonthCount}</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section>
        <h2 className="text-depths mb-3 text-sm font-semibold uppercase tracking-wide">Najważniejsze daty</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {deadlines.map((d) => {
            const overdue = d.daysLeft < 0;
            const soon = d.daysLeft >= 0 && d.daysLeft <= 3;
            const tone = overdue
              ? "border-red-400/40 bg-red-50/70 text-red-900"
              : soon
                ? "border-amber-500/40 bg-amber-50/80 text-amber-950"
                : "border-panel-frame/35 bg-snow text-depths";
            return (
              <article key={d.id} className={`rounded-app border p-4 ${tone}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{d.label}</p>
                <p className="mt-1.5 text-sm font-bold capitalize">{d.dateLabel}</p>
                <p
                  className={`mt-2 text-xs font-bold ${
                    overdue ? "text-red-700" : soon ? "text-amber-800" : "text-muted"
                  }`}
                >
                  {daysLeftLabel(d.daysLeft)}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-depths mb-3 text-sm font-semibold uppercase tracking-wide">Checklisty</h2>
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
            accent="amber"
          />
        </div>
      </section>
    </div>
  );
}
