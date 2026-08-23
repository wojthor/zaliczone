"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { bustTag, studentsTag, subjectsTag } from "@/lib/cache";
import {
  formatTutorOffering,
  subjectsFromOfferings,
  tutorMayTeach,
} from "@/lib/tutor-offerings";

type InsertStudentInput = {
  name: string;
  subjects: string[];
  classLevel: string;
  ratePln: number;
  schoolClass?: string;
  phone?: string;
  email?: string;
  notes?: string;
};

type UpdateStudentInput = InsertStudentInput;

/** Pusty string -> null, żeby w bazie nie zostawały puste ciągi zamiast braku danych. */
function nullIfEmpty(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function assertTutorMayAssignStudent(
  tutorId: string,
  subjects: string[],
  classLevel: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("active_subjects")
    .eq("id", tutorId)
    .maybeSingle();
  if (error) throw error;
  const offerings = (data?.active_subjects as string[] | null) ?? [];
  const allowedSubjects = subjectsFromOfferings(offerings);
  for (const subject of subjects) {
    if (!allowedSubjects.includes(subject)) {
      throw new Error(`Nie masz uprawnień do przedmiotu: ${subject}.`);
    }
  }
  if (!tutorMayTeach(offerings, subjects, classLevel)) {
    throw new Error(
      "Ten poziom nie jest Ci przypisany. Poproś koordynatora o dodanie przedmiotu z poziomem w cenniku.",
    );
  }

  const { data: tier } = await supabase
    .from("price_tiers")
    .select("label, client_rate_pln")
    .eq("label", classLevel)
    .maybeSingle();
  if (!tier) {
    throw new Error("Wybrany poziom nie istnieje w cenniku.");
  }
  return Number(tier.client_rate_pln);
}

export async function insertStudent(input: InsertStudentInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji.");

  const ratePln = await assertTutorMayAssignStudent(user.id, input.subjects, input.classLevel);

  const { data, error } = await supabase
    .from("students")
    .insert({
      tutor_id: user.id,
      name: input.name,
      subjects: input.subjects,
      class_level: input.classLevel,
      rate_pln: ratePln,
      school_class: nullIfEmpty(input.schoolClass),
      phone: nullIfEmpty(input.phone),
      email: nullIfEmpty(input.email),
      notes: nullIfEmpty(input.notes),
    })
    .select("*")
    .single();

  if (error) throw error;
  bustTag(studentsTag(user.id));
  revalidatePath("/uczniowie");
  revalidatePath("/panel");
  revalidatePath("/terminarz");
  return data;
}

export async function updateStudent(studentId: string, input: UpdateStudentInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji.");

  const { data: row } = await supabase.from("students").select("blocked").eq("id", studentId).maybeSingle();
  if (row?.blocked) {
    throw new Error("Ten uczeń jest zablokowany - możesz go usunąć.");
  }

  const ratePln = await assertTutorMayAssignStudent(user.id, input.subjects, input.classLevel);

  const { error } = await supabase
    .from("students")
    .update({
      name: input.name,
      subjects: input.subjects,
      class_level: input.classLevel,
      rate_pln: ratePln,
      school_class: nullIfEmpty(input.schoolClass),
      phone: nullIfEmpty(input.phone),
      email: nullIfEmpty(input.email),
      notes: nullIfEmpty(input.notes),
    })
    .eq("id", studentId)
    .eq("tutor_id", user.id);

  if (error) throw error;
  bustTag(studentsTag(user.id));
  revalidatePath("/uczniowie");
  revalidatePath("/panel");
  revalidatePath("/terminarz");
}

export async function deleteStudent(studentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji.");

  const { error } = await supabase.from("students").delete().eq("id", studentId).eq("tutor_id", user.id);
  if (error) throw error;
  bustTag(studentsTag(user.id));
  revalidatePath("/uczniowie");
  revalidatePath("/panel");
  revalidatePath("/terminarz");
}

/** Wniosek o przedmiot + poziom (format „Przedmiot · Poziom”). */
export async function insertSubjectRequest(subject: string, level?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji.");

  const levelTrim = level?.trim() ?? "";
  const payload = levelTrim ? formatTutorOffering(subject, levelTrim) : subject.trim();
  if (!payload) throw new Error("Wybierz przedmiot i poziom.");

  const { data, error } = await supabase
    .from("subject_requests")
    .insert({ tutor_id: user.id, subject: payload, status: "PENDING" })
    .select("*")
    .single();

  if (error) throw error;
  bustTag(subjectsTag(user.id));
  revalidatePath("/profil");
  revalidatePath("/admin/cennik");
  return data;
}
