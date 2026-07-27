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
  /** Wspólne ID serii — ustawiane przy cyklicznym dodawaniu */
  seriesId?: string | null;
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

  const seriesId =
    input.seriesId ?? (input.dates.length > 1 ? crypto.randomUUID() : null);

  const baseRows = input.dates.map((date) => ({
    tutor_id: user.id,
    student_id: input.studentId,
    date,
    start_time: input.start,
    end_time: input.end,
    subject: input.subject,
    status: "PLANNED" as LessonStatus,
  }));

  const withSeries = seriesId
    ? baseRows.map((row) => ({ ...row, series_id: seriesId }))
    : baseRows;

  let { data, error } = await supabase.from("lessons").insert(withSeries).select("*");

  if (
    error &&
    seriesId &&
    (error.message?.includes("series_id") || error.code === "PGRST204")
  ) {
    const fallback = await supabase.from("lessons").insert(baseRows).select("*");
    data = fallback.data;
    error = fallback.error;
  }

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

/**
 * Usuwa lekcję oraz wszystkie późniejsze z tej samej serii (date >= fromDate).
 * Jeśli brak series_id — usuwa tylko wskazaną lekcję.
 */
export async function deleteLessonAndRemainingInSeries(lessonId: string) {
  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("lessons")
    .select("id, date, series_id, tutor_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!existing) throw new Error("Nie znaleziono lekcji.");

  await assertMonthOpen(monthKeyFromDate(existing.date));

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || existing.tutor_id !== user.id) {
    throw new Error("Brak uprawnień.");
  }

  if (!existing.series_id) {
    const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { deleted: 1 };
  }

  const { data: siblings, error: sibError } = await supabase
    .from("lessons")
    .select("id, date")
    .eq("series_id", existing.series_id)
    .eq("tutor_id", user.id)
    .gte("date", existing.date);

  if (sibError) throw sibError;

  const ids = (siblings ?? []).map((s) => s.id);
  for (const row of siblings ?? []) {
    await assertMonthOpen(monthKeyFromDate(row.date));
  }

  if (ids.length === 0) {
    revalidatePath("/", "layout");
    return { deleted: 0 };
  }

  const { error } = await supabase.from("lessons").delete().in("id", ids);
  if (error) throw error;
  revalidatePath("/", "layout");
  return { deleted: ids.length };
}

/**
 * Usuwa wiele lekcji po ID (tylko własne). Sprawdza otwarte miesiące.
 */
export async function deleteLessonsByIds(lessonIds: string[]) {
  const uniqueIds = [...new Set(lessonIds.filter(Boolean))];
  if (uniqueIds.length === 0) return { deleted: 0 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji.");

  const { data: rows, error: fetchError } = await supabase
    .from("lessons")
    .select("id, date, tutor_id")
    .in("id", uniqueIds)
    .eq("tutor_id", user.id);
  if (fetchError) throw fetchError;

  for (const row of rows ?? []) {
    await assertMonthOpen(monthKeyFromDate(row.date));
  }

  const ids = (rows ?? []).map((r) => r.id);
  if (ids.length === 0) return { deleted: 0 };

  const { error } = await supabase.from("lessons").delete().in("id", ids);
  if (error) throw error;
  revalidatePath("/", "layout");
  return { deleted: ids.length };
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
