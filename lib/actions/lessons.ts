"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isLessonLocked } from "@/lib/data/mappers";
import { assertMonthOpen, monthKeyFromDate } from "@/lib/actions/guards";
import type { LessonStatus } from "@/lib/types/database";

/**
 * Mutacje lekcji jako Server Actions (przeniesione z lib/data/mutations.ts, które wołały
 * Supabase bezpośrednio z klienta). Każda funkcja sprawdza assertMonthOpen na starcie —
 * to samo zabezpieczenie działa niezależnie od widoku (kalendarz, terminarz, panel admina).
 */

type InsertLessonInput = {
  studentId: string;
  subject: string;
  dates: string[];
  start: string;
  end: string;
};

export async function insertLessons(input: InsertLessonInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji.");

  for (const date of input.dates) {
    await assertMonthOpen(monthKeyFromDate(date));
  }

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
  revalidatePath("/", "layout");
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
  const supabase = await createClient();
  const { data: existing } = await supabase.from("lessons").select("date").eq("id", lessonId).maybeSingle();
  if (existing?.date) await assertMonthOpen(monthKeyFromDate(existing.date));
  await assertMonthOpen(monthKeyFromDate(input.date));

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
  revalidatePath("/", "layout");
}

export async function deleteLesson(lessonId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("lessons").select("date").eq("id", lessonId).maybeSingle();
  if (existing?.date) await assertMonthOpen(monthKeyFromDate(existing.date));

  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) throw error;
  revalidatePath("/", "layout");
}

/** Tutor workflow: submit / undo / resubmit after UNPAID */
export async function setLessonStatus(lessonId: string, status: LessonStatus) {
  const supabase = await createClient();
  const { data: existing } = await supabase.from("lessons").select("date").eq("id", lessonId).maybeSingle();
  if (existing?.date) await assertMonthOpen(monthKeyFromDate(existing.date));

  const { error } = await supabase.from("lessons").update({ status }).eq("id", lessonId);
  if (error) throw error;
  revalidatePath("/", "layout");
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
