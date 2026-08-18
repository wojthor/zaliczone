"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { hasThreeUnpaidInARow } from "@/lib/alerts/unpaid-streak";
import { bustTag, studentsTag } from "@/lib/cache";
import type { LessonStatus } from "@/lib/types/database";

function isMissingAlertsSchema(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false;
  const msg = error.message ?? "";
  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    msg.includes("alerts") ||
    msg.includes("blocked")
  );
}

function revalidateAlertViews() {
  revalidatePath("/admin");
  revalidatePath("/admin/rozliczenia");
  revalidatePath("/admin/nauczyciele");
  revalidatePath("/panel");
  revalidatePath("/uczniowie");
  revalidatePath("/terminarz");
  revalidatePath("/profil");
}

async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "ADMIN") throw new Error("Brak uprawnień koordynatora.");
  return user.id;
}

export async function syncUnpaidStreakAlert(studentId: string) {
  const supabase = createServiceClient();
  const { data: lessons, error } = await supabase
    .from("lessons")
    .select("status, date, start_time, tutor_id")
    .eq("student_id", studentId);

  if (error) {
    if (isMissingAlertsSchema(error)) return;
    throw error;
  }
  const rows = (lessons ?? []) as Array<{
    status: LessonStatus;
    date: string;
    start_time: string;
    tutor_id: string;
  }>;
  const streak = hasThreeUnpaidInARow(rows);
  const tutorId = rows[0]?.tutor_id ?? null;

  if (!streak) {
    const { error: resolveError } = await supabase
      .from("alerts")
      .update({ resolved_at: new Date().toISOString() })
      .eq("kind", "UNPAID_STREAK")
      .eq("audience", "ADMIN")
      .eq("student_id", studentId)
      .is("resolved_at", null);
    if (resolveError && !isMissingAlertsSchema(resolveError)) throw resolveError;
    return;
  }

  const { data: student } = await supabase.from("students").select("name, tutor_id, blocked").eq("id", studentId).maybeSingle();
  if (!student || student.blocked) return;
  const resolvedTutorId = student.tutor_id ?? tutorId;
  if (!resolvedTutorId) return;

  const { data: tutor } = await supabase.from("profiles").select("full_name").eq("id", resolvedTutorId).maybeSingle();
  const studentName = student.name;
  const tutorName = tutor?.full_name ?? "Nauczyciel";

  const { data: existing, error: existingError } = await supabase
    .from("alerts")
    .select("id")
    .eq("kind", "UNPAID_STREAK")
    .eq("audience", "ADMIN")
    .eq("student_id", studentId)
    .is("resolved_at", null)
    .maybeSingle();

  if (existingError) {
    if (isMissingAlertsSchema(existingError)) return;
    throw existingError;
  }
  if (existing) return;

  const { error: insertError } = await supabase.from("alerts").insert({
    kind: "UNPAID_STREAK",
    audience: "ADMIN",
    tutor_id: resolvedTutorId,
    student_id: studentId,
    title: "3 lekcje z rzędu bez wpłaty",
    body: `${studentName} (nauczyciel: ${tutorName}) ma już trzy lekcje z rzędu bez wpłaty. Jeśli rodzic nie zapłacił, zablokuj konto ucznia.`,
  });
  if (insertError && insertError.code !== "23505" && !isMissingAlertsSchema(insertError)) {
    throw insertError;
  }

  revalidateAlertViews();
}

export async function syncStopTeachingAlert(tutorId: string, accepting: boolean) {
  const supabase = createServiceClient();

  if (accepting) {
    const { error: resolveError } = await supabase
      .from("alerts")
      .update({ resolved_at: new Date().toISOString() })
      .eq("kind", "STOP_TEACHING")
      .eq("audience", "ADMIN")
      .eq("tutor_id", tutorId)
      .is("resolved_at", null);
    if (resolveError && !isMissingAlertsSchema(resolveError)) throw resolveError;
    revalidateAlertViews();
    return;
  }

  const { data: tutor } = await supabase.from("profiles").select("full_name").eq("id", tutorId).maybeSingle();
  const tutorName = tutor?.full_name ?? "Nauczyciel";

  const { data: existing, error: existingError } = await supabase
    .from("alerts")
    .select("id")
    .eq("kind", "STOP_TEACHING")
    .eq("audience", "ADMIN")
    .eq("tutor_id", tutorId)
    .is("resolved_at", null)
    .maybeSingle();

  if (existingError) {
    if (isMissingAlertsSchema(existingError)) return;
    throw existingError;
  }
  if (existing) return;

  const { error: insertError } = await supabase.from("alerts").insert({
    kind: "STOP_TEACHING",
    audience: "ADMIN",
    tutor_id: tutorId,
    student_id: null,
    title: "Nauczyciel nie chce nowych uczniów",
    body: `${tutorName} nie chce już nowych uczniów. Zostaje widoczny na stronie, ale zdejmij jego ogłoszenie z OLX.`,
  });
  if (insertError && insertError.code !== "23505" && !isMissingAlertsSchema(insertError)) {
    throw insertError;
  }

  revalidateAlertViews();
}

export async function blockStudentFromAlert(studentId: string) {
  await requireAdmin();
  const supabase = createServiceClient();

  const { data: student } = await supabase
    .from("students")
    .select("id, name, tutor_id, blocked")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) throw new Error("Nie znaleziono ucznia.");
  if (student.blocked) throw new Error("Uczeń jest już zablokowany.");

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("students")
    .update({
      blocked: true,
      blocked_at: now,
      blocked_reason: "3 lekcje z rzędu bez wpłaty",
    })
    .eq("id", studentId);
  if (error) {
    if (isMissingAlertsSchema(error)) {
      throw new Error("Uruchom migrację 0014_alerts.sql w Supabase, żeby blokować uczniów.");
    }
    throw error;
  }

  const { error: resolveError } = await supabase
    .from("alerts")
    .update({ resolved_at: now, read_at: now })
    .eq("kind", "UNPAID_STREAK")
    .eq("student_id", studentId)
    .is("resolved_at", null);
  if (resolveError && !isMissingAlertsSchema(resolveError)) throw resolveError;

  const { error: insertError } = await supabase.from("alerts").insert({
    kind: "STUDENT_BLOCKED",
    audience: "TUTOR",
    tutor_id: student.tutor_id,
    student_id: studentId,
    title: "Uczeń zablokowany",
    body: `${student.name} został zablokowany przez koordynatora (3 lekcje z rzędu bez wpłaty). Nie dodawaj nowych zajęć z tym uczniem.`,
  });
  if (insertError && insertError.code !== "23505" && !isMissingAlertsSchema(insertError)) {
    throw insertError;
  }

  if (student.tutor_id) bustTag(studentsTag(student.tutor_id));
  revalidateAlertViews();
}

export async function unblockStudent(studentId: string) {
  await requireAdmin();
  const supabase = createServiceClient();

  const { data: student } = await supabase
    .from("students")
    .select("id, name, tutor_id, blocked")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) throw new Error("Nie znaleziono ucznia.");
  if (!student.blocked) throw new Error("Uczeń nie jest zablokowany.");

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("students")
    .update({
      blocked: false,
      blocked_at: null,
      blocked_reason: null,
    })
    .eq("id", studentId);
  if (error) {
    if (isMissingAlertsSchema(error)) {
      throw new Error("Uruchom migrację 0014_alerts.sql w Supabase, żeby odblokować uczniów.");
    }
    throw error;
  }

  const { error: resolveError } = await supabase
    .from("alerts")
    .update({ resolved_at: now, read_at: now })
    .eq("kind", "STUDENT_BLOCKED")
    .eq("student_id", studentId)
    .is("resolved_at", null);
  if (resolveError && !isMissingAlertsSchema(resolveError)) throw resolveError;

  await syncUnpaidStreakAlert(studentId);

  if (student.tutor_id) {
    bustTag(studentsTag(student.tutor_id));
    revalidatePath(`/admin/nauczyciele/${student.tutor_id}`);
  }
  revalidateAlertViews();
}

export async function dismissAlert(alertId: string) {
  const supabaseUser = await createClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();
  if (!user) throw new Error("Brak sesji.");

  const { data: profile } = await supabaseUser.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const supabase = createServiceClient();
  const { data: alert } = await supabase
    .from("alerts")
    .select("id, audience, tutor_id")
    .eq("id", alertId)
    .maybeSingle();
  if (!alert) throw new Error("Nie znaleziono alertu.");

  const isAdmin = profile?.role === "ADMIN";
  const isOwner = alert.audience === "TUTOR" && alert.tutor_id === user.id;
  if (!isAdmin && !isOwner) throw new Error("Brak uprawnień.");

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("alerts")
    .update({ resolved_at: now, read_at: now })
    .eq("id", alertId);
  if (error) throw error;

  revalidateAlertViews();
}
