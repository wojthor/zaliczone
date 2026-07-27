"use client";

import { createClient } from "@/lib/supabase/client";

type InsertStudentInput = {
  name: string;
  subjects: string[];
  classLevel: string;
  ratePln: number;
};

type UpdateStudentInput = InsertStudentInput;

export async function insertStudent(input: InsertStudentInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji.");

  const { data, error } = await supabase
    .from("students")
    .insert({
      tutor_id: user.id,
      name: input.name,
      subjects: input.subjects,
      class_level: input.classLevel,
      rate_pln: input.ratePln,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateStudent(studentId: string, input: UpdateStudentInput) {
  const supabase = createClient();
  const { error } = await supabase
    .from("students")
    .update({
      name: input.name,
      subjects: input.subjects,
      class_level: input.classLevel,
      rate_pln: input.ratePln,
    })
    .eq("id", studentId);

  if (error) throw error;
}

export async function deleteStudent(studentId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("students").delete().eq("id", studentId);
  if (error) throw error;
}

export async function insertSubjectRequest(subject: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji.");

  const { data, error } = await supabase
    .from("subject_requests")
    .insert({ tutor_id: user.id, subject, status: "PENDING" })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

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
