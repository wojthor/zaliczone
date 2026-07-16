"use client";

import { createClient } from "@/lib/supabase/client";
import { dateForWeekdayInWeekContaining, isLessonLocked } from "@/lib/data/mappers";
import type { LessonStatus } from "@/lib/types/database";

type InsertStudentInput = {
  name: string;
  subjects: string[];
  classLevel: string;
  ratePln: number;
};

type UpdateStudentInput = InsertStudentInput;

type InsertLessonInput = {
  studentId: string;
  subject: string;
  dates: string[];
  start: string;
  end: string;
};

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

export async function insertLessons(input: InsertLessonInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji.");

  const rows = input.dates.map((date) => ({
    tutor_id: user.id,
    student_id: input.studentId,
    date,
    start_time: input.start,
    end_time: input.end,
    subject: input.subject,
    status: "PLANNED" as LessonStatus,
  }));

  const { data, error } = await supabase.from("lessons").insert(rows).select("*");
  if (error) throw error;
  return data;
}

export async function updateLesson(
  lessonId: string,
  input: {
    studentId: string;
    subject: string;
    date: string;
    start: string;
    end: string;
  },
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("lessons")
    .update({
      student_id: input.studentId,
      subject: input.subject,
      date: input.date,
      start_time: input.start,
      end_time: input.end,
    })
    .eq("id", lessonId);

  if (error) throw error;
}

export async function deleteLesson(lessonId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) throw error;
}

/** Tutor workflow: submit / undo / resubmit after UNPAID */
export async function setLessonStatus(lessonId: string, status: LessonStatus) {
  const supabase = createClient();
  const { error } = await supabase.from("lessons").update({ status }).eq("id", lessonId);
  if (error) throw error;
}

export async function tutorToggleLessonVerification(
  lessonId: string,
  currentStatus: LessonStatus,
): Promise<LessonStatus> {
  if (isLessonLocked(currentStatus)) {
    throw new Error("Lekcja zatwierdzona — nie można cofnąć.");
  }

  let next: LessonStatus;
  if (currentStatus === "PLANNED") next = "PENDING_VERIFICATION";
  else if (currentStatus === "PENDING_VERIFICATION") next = "PLANNED";
  else if (currentStatus === "UNPAID") next = "PENDING_VERIFICATION";
  else next = currentStatus;

  await setLessonStatus(lessonId, next);
  return next;
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
}): string[] {
  const dateDay = ((d: string) => {
    const dt = new Date(`${d}T12:00:00`);
    return (dt.getDay() + 6) % 7;
  })(input.dateIso);

  if (input.recurrence === "once" || input.recurrence === "weekly") {
    if (input.recurrence === "weekly") {
      return [0, 1, 2, 3].map((week) => {
        const base = new Date(`${input.dateIso}T12:00:00`);
        base.setDate(base.getDate() + week * 7);
        return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
      });
    }
    return [input.dateIso];
  }

  const weekdays = input.selectedWeekdays.length > 0 ? input.selectedWeekdays : [dateDay];
  return weekdays.map((dayIndex) => dateForWeekdayInWeekContaining(input.dateIso, dayIndex));
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
