/** ISO week helpers — Monday as week start */

export function toMondayIso(d: Date): string {
  const m = startOfWeekMonday(d);
  const y = m.getFullYear();
  const mo = String(m.getMonth() + 1).padStart(2, "0");
  const day = String(m.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export function mondayIsoToDate(mondayIso: string): Date {
  return new Date(`${mondayIso}T12:00:00`);
}

export function addWeeksToMondayIso(mondayIso: string, weeks: number): string {
  return toMondayIso(addWeeks(mondayIsoToDate(mondayIso), weeks));
}

export function isIsoDateInWeek(dateIso: string, weekMondayIso: string): boolean {
  const d = new Date(`${dateIso}T12:00:00`);
  const start = mondayIsoToDate(weekMondayIso);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return d >= start && d < end;
}

export function formatWeekRangeFromMondayIso(weekMondayIso: string): string {
  return formatWeekRangePl(mondayIsoToDate(weekMondayIso));
}

export function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(12, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function addWeeks(d: Date, weeks: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + weeks * 7);
  return copy;
}

export function formatWeekRangePl(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const fmt = new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short" });
  const y = weekStart.getFullYear();
  return `${fmt.format(weekStart)} – ${fmt.format(weekEnd)} ${y}`;
}

export function parsePlDateLabelToDate(dateLabel: string, fallbackYear?: number): Date {
  const [d, m] = dateLabel.split(".").map(Number);
  const y = fallbackYear ?? new Date().getFullYear();
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function isDateInWeek(dateLabel: string, weekStart: Date, year = weekStart.getFullYear()): boolean {
  const d = parsePlDateLabelToDate(dateLabel, year);
  const start = startOfWeekMonday(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return d >= start && d < end;
}

export function dateLabelToIsoKey(dateLabel: string, year = new Date().getFullYear()): string {
  const d = parsePlDateLabelToDate(dateLabel, year);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
