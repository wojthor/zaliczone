"use server";

import { revalidatePath } from "next/cache";
import { createTutorAccount } from "@/lib/actions/admin";
import {
  sendRecruitmentRejectionEmail,
  sendRecruitmentTestEmail,
} from "@/lib/emails/send";
import {
  offeringsFromCandidate,
  parseRequiredTests,
  resolveTestLinks,
} from "@/lib/recruitment/test-links";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import type { Candidate } from "@/lib/types/database";

async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji - zaloguj się ponownie.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "ADMIN") throw new Error("Brak uprawnień koordynatora.");
}

function revalidateRecruitment() {
  revalidatePath("/admin/rekrutacja");
  revalidatePath("/admin/nauczyciele");
}

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

async function getCandidateOrThrow(candidateId: string): Promise<Candidate> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("candidates").select("*").eq("id", candidateId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Nie znaleziono kandydata.");
  return data as Candidate;
}

/**
 * Oznacza testy jako wysłane, ustawia status IN_PROGRESS
 * i wysyła maila Resend z linkami dobranymi z TEST_URLS (przedmiot + poziom).
 */
export async function markTestsAsSent(candidateId: string): Promise<{ ok: true }> {
  await requireAdmin();
  const candidate = await getCandidateOrThrow(candidateId);

  if (candidate.status === "HIRED" || candidate.status === "REJECTED") {
    throw new Error("Ten kandydat jest już zamknięty (zatrudniony lub odrzucony).");
  }

  const required = parseRequiredTests(candidate.required_tests);
  const links = resolveTestLinks(required);
  if (links.length === 0) {
    throw new Error(
      "Brak linków do testów dla required_tests kandydata. Uzupełnij TEST_URLS (przedmiot + poziom).",
    );
  }
  if (links.length < required.length) {
    const missing = required
      .filter((t) => !links.some((l) => l.subject === t.subject && normLoose(l.level) === normLoose(t.level)))
      .map((t) => `${t.subject} · ${t.level}`)
      .join(", ");
    throw new Error(`Brak URL-i dla: ${missing}. Uzupełnij TEST_URLS.`);
  }

  await sendRecruitmentTestEmail({
    email: candidate.email,
    firstName: firstNameOf(candidate.full_name),
    tests: links.map((l) => ({
      subject: l.subject,
      level: l.level,
      url: l.url,
      label: l.label,
    })),
  });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("candidates")
    .update({ test_sent_manually: true, status: "IN_PROGRESS" })
    .eq("id", candidateId);
  if (error) throw error;

  revalidateRecruitment();
  return { ok: true };
}

function normLoose(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/\s*-\s*/g, " ")
    .replace(/\s+/g, " ");
}

export async function hireCandidate(candidateId: string): Promise<{ ok: true; tutorId: string }> {
  await requireAdmin();
  const candidate = await getCandidateOrThrow(candidateId);

  if (candidate.status === "HIRED") {
    throw new Error("Kandydat jest już oznaczony jako zatrudniony.");
  }
  if (candidate.status === "REJECTED") {
    throw new Error("Nie można zatrudnić odrzuconego kandydata.");
  }

  const { id: tutorId } = await createTutorAccount({
    email: candidate.email,
    fullName: candidate.full_name,
    phone: candidate.phone,
    activeSubjects: offeringsFromCandidate(candidate),
    birthDate: candidate.dob,
  });

  const supabase = createServiceClient();
  const { error } = await supabase.from("candidates").update({ status: "HIRED" }).eq("id", candidateId);
  if (error) throw error;

  revalidateRecruitment();
  return { ok: true, tutorId };
}

export async function rejectCandidate(candidateId: string): Promise<{ ok: true }> {
  await requireAdmin();
  const candidate = await getCandidateOrThrow(candidateId);

  if (candidate.status === "HIRED") {
    throw new Error("Nie można odrzucić zatrudnionego kandydata.");
  }
  if (candidate.status === "REJECTED") {
    throw new Error("Kandydat jest już odrzucony.");
  }

  await sendRecruitmentRejectionEmail({
    email: candidate.email,
    firstName: firstNameOf(candidate.full_name),
  });

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("candidates")
    .update({ status: "REJECTED" })
    .eq("id", candidateId);
  if (error) throw error;

  revalidateRecruitment();
  return { ok: true };
}
