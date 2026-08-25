"use server";

import { revalidatePath } from "next/cache";
import { createTutorAccount } from "@/lib/actions/admin";
import { sendRecruitmentRejectionEmail } from "@/lib/emails/send";
import { offeringsFromCandidate } from "@/lib/recruitment/test-links";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import type { Candidate, CandidateStatus } from "@/lib/types/database";

const STATUSES: CandidateStatus[] = ["NEW", "IN_PROGRESS", "REJECTED", "HIRED"];

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

/** Checkbox: oznacz, że linki do testów zostały wysłane (bez maila z aplikacji). */
export async function setCandidateTestsSent(
  candidateId: string,
  sent: boolean,
): Promise<{ ok: true }> {
  await requireAdmin();
  const candidate = await getCandidateOrThrow(candidateId);
  if (candidate.status === "HIRED" || candidate.status === "REJECTED") {
    throw new Error("Ten kandydat jest już zamknięty.");
  }

  const patch: Record<string, unknown> = { test_sent_manually: sent };
  if (sent && candidate.status === "NEW") patch.status = "IN_PROGRESS";

  const supabase = createServiceClient();
  const { error } = await supabase.from("candidates").update(patch).eq("id", candidateId);
  if (error) throw error;

  revalidateRecruitment();
  return { ok: true };
}

/** Checkbox: admin sprawdził wyniki testów samodzielnie. */
export async function setCandidateTestsReviewed(
  candidateId: string,
  reviewed: boolean,
): Promise<{ ok: true }> {
  await requireAdmin();
  await getCandidateOrThrow(candidateId);

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("candidates")
    .update({ tests_reviewed_manually: reviewed })
    .eq("id", candidateId);
  if (error) {
    if (String(error.message).includes("tests_reviewed_manually")) {
      throw new Error(
        "Brak kolumny tests_reviewed_manually — uruchom migrację 0019_candidates_review.sql w Supabase.",
      );
    }
    throw error;
  }

  revalidateRecruitment();
  return { ok: true };
}

/** Ręczna zmiana statusu kandydata (bez maila). */
export async function setCandidateStatus(
  candidateId: string,
  status: CandidateStatus,
): Promise<{ ok: true }> {
  await requireAdmin();
  if (!STATUSES.includes(status)) throw new Error("Nieprawidłowy status.");
  await getCandidateOrThrow(candidateId);

  const supabase = createServiceClient();
  const { error } = await supabase.from("candidates").update({ status }).eq("id", candidateId);
  if (error) throw error;

  revalidateRecruitment();
  return { ok: true };
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
