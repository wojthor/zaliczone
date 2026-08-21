"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

type ChecklistItem = { id: string; label: string };

const NEW_EMPLOYEE_ITEMS: ChecklistItem[] = [
  { id: "ne-1", label: "Załóż konto w systemie" },
  { id: "ne-2", label: "Pobierz dane do umowy zlecenie" },
  { id: "ne-3", label: "Zgłoś studenta do ZUS (ZZA) w ciągu 7 dni" },
  { id: "ne-4", label: "Podpisz oświadczenie o statusie studenta < 26 lat" },
];

const PAYOUT_ITEMS: ChecklistItem[] = [
  { id: "po-1", label: "Odbierz podpisany skan PDF od tutora" },
  { id: "po-3", label: "Wykonaj przelew wychodzący w banku" },
  { id: "po-4", label: "Odznacz jako „WYPŁACONE” w systemie" },
];

export type DeadlineItem = {
  id: string;
  label: string;
  dateLabel: string;
  dateIso: string;
  daysLeft: number;
  href: string;
  custom?: boolean;
};

type DeadlineStatus = "todo" | "doing" | "done";

type CustomDeadlineStored = {
  id: string;
  label: string;
  dateIso: string;
  href?: string;
};

const WEEKDAY_LABELS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const STATUS_KEY = "zaliczone-admin-deadlines-status";
const DONE_KEY_LEGACY = "zaliczone-admin-deadlines-done";
const CUSTOM_KEY = "zaliczone-admin-deadlines-custom";
const SUBTASKS_KEY = "zaliczone-admin-deadlines-subtasks";

type Subtask = { id: string; label: string; done: boolean };

const MONTHLY_CYCLE: Array<{ id: string; day: number; label: string; href: string }> = [
  { id: "ewidencja-deadline", day: 3, label: "Ewidencje podpisane (do)", href: "/admin/wyplaty" },
  { id: "rachunek-send", day: 3, label: "Wysyłka rachunków do podpisania", href: "/admin/wyplaty" },
  { id: "rachunek-deadline", day: 5, label: "Rachunki podpisane (do)", href: "/admin/wyplaty" },
  { id: "verification", day: 6, label: "Weryfikacja z systemem", href: "/admin/rozliczenia" },
  { id: "payout", day: 10, label: "Wypłaty + odznaczenie", href: "/admin/wyplaty" },
  { id: "month-close", day: 15, label: "Zamknięcie miesiąca + koszty", href: "/admin/ksiegowosc" },
  { id: "finance-review", day: 16, label: "Weryfikacja finansów (limity)", href: "/admin/ksiegowosc" },
  { id: "taxes", day: 20, label: "Podatki / zaliczka PIT (JDG)", href: "/admin/ksiegowosc" },
];

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
    <article className="admin-card p-4 sm:p-5">
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

function daysLeftLabel(days: number): string {
  if (days > 1) return `za ${days} dni`;
  if (days === 1) return "jutro";
  if (days === 0) return "dziś";
  if (days === -1) return "wczoraj";
  return `${Math.abs(days)} dni po terminie`;
}

function toIsoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function deadlineKey(d: Pick<DeadlineItem, "dateIso" | "id">): string {
  return `${d.dateIso}:${d.id}`;
}

function formatDateLabel(iso: string): string {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
}

function daysUntilFromIso(iso: string, today = new Date()): number {
  const target = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

function readStatuses(): Record<string, DeadlineStatus> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    if (raw) return JSON.parse(raw) as Record<string, DeadlineStatus>;
    const legacy = localStorage.getItem(DONE_KEY_LEGACY);
    if (!legacy) return {};
    const doneMap = JSON.parse(legacy) as Record<string, boolean>;
    const migrated: Record<string, DeadlineStatus> = {};
    for (const [k, v] of Object.entries(doneMap)) {
      if (v) migrated[k] = "done";
    }
    localStorage.setItem(STATUS_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return {};
  }
}

function persistStatuses(next: Record<string, DeadlineStatus>) {
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(next));
    const legacy: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(next)) {
      if (v === "done") legacy[k] = true;
    }
    localStorage.setItem(DONE_KEY_LEGACY, JSON.stringify(legacy));
  } catch {
    /* ignore */
  }
}

function readCustomDeadlines(): CustomDeadlineStored[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? (JSON.parse(raw) as CustomDeadlineStored[]) : [];
  } catch {
    return [];
  }
}

function persistCustomDeadlines(items: CustomDeadlineStored[]) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

function readSubtasksMap(): Record<string, Subtask[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SUBTASKS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Subtask[]>) : {};
  } catch {
    return {};
  }
}

function persistSubtasksMap(map: Record<string, Subtask[]>) {
  try {
    localStorage.setItem(SUBTASKS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function buildMonthCycleDeadlines(year: number, monthIndex0: number): DeadlineItem[] {
  const monthLabel = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(
    new Date(year, monthIndex0, 15),
  );
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  return MONTHLY_CYCLE.filter((item) => item.day <= daysInMonth).map((item) => {
    const dateIso = `${year}-${String(monthIndex0 + 1).padStart(2, "0")}-${String(item.day).padStart(2, "0")}`;
    return {
      id: item.id,
      label: `${item.label} · ${monthLabel}`,
      dateLabel: formatDateLabel(dateIso),
      dateIso,
      daysLeft: daysUntilFromIso(dateIso),
      href: item.href,
    };
  });
}

function customToDeadline(c: CustomDeadlineStored): DeadlineItem {
  return {
    id: c.id,
    label: c.label,
    dateLabel: formatDateLabel(c.dateIso),
    dateIso: c.dateIso,
    daysLeft: daysUntilFromIso(c.dateIso),
    href: c.href || "/admin/kalendarz",
    custom: true,
  };
}

function CompactMonthCalendar({
  viewYear,
  viewMonth,
  selectedIso,
  todayIso,
  byDate,
  getStatus,
  onSelect,
  onShiftMonth,
}: {
  viewYear: number;
  viewMonth: number;
  selectedIso: string | null;
  todayIso: string;
  byDate: Map<string, DeadlineItem[]>;
  getStatus: (d: DeadlineItem) => DeadlineStatus;
  onSelect: (iso: string) => void;
  onShiftMonth: (delta: number) => void;
}) {
  const monthLabel = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(
    new Date(viewYear, viewMonth, 1),
  );

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const result: Array<{ day: number | null; iso: string | null }> = [];
    for (let i = 0; i < startOffset; i++) result.push({ day: null, iso: null });
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      result.push({ day, iso });
    }
    while (result.length % 7 !== 0) result.push({ day: null, iso: null });
    return result;
  }, [viewYear, viewMonth]);

  return (
    <div className="w-full max-w-[17rem] shrink-0 admin-card p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => onShiftMonth(-1)}
          className="dash-sans rounded border border-panel-frame/30 px-1.5 py-0.5 text-[11px] font-bold text-depths hover:bg-luster/60"
          aria-label="Poprzedni miesiąc"
        >
          ‹
        </button>
        <p className="dash-sans text-depths text-[11px] font-bold capitalize">{monthLabel}</p>
        <button
          type="button"
          onClick={() => onShiftMonth(1)}
          className="dash-sans rounded border border-panel-frame/30 px-1.5 py-0.5 text-[11px] font-bold text-depths hover:bg-luster/60"
          aria-label="Następny miesiąc"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w} className="dash-sans text-muted py-0.5 text-[8px] font-bold uppercase">
            {w}
          </span>
        ))}
        {cells.map((cell, i) => {
          if (!cell.day || !cell.iso) return <span key={`e-${i}`} className="aspect-square" />;
          const dayItems = byDate.get(cell.iso) ?? [];
          const marked = dayItems.length > 0;
          const openItems = dayItems.filter((d) => getStatus(d) !== "done");
          const allDone = marked && openItems.length === 0;
          const hasUrgent = openItems.some((d) => d.daysLeft <= 5);
          const isToday = cell.iso === todayIso;
          const isSelected = cell.iso === selectedIso;
          const dayTone = allDone
            ? "bg-depths/15 text-depths"
            : hasUrgent
              ? "bg-steel/25 text-steel"
              : marked
                ? "bg-lime/35 text-depths"
                : "text-depths hover:bg-luster/70";
          const dotTone = allDone ? "bg-depths" : hasUrgent ? "bg-steel" : "bg-lime";
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onSelect(cell.iso!)}
              className={`dash-mono relative flex aspect-square items-center justify-center rounded-full text-[10px] font-bold transition ${
                isSelected ? "bg-depths text-snow" : isToday ? "bg-lime text-depths" : dayTone
              }`}
            >
              {cell.day}
              {marked && !isSelected ? (
                <span className={`absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full ${dotTone}`} />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuestionCard({
  d,
  onStart,
  onEdit,
  onDelete,
  onJump,
}: {
  d: DeadlineItem;
  onStart: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  onJump: () => void;
}) {
  const overdue = d.daysLeft < 0;
  const soon = d.daysLeft >= 0 && d.daysLeft <= 5;
  return (
    <li
      className={`rounded-app border px-3 py-2.5 ${
        overdue || soon ? "border-steel/40 bg-steel/10" : "border-panel-frame/25 bg-luster/25"
      }`}
    >
      <button type="button" onClick={onJump} className="w-full text-left">
        <span className="dash-sans text-muted block text-[10px] font-semibold capitalize">{d.dateLabel}</span>
        <span
          className={`dash-sans mt-0.5 block text-xs font-semibold ${
            overdue || soon ? "text-steel" : "text-depths"
          }`}
        >
          {d.label}
        </span>
        <span
          className={`dash-mono mt-1 block text-[11px] font-bold ${
            overdue || soon ? "text-steel" : "text-muted"
          }`}
        >
          {daysLeftLabel(d.daysLeft)}
        </span>
      </button>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onStart}
          className="dash-sans rounded-app bg-lime px-2.5 py-1 text-[10px] font-bold text-depths hover:opacity-90"
        >
          Rozpocznij
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="dash-sans rounded-app border border-panel-frame/40 px-2.5 py-1 text-[10px] font-bold text-depths hover:bg-luster/60"
        >
          Edytuj
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="dash-sans ml-auto text-[10px] font-bold text-steel hover:underline"
          >
            Usuń
          </button>
        ) : null}
        {d.href && !d.custom ? (
          <Link href={d.href} className="dash-sans ml-auto text-[10px] font-bold text-depths hover:underline">
            Otwórz →
          </Link>
        ) : null}
      </div>
    </li>
  );
}

function ProgressCard({
  d,
  subtasks,
  onAddSubtask,
  onToggleSubtask,
  onRemoveSubtask,
  onJump,
  onBackToQuestions,
}: {
  d: DeadlineItem;
  subtasks: Subtask[];
  onAddSubtask: (label: string) => void;
  onToggleSubtask: (id: string) => void;
  onRemoveSubtask: (id: string) => void;
  onJump: () => void;
  onBackToQuestions: () => void;
}) {
  const [draft, setDraft] = useState("");
  const doneCount = subtasks.filter((s) => s.done).length;
  const pct = subtasks.length > 0 ? Math.round((doneCount / subtasks.length) * 100) : 0;
  const overdue = d.daysLeft < 0;
  const barTone = overdue ? "bg-steel" : "bg-lime";
  const cardTone = overdue
    ? "border-steel/40 bg-steel/10"
    : "border-lime/45 bg-lime/15";

  function submitSubtask(e: FormEvent) {
    e.preventDefault();
    const label = draft.trim();
    if (!label) return;
    onAddSubtask(label);
    setDraft("");
  }

  return (
    <li className={`rounded-app border px-3 py-2.5 ${cardTone}`}>
      <button type="button" onClick={onJump} className="w-full text-left">
        <span className="dash-sans text-muted block text-[10px] font-semibold capitalize">{d.dateLabel}</span>
        <span className="dash-sans text-depths mt-0.5 block text-xs font-semibold">{d.label}</span>
        <span className="dash-mono text-muted mt-1 block text-[11px] font-bold">{daysLeftLabel(d.daysLeft)}</span>
      </button>

      <div className="mt-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="dash-sans text-muted text-[9px] font-semibold uppercase tracking-wide">Podzadania</p>
          <span
            className={`dash-mono text-[10px] font-bold tabular-nums ${
              overdue ? "text-steel" : "text-depths"
            }`}
          >
            {doneCount}/{subtasks.length}
          </span>
        </div>
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/70">
          <div className={`h-full rounded-full transition-all ${barTone}`} style={{ width: `${pct}%` }} />
        </div>
        <ul className="space-y-1">
          {subtasks.length === 0 ? (
            <li className="dash-sans text-muted text-[11px]">Rozpisz kroki - po odhaczeniu wszystkich pytanie trafi do Zrobione.</li>
          ) : (
            subtasks.map((s) => (
              <li key={s.id} className="flex items-start gap-2 rounded-app bg-white/60 px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={s.done}
                  onChange={() => onToggleSubtask(s.id)}
                  className="mt-0.5 size-3.5 shrink-0 accent-depths"
                />
                <span
                  className={`dash-sans min-w-0 flex-1 text-[11px] leading-snug ${
                    s.done ? "text-muted line-through" : "text-depths"
                  }`}
                >
                  {s.label}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveSubtask(s.id)}
                  className="dash-sans shrink-0 text-[9px] font-bold text-steel hover:underline"
                >
                  ×
                </button>
              </li>
            ))
          )}
        </ul>
        <form onSubmit={submitSubtask} className="mt-2 flex gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Nowe podzadanie…"
            className="dash-sans min-w-0 flex-1 rounded-app border border-panel-frame/40 bg-white px-2 py-1.5 text-[11px] text-depths placeholder:text-muted"
          />
          <button
            type="submit"
            className="dash-sans shrink-0 rounded-app bg-depths px-2.5 py-1.5 text-[10px] font-bold text-snow"
          >
            +
          </button>
        </form>
      </div>

      <button
        type="button"
        onClick={onBackToQuestions}
        className="dash-sans text-muted mt-2 text-[10px] font-bold hover:underline"
      >
        ← Cofnij do pytań
      </button>
    </li>
  );
}

function DoneCard({
  d,
  onReopen,
  onJump,
  onDelete,
}: {
  d: DeadlineItem;
  onReopen: () => void;
  onJump: () => void;
  onDelete?: () => void;
}) {
  return (
    <li className="rounded-app border border-depths/25 bg-depths/10 px-3 py-2.5">
      <button type="button" onClick={onJump} className="w-full text-left">
        <span className="dash-sans text-muted block text-[10px] font-semibold capitalize">{d.dateLabel}</span>
        <span className="dash-sans mt-0.5 block text-xs font-semibold text-depths line-through">{d.label}</span>
        <span className="dash-mono mt-1 block text-[11px] font-bold text-depths">✓ zrobione</span>
      </button>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onReopen}
          className="dash-sans rounded-app border border-panel-frame/40 px-2.5 py-1 text-[10px] font-bold text-depths hover:bg-white/50"
        >
          Przywróć do pytań
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="dash-sans ml-auto text-[10px] font-bold text-steel hover:underline"
          >
            Usuń
          </button>
        ) : null}
      </div>
    </li>
  );
}

function DeadlinesBoard({ systemDeadlines }: { systemDeadlines: DeadlineItem[] }) {
  const todayIso = toIsoLocal(new Date());
  const [viewYear, setViewYear] = useState(() => Number(todayIso.slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number(todayIso.slice(5, 7)) - 1);
  const [selectedIso, setSelectedIso] = useState<string | null>(todayIso);
  const [statuses, setStatuses] = useState<Record<string, DeadlineStatus>>(() => readStatuses());
  const [customStored, setCustomStored] = useState<CustomDeadlineStored[]>(() => readCustomDeadlines());
  const [subtasksMap, setSubtasksMap] = useState<Record<string, Subtask[]>>(() => readSubtasksMap());

  const [newLabel, setNewLabel] = useState("");
  const [newDate, setNewDate] = useState(todayIso);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDate, setEditDate] = useState("");

  function getStatus(d: DeadlineItem): DeadlineStatus {
    return statuses[deadlineKey(d)] ?? "todo";
  }

  function setStatus(d: DeadlineItem, status: DeadlineStatus) {
    setStatuses((prev) => {
      const next = { ...prev, [deadlineKey(d)]: status };
      persistStatuses(next);
      return next;
    });
  }

  function getSubtasks(d: DeadlineItem): Subtask[] {
    return subtasksMap[deadlineKey(d)] ?? [];
  }

  function updateSubtasks(d: DeadlineItem, list: Subtask[]) {
    const key = deadlineKey(d);
    setSubtasksMap((prev) => {
      const next = { ...prev, [key]: list };
      persistSubtasksMap(next);
      return next;
    });
    if (list.length > 0 && list.every((s) => s.done)) {
      setStatus(d, "done");
    } else if (getStatus(d) === "done") {
      setStatus(d, "doing");
    }
  }

  const customDeadlines = useMemo(() => customStored.map(customToDeadline), [customStored]);

  const viewMonthDeadlines = useMemo(
    () => buildMonthCycleDeadlines(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const yearlyDeadlines = useMemo(
    () => systemDeadlines.filter((d) => d.id.startsWith("year-")),
    [systemDeadlines],
  );

  const allItems = useMemo(() => {
    const map = new Map<string, DeadlineItem>();
    const now = new Date();
    const cur = buildMonthCycleDeadlines(now.getFullYear(), now.getMonth());
    const nextD = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const next = buildMonthCycleDeadlines(nextD.getFullYear(), nextD.getMonth());
    for (const d of cur) map.set(`${d.dateIso}:${d.id}`, d);
    for (const d of next) map.set(`${d.dateIso}:${d.id}`, d);
    for (const d of yearlyDeadlines) map.set(`${d.dateIso}:${d.id}`, d);
    for (const d of customDeadlines) map.set(`${d.dateIso}:${d.id}`, d);
    return [...map.values()].sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.id.localeCompare(b.id));
  }, [yearlyDeadlines, customDeadlines]);

  const byDate = useMemo(() => {
    const map = new Map<string, DeadlineItem[]>();
    const monthItems = [
      ...viewMonthDeadlines,
      ...yearlyDeadlines.filter(
        (d) => Number(d.dateIso.slice(0, 4)) === viewYear && Number(d.dateIso.slice(5, 7)) - 1 === viewMonth,
      ),
      ...customDeadlines.filter(
        (d) => Number(d.dateIso.slice(0, 4)) === viewYear && Number(d.dateIso.slice(5, 7)) - 1 === viewMonth,
      ),
    ];
    for (const d of monthItems) {
      const list = map.get(d.dateIso) ?? [];
      list.push(d);
      map.set(d.dateIso, list);
    }
    return map;
  }, [viewMonthDeadlines, yearlyDeadlines, customDeadlines, viewYear, viewMonth]);

  const questions = useMemo(
    () => allItems.filter((d) => getStatus(d) === "todo"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allItems, statuses],
  );

  const inProgress = useMemo(
    () => allItems.filter((d) => getStatus(d) === "doing"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allItems, statuses],
  );

  const completed = useMemo(
    () => allItems.filter((d) => getStatus(d) === "done"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allItems, statuses],
  );

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function addCustom(e: FormEvent) {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label || !newDate) return;
    const item: CustomDeadlineStored = {
      id: `custom-${Date.now()}`,
      label,
      dateIso: newDate,
    };
    const next = [...customStored, item];
    setCustomStored(next);
    persistCustomDeadlines(next);
    setNewLabel("");
    setShowAddForm(false);
    setSelectedIso(newDate);
    setViewYear(Number(newDate.slice(0, 4)));
    setViewMonth(Number(newDate.slice(5, 7)) - 1);
  }

  function startEdit(d: DeadlineItem) {
    setShowAddForm(false);
    setEditingKey(deadlineKey(d));
    setEditLabel(d.label);
    setEditDate(d.dateIso);
  }

  function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingKey) return;
    const label = editLabel.trim();
    if (!label || !editDate) return;

    const existing = allItems.find((d) => deadlineKey(d) === editingKey);
    if (!existing) {
      setEditingKey(null);
      return;
    }

    if (existing.custom) {
      const oldKey = editingKey;
      const updated = customStored.map((c) =>
        c.id === existing.id && c.dateIso === existing.dateIso ? { ...c, label, dateIso: editDate } : c,
      );
      setCustomStored(updated);
      persistCustomDeadlines(updated);
      const newKey = `${editDate}:${existing.id}`;
      if (oldKey !== newKey) {
        setStatuses((prev) => {
          const next = { ...prev };
          if (next[oldKey]) {
            next[newKey] = next[oldKey];
            delete next[oldKey];
          } else {
            next[newKey] = "todo";
          }
          persistStatuses(next);
          return next;
        });
        setSubtasksMap((prev) => {
          const next = { ...prev };
          if (next[oldKey]) {
            next[newKey] = next[oldKey];
            delete next[oldKey];
          }
          persistSubtasksMap(next);
          return next;
        });
      }
    } else {
      // Systemowy termin → własna kopia z edycją; oryginał zostaje w pytaniach tylko jeśli nie był ruszany -
      // zastępujemy: ukrywamy oryginał jako done i dodajemy custom w todo.
      const clone: CustomDeadlineStored = {
        id: `edit-${existing.id}-${Date.now()}`,
        label,
        dateIso: editDate,
        href: existing.href,
      };
      const nextCustom = [...customStored, clone];
      setCustomStored(nextCustom);
      persistCustomDeadlines(nextCustom);
      setStatus(existing, "done");
      setStatuses((prev) => {
        const next = { ...prev, [`${editDate}:${clone.id}`]: "todo", [deadlineKey(existing)]: "done" };
        persistStatuses(next);
        return next;
      });
    }

    setEditingKey(null);
  }

  function deleteCustom(d: DeadlineItem) {
    const next = customStored.filter((c) => !(c.id === d.id && c.dateIso === d.dateIso));
    setCustomStored(next);
    persistCustomDeadlines(next);
    const key = deadlineKey(d);
    setStatuses((prev) => {
      const copy = { ...prev };
      delete copy[key];
      persistStatuses(copy);
      return copy;
    });
    setSubtasksMap((prev) => {
      const copy = { ...prev };
      delete copy[key];
      persistSubtasksMap(copy);
      return copy;
    });
  }

  function jumpTo(d: DeadlineItem) {
    setSelectedIso(d.dateIso);
    setViewYear(Number(d.dateIso.slice(0, 4)));
    setViewMonth(Number(d.dateIso.slice(5, 7)) - 1);
  }

  const editingItem = editingKey
    ? allItems.find((d) => deadlineKey(d) === editingKey)
    : null;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="dash-sans text-depths text-2xl font-bold tracking-tight sm:text-3xl">Kalendarz</h1>
          <span className="mt-1.5 block h-1 w-10 rounded-full bg-lime" aria-hidden />
          <p className="dash-sans text-muted mt-1.5 max-w-xl text-sm">
            Pytania → w toku (podzadania) → zrobione. Dopiero po odhaczeniu wszystkich podzadań pytanie ląduje w
            Zrobione.
          </p>
        </div>
        <CompactMonthCalendar
          viewYear={viewYear}
          viewMonth={viewMonth}
          selectedIso={selectedIso}
          todayIso={todayIso}
          byDate={byDate}
          getStatus={getStatus}
          onSelect={setSelectedIso}
          onShiftMonth={shiftMonth}
        />
      </header>

      <div className="grid gap-3 lg:grid-cols-3">
        {/* 1. Pytania */}
        <article className="admin-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="dash-sans text-muted text-[10px] font-semibold uppercase tracking-wide">Pytania</p>
            <div className="flex items-center gap-2">
              <span className="dash-mono text-muted text-[10px] font-bold tabular-nums">{questions.length}</span>
              <button
                type="button"
                onClick={() => {
                  setEditingKey(null);
                  setShowAddForm((v) => !v);
                }}
                aria-label="Dodaj pytanie"
                title="Dodaj pytanie"
                className="flex size-6 items-center justify-center rounded-full bg-depths text-sm font-bold leading-none text-snow hover:opacity-90"
              >
                +
              </button>
            </div>
          </div>

          {editingItem ? (
            <form onSubmit={saveEdit} className="mt-3 space-y-2 rounded-app border border-depths/20 bg-depths/5 p-3">
              <p className="dash-sans text-depths text-[10px] font-bold uppercase tracking-wide">Edycja</p>
              <input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="dash-sans w-full rounded-app border border-panel-frame/40 bg-white px-2.5 py-2 text-xs text-depths"
              />
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="dash-sans w-full rounded-app border border-panel-frame/40 bg-white px-2.5 py-2 text-xs text-depths"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="dash-sans flex-1 rounded-app bg-depths px-3 py-2 text-xs font-bold text-snow"
                >
                  Zapisz
                </button>
                <button
                  type="button"
                  onClick={() => setEditingKey(null)}
                  className="dash-sans rounded-app border border-panel-frame/40 px-3 py-2 text-xs font-bold text-depths"
                >
                  Anuluj
                </button>
              </div>
              {!editingItem.custom ? (
                <p className="dash-sans text-muted text-[10px]">
                  Edycja systemowego terminu zapisze go jako własną kopię z nowymi danymi.
                </p>
              ) : null}
            </form>
          ) : showAddForm ? (
            <form onSubmit={addCustom} className="mt-3 space-y-2 rounded-app border border-panel-frame/25 bg-luster/20 p-3">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Np. Oddzwonić do księgowej"
                autoFocus
                className="dash-sans w-full rounded-app border border-panel-frame/40 bg-white px-2.5 py-2 text-xs text-depths placeholder:text-muted"
              />
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="dash-sans w-full rounded-app border border-panel-frame/40 bg-white px-2.5 py-2 text-xs text-depths"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="dash-sans flex-1 rounded-app bg-depths px-3 py-2 text-xs font-bold text-snow hover:opacity-90"
                >
                  Dodaj
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="dash-sans rounded-app border border-panel-frame/40 px-3 py-2 text-xs font-bold text-depths"
                >
                  Anuluj
                </button>
              </div>
            </form>
          ) : null}

          <ul className="mt-3 max-h-[24rem] space-y-2 overflow-y-auto pr-1 scrollbar-panel">
            {questions.length === 0 ? (
              <li className="dash-sans text-muted text-xs">Brak otwartych pytań.</li>
            ) : (
              questions.map((d) => (
                <QuestionCard
                  key={`${d.dateIso}:${d.id}`}
                  d={d}
                  onStart={() => setStatus(d, "doing")}
                  onEdit={() => startEdit(d)}
                  onDelete={d.custom ? () => deleteCustom(d) : undefined}
                  onJump={() => jumpTo(d)}
                />
              ))
            )}
          </ul>
        </article>

        {/* 2. W toku */}
        <article className="admin-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="dash-sans text-muted text-[10px] font-semibold uppercase tracking-wide">W toku</p>
            <span className="dash-mono text-[10px] font-bold tabular-nums text-depths">{inProgress.length}</span>
          </div>
          <ul className="mt-2.5 max-h-[32rem] space-y-2 overflow-y-auto pr-1 scrollbar-panel">
            {inProgress.length === 0 ? (
              <li className="dash-sans text-muted text-xs">Kliknij „Rozpocznij” przy pytaniu, żeby tu nad nim pracować.</li>
            ) : (
              inProgress.map((d) => (
                <ProgressCard
                  key={`${d.dateIso}:${d.id}`}
                  d={d}
                  subtasks={getSubtasks(d)}
                  onAddSubtask={(label) => {
                    const list = [
                      ...getSubtasks(d),
                      { id: `st-${Date.now()}`, label, done: false },
                    ];
                    updateSubtasks(d, list);
                  }}
                  onToggleSubtask={(id) => {
                    const list = getSubtasks(d).map((s) => (s.id === id ? { ...s, done: !s.done } : s));
                    updateSubtasks(d, list);
                  }}
                  onRemoveSubtask={(id) => {
                    updateSubtasks(
                      d,
                      getSubtasks(d).filter((s) => s.id !== id),
                    );
                  }}
                  onJump={() => jumpTo(d)}
                  onBackToQuestions={() => setStatus(d, "todo")}
                />
              ))
            )}
          </ul>
        </article>

        {/* 3. Zrobione */}
        <article className="admin-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="dash-sans text-muted text-[10px] font-semibold uppercase tracking-wide">Zrobione</p>
            <span className="dash-mono text-[10px] font-bold tabular-nums text-depths">{completed.length}</span>
          </div>
          <ul className="mt-2.5 max-h-[32rem] space-y-2 overflow-y-auto pr-1 scrollbar-panel">
            {completed.length === 0 ? (
              <li className="dash-sans text-muted text-xs">Tu trafiają pytania po odhaczeniu wszystkich podzadań.</li>
            ) : (
              completed.map((d) => (
                <DoneCard
                  key={`${d.dateIso}:${d.id}`}
                  d={d}
                  onReopen={() => setStatus(d, "todo")}
                  onJump={() => jumpTo(d)}
                  onDelete={d.custom ? () => deleteCustom(d) : undefined}
                />
              ))
            )}
          </ul>
        </article>
      </div>
    </div>
  );
}

export function KalendarzClient({ deadlines }: { deadlines: DeadlineItem[] }) {
  return (
    <div className="space-y-7">
      <DeadlinesBoard systemDeadlines={deadlines} />

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
            subtitle="Cykl na koniec miesiąca - od ewidencji po przelew."
            items={PAYOUT_ITEMS}
            storageKey="zaliczone-admin-checklist-payouts"
            accent="butter"
          />
        </div>
      </section>
    </div>
  );
}
