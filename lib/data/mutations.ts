"use client";

import { createClient } from "@/lib/supabase/client";

export function lessonDatesFromDraft(input: {
  dateIso: string;
  recurrence: "once" | "weekly" | "custom";
  selectedWeekdays: number[];
  /** Data końcowa (włącznie) dla weekly / custom */
  untilDateIso?: string | null;
}): string[] {
  const toIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const dateDay = ((d: string) => {
    const dt = new Date(`${d}T12:00:00`);
    return (dt.getDay() + 6) % 7;
  })(input.dateIso);

  if (input.recurrence === "once") {
    return [input.dateIso];
  }

  const untilIso =
    input.untilDateIso && input.untilDateIso >= input.dateIso
      ? input.untilDateIso
      : (() => {
          const fallback = new Date(`${input.dateIso}T12:00:00`);
          fallback.setDate(fallback.getDate() + 21);
          return toIso(fallback);
        })();

  if (input.recurrence === "weekly") {
    const out: string[] = [];
    const cursor = new Date(`${input.dateIso}T12:00:00`);
    const until = new Date(`${untilIso}T12:00:00`);
    while (cursor <= until) {
      out.push(toIso(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
    return out.length > 0 ? out : [input.dateIso];
  }

  const weekdays = input.selectedWeekdays.length > 0 ? input.selectedWeekdays : [dateDay];
  const out: string[] = [];
  const cursor = new Date(`${input.dateIso}T12:00:00`);
  const until = new Date(`${untilIso}T12:00:00`);
  while (cursor <= until) {
    const mon0 = (cursor.getDay() + 6) % 7;
    if (weekdays.includes(mon0)) out.push(toIso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out.length > 0 ? out : [input.dateIso];
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
