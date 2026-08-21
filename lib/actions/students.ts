"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { bustTag, studentsTag, subjectsTag } from "@/lib/cache";

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

export async function insertStudent(input: InsertStudentInput) {
  const supabase = await createClient();
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

  const { error } = await supabase
    .from("students")
    .update({
      name: input.name,
      subjects: input.subjects,
      class_level: input.classLevel,
      rate_pln: input.ratePln,
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

export async function insertSubjectRequest(subject: string) {
  const supabase = await createClient();
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
  bustTag(subjectsTag(user.id));
  revalidatePath("/profil");
  revalidatePath("/admin/cennik");
  return data;
}
