"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  sendPayoutConfirmationEmail,
  sendTutorWelcomeEmail,
} from "@/lib/emails/send";
import { ensureTutorRootFolder } from "@/lib/actions/documents";
import { isDriveConfigured } from "@/lib/google-drive/client";
import {
  ensureTutorDriveFolder,
  moveTutorDriveFolderToFormer,
  renameTutorDriveFolder,
} from "@/lib/google-drive/tutor-folders";
import { assertMonthOpen, monthKeyFromDate } from "@/lib/actions/guards";
import { TUTOR_SHARE, bonusProgress, canCloseMonth } from "@/lib/dates";
import { TUTOR_PHOTO } from "@/lib/tutor-photo";
import { formatTutorOffering, parseTutorOfferings } from "@/lib/tutor-offerings";
import {
  TAG,
  bustLessonAndBonus,
  bustTag,
  financeTag,
  payoutsTag,
  staleTag,
  subjectsTag,
} from "@/lib/cache";

/** Tylko pary z poziomem — sam przedmiot bez poziomu nie daje uprawnień do stawki. */
function normalizeTutorOfferings(raw: string[] | undefined): string[] {
  return parseTutorOfferings(raw)
    .filter((o) => o.subject && o.level)
    .map((o) => formatTutorOffering(o.subject, o.level));
}

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

function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${TUTOR_PHOTO.bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split("?")[0] ?? "");
}

function bustTutorPhotoCaches(tutorId: string) {
  bustTag(TAG.dashboardStats);
  bustTag(TAG.publicTutors);
  revalidatePath("/admin/nauczyciele");
  revalidatePath(`/admin/nauczyciele/${tutorId}`);
  revalidatePath("/");
}

function tutorPhotoMime(file: File): string | null {
  if ((TUTOR_PHOTO.mimeTypes as readonly string[]).includes(file.type)) {
    return file.type;
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return null;
}

/** Upload / podmiana zdjęcia nauczyciela (landing, proporcje 3:4). */
export async function uploadTutorPhoto(
  tutorId: string,
  formData: FormData,
): Promise<{ photoUrl: string }> {
  await requireAdmin();

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Wybierz plik zdjęcia.");
  }
  const mime = tutorPhotoMime(file);
  if (!mime) {
    throw new Error("Dozwolone formaty: JPG, PNG, WebP.");
  }
  if (file.size > TUTOR_PHOTO.maxBytes) {
    throw new Error("Plik jest za duży (max 5 MB).");
  }

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("profiles")
    .select("photo_url")
    .eq("id", tutorId)
    .maybeSingle();

  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const path = `${tutorId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from(TUTOR_PHOTO.bucket)
    .upload(path, buffer, { contentType: mime, upsert: true });
  if (upErr) {
    throw new Error(
      upErr.message.includes("Bucket") || upErr.message.includes("not found")
        ? "Brak bucketa Storage tutor-photos. Uruchom migrację 0013_tutor_photo.sql."
        : upErr.message,
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(TUTOR_PHOTO.bucket).getPublicUrl(path);

  const { error: dbErr } = await supabase
    .from("profiles")
    .update({ photo_url: publicUrl })
    .eq("id", tutorId);
  if (dbErr) throw dbErr;

  const oldPath = row?.photo_url ? storagePathFromPublicUrl(String(row.photo_url)) : null;
  if (oldPath && oldPath !== path) {
    await supabase.storage.from(TUTOR_PHOTO.bucket).remove([oldPath]);
  }

  bustTutorPhotoCaches(tutorId);
  return { photoUrl: publicUrl };
}

export async function clearTutorPhoto(tutorId: string): Promise<void> {
  await requireAdmin();
  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("profiles")
    .select("photo_url")
    .eq("id", tutorId)
    .maybeSingle();

  const path = row?.photo_url ? storagePathFromPublicUrl(String(row.photo_url)) : null;
  if (path) {
    await supabase.storage.from(TUTOR_PHOTO.bucket).remove([path]);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ photo_url: null })
    .eq("id", tutorId);
  if (error) throw error;

  bustTutorPhotoCaches(tutorId);
}

export async function createTutorAccount(input: {
  email: string;
  fullName: string;
  activeSubjects?: string[];
  phone?: string | null;
  bankAccount?: string | null;
  olxUrl?: string | null;
  contractStart?: string | null;
  contractEnd?: string | null;
  pesel?: string | null;
  birthDate?: string | null;
  taxStreet?: string | null;
  taxPostalCode?: string | null;
  taxCity?: string | null;
  taxCountry?: string | null;
  taxOffice?: string | null;
  nip?: string | null;
  employmentType?: string | null;
}) {
  const supabase = createServiceClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = list?.users.find((u) => u.email === input.email);
  if (existing) {
    throw new Error("Ten adres e-mail jest już zajęty.");
  }

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "invite",
    email: input.email,
    options: {
      data: { role: "TUTOR", full_name: input.fullName },
      redirectTo: `${appUrl}/auth/callback?next=/ustaw-haslo`,
    },
  });

  if (linkError || !linkData.user) {
    throw linkError ?? new Error("Nie udało się wygenerować zaproszenia.");
  }

  const userId = linkData.user.id;
  const hashedToken = linkData.properties?.hashed_token;
  const inviteUrl = hashedToken
    ? `${appUrl}/auth/callback?token_hash=${encodeURIComponent(hashedToken)}&type=invite&next=/ustaw-haslo`
    : linkData.properties?.action_link;
  if (!inviteUrl) {
    throw new Error("Brak linku zaproszenia z Supabase.");
  }

  const offerings = normalizeTutorOfferings(input.activeSubjects);

  const profileRow: Record<string, unknown> = {
    id: userId,
    role: "TUTOR",
    full_name: input.fullName,
    active_subjects: offerings,
    phone: input.phone?.trim() || null,
    bank_account: input.bankAccount?.trim() || null,
    olx_url: input.olxUrl?.trim() || null,
    contract_start: input.contractStart || null,
    contract_end: input.contractEnd || null,
    pesel: input.pesel?.trim() || null,
    birth_date: input.birthDate || null,
    tax_street: input.taxStreet?.trim() || null,
    tax_postal_code: input.taxPostalCode?.trim() || null,
    tax_city: input.taxCity?.trim() || null,
    tax_country: input.taxCountry?.trim() || "Polska",
    tax_office: input.taxOffice?.trim() || null,
    nip: input.nip?.trim() || null,
    employment_type: input.employmentType || null,
  };

  const { error: profileError } = await supabase.from("profiles").upsert(profileRow);
  if (profileError) {
    const msg = `${profileError.message}`.toLowerCase();
    if (msg.includes("column") || msg.includes("schema cache") || profileError.code === "PGRST204") {
      // Fallback bez kolumn PIT (migracja 0010 jeszcze niezaaplikowana)
      await supabase.from("profiles").upsert({
        id: userId,
        role: "TUTOR",
        full_name: input.fullName,
        active_subjects: offerings,
        phone: input.phone?.trim() || null,
        bank_account: input.bankAccount?.trim() || null,
        olx_url: input.olxUrl?.trim() || null,
        contract_start: input.contractStart || null,
        contract_end: input.contractEnd || null,
      });
    } else {
      throw profileError;
    }
  }

  await ensureTutorRootFolder(userId, input.fullName);

  if (isDriveConfigured()) {
    try {
      await ensureTutorDriveFolder(userId, input.fullName);
    } catch (e) {
      console.error("[drive] ensureTutorDriveFolder failed on create:", e);
    }
  }

  await sendTutorWelcomeEmail(input.email, input.fullName, inviteUrl);

  revalidatePath("/admin/nauczyciele");
  return { id: userId };
}

export async function updateTutorProfile(
  tutorId: string,
  input: {
    fullName: string;
    activeSubjects: string[];
    phone?: string | null;
    bankAccount?: string | null;
    olxUrl?: string | null;
    contractStart?: string | null;
    contractEnd?: string | null;
  },
) {
  const supabase = await createClient();

  const { data: before } = await supabase
    .from("profiles")
    .select("full_name, drive_folder_id")
    .eq("id", tutorId)
    .maybeSingle();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName,
      active_subjects: normalizeTutorOfferings(input.activeSubjects),
      phone: input.phone ?? null,
      bank_account: input.bankAccount ?? null,
      olx_url: input.olxUrl ?? null,
      contract_start: input.contractStart || null,
      contract_end: input.contractEnd || null,
    })
    .eq("id", tutorId);

  if (error) throw error;

  const prevName = (before?.full_name as string | null)?.trim() ?? "";
  const nextName = input.fullName.trim();
  const folderId = before?.drive_folder_id as string | null;
  if (
    isDriveConfigured() &&
    folderId &&
    nextName &&
    prevName &&
    prevName !== nextName
  ) {
    try {
      await renameTutorDriveFolder(folderId, nextName);
    } catch (e) {
      console.error("[drive] renameTutorDriveFolder failed:", e);
    }
  }

  if (isDriveConfigured()) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const end = input.contractEnd || null;
      const former = Boolean(end && end <= today);
      await ensureTutorDriveFolder(tutorId, nextName || prevName || "Nauczyciel", { former });
    } catch (e) {
      console.error("[drive] ensureTutorDriveFolder failed on profile update:", e);
    }
  }

  bustTag(subjectsTag(tutorId));
  revalidatePath("/admin/nauczyciele");
  revalidatePath(`/admin/nauczyciele/${tutorId}`);
  revalidatePath("/terminarz");
  revalidatePath("/uczniowie");
  revalidatePath("/profil");
  revalidatePath("/");
}

export async function updateTutorContactFields(
  tutorId: string,
  input: { phone?: string | null; bankAccount?: string | null; olxUrl?: string | null },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      phone: input.phone ?? null,
      bank_account: input.bankAccount ?? null,
      olx_url: input.olxUrl ?? null,
    })
    .eq("id", tutorId);

  if (error) throw error;
  revalidatePath("/admin/nauczyciele");
}

export async function savePriceTiers(
  rows: Array<{ id?: string; label: string; client: number; worker: number; sortOrder: number }>,
) {
  const supabase = createServiceClient();

  const { data: existing } = await supabase.from("price_tiers").select("id");
  if (existing?.length) {
    await supabase.from("price_tiers").delete().in(
      "id",
      existing.map((e) => e.id),
    );
  }

  const insertRows = rows.map((r, i) => ({
    label: r.label.trim(),
    client_rate_pln: r.client,
    worker_rate_pln: r.worker,
    sort_order: r.sortOrder ?? i,
  }));

  const { error } = await supabase.from("price_tiers").insert(insertRows);
  if (error) throw error;

  bustTag(TAG.cennik);
  revalidatePath("/admin/cennik");
  revalidatePath("/finanse");
  revalidatePath("/panel");
  revalidatePath("/profil");
}

export async function archiveTutorAccount(tutorId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from("profiles")
    .select("contract_end")
    .eq("id", tutorId)
    .maybeSingle();

  // Jeśli umowa miała przyszłą datę końca - i tak kończymy dziś.
  // Zostawiamy tylko datę wcześniejszą niż dziś (odejście już w przeszłości).
  const existingEnd = existing?.contract_end as string | null | undefined;
  const contractEnd = existingEnd && existingEnd < today ? existingEnd : today;

  const { error } = await supabase
    .from("profiles")
    .update({
      contract_end: contractEnd,
      accepting_students: false,
    })
    .eq("id", tutorId);

  if (error) throw error;

  if (isDriveConfigured()) {
    try {
      const { data: tutor } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", tutorId)
        .maybeSingle();
      await moveTutorDriveFolderToFormer(
        tutorId,
        (tutor?.full_name as string | null) ?? undefined,
      );
    } catch (e) {
      console.error("[drive] moveTutorDriveFolderToFormer failed on archive:", e);
    }
  }

  // Blokada logowania - konto i historia zostają (potrzebne do PIT na koniec roku).
  try {
    const admin = createServiceClient();
    await admin.auth.admin.updateUserById(tutorId, { ban_duration: "876000h" });
  } catch {
    // Auth ban opcjonalny - archiwum profilu i tak działa
  }

  revalidatePath("/admin/nauczyciele");
  revalidatePath(`/admin/nauczyciele/${tutorId}`);
}

/**
 * Soft-end: nie kasujemy konta Auth - tylko kończymy współpracę.
 * Dane wypłat i profil zostają pod PIT-11.
 */
export async function deleteTutorAccount(tutorId: string) {
  await archiveTutorAccount(tutorId);
}

export async function updateTutorPitIdentity(
  tutorId: string,
  input: {
    pesel?: string | null;
    birthDate?: string | null;
    taxStreet?: string | null;
    taxPostalCode?: string | null;
    taxCity?: string | null;
    taxCountry?: string | null;
    taxOffice?: string | null;
    nip?: string | null;
    employmentType?: string | null;
  },
) {
  const supabase = await createClient();
  const payload = {
    pesel: input.pesel?.trim() || null,
    birth_date: input.birthDate || null,
    tax_street: input.taxStreet?.trim() || null,
    tax_postal_code: input.taxPostalCode?.trim() || null,
    tax_city: input.taxCity?.trim() || null,
    tax_country: input.taxCountry?.trim() || "Polska",
    tax_office: input.taxOffice?.trim() || null,
    nip: input.nip?.trim() || null,
    employment_type: input.employmentType || null,
  };

  const { error } = await supabase.from("profiles").update(payload).eq("id", tutorId);
  if (error) {
    const msg = `${error.message} ${error.details ?? ""}`.toLowerCase();
    if (msg.includes("column") || msg.includes("schema cache") || error.code === "PGRST204") {
      throw new Error(
        "Brak kolumn PIT w bazie. Skontaktuj się z administratorem.",
      );
    }
    throw error;
  }

  revalidatePath(`/admin/nauczyciele/${tutorId}`);
  revalidatePath("/admin/nauczyciele");
}

export async function updateTutorTaxYearEntry(
  tutorId: string,
  year: number,
  entry: {
    deductibleCostsPln: number;
    taxAdvancesPln: number;
    zusSocialPln: number;
    zusHealthPln: number;
    reliefYoung: boolean;
    notes: string;
  },
) {
  const supabase = await createClient();
  const yearKey = String(year);

  const { data: profile, error: readErr } = await supabase
    .from("profiles")
    .select("tax_year_data")
    .eq("id", tutorId)
    .maybeSingle();

  if (readErr) {
    const msg = `${readErr.message}`.toLowerCase();
    if (msg.includes("column") || msg.includes("schema cache") || readErr.code === "PGRST204") {
      throw new Error(
        "Brak kolumn PIT w bazie. Skontaktuj się z administratorem.",
      );
    }
    throw readErr;
  }

  const current = (profile?.tax_year_data ?? {}) as Record<string, unknown>;
  const next = {
    ...current,
    [yearKey]: {
      deductibleCostsPln: entry.deductibleCostsPln,
      taxAdvancesPln: entry.taxAdvancesPln,
      zusSocialPln: entry.zusSocialPln,
      zusHealthPln: entry.zusHealthPln,
      reliefYoung: entry.reliefYoung,
      notes: entry.notes,
    },
  };

  const { error } = await supabase
    .from("profiles")
    .update({ tax_year_data: next })
    .eq("id", tutorId);

  if (error) throw error;

  revalidatePath(`/admin/nauczyciele/${tutorId}`);
}

export async function approveSubjectRequest(requestId: string, subject: string, tutorId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_subjects")
    .eq("id", tutorId)
    .single();

  const current: string[] = profile?.active_subjects ?? [];
  const offering = subject.includes(" · ") ? subject : subject;
  const merged = [...new Set([...current, offering])];

  await supabase.from("subject_requests").update({ status: "APPROVED" }).eq("id", requestId);
  await supabase
    .from("profiles")
    .update({ active_subjects: normalizeTutorOfferings(merged) })
    .eq("id", tutorId);

  bustTag(subjectsTag(tutorId));
  bustTag(TAG.cennik);
  revalidatePath("/admin/cennik");
  revalidatePath("/profil");
  revalidatePath("/terminarz");
  revalidatePath("/uczniowie");
}

export async function rejectSubjectRequest(requestId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("subject_requests")
    .select("tutor_id")
    .eq("id", requestId)
    .maybeSingle();
  const { error } = await supabase
    .from("subject_requests")
    .update({ status: "REJECTED" })
    .eq("id", requestId);

  if (error) throw error;
  if (existing?.tutor_id) bustTag(subjectsTag(existing.tutor_id));
  revalidatePath("/admin/cennik");
  revalidatePath("/profil");
}

/**
 * Rewalidacja warunków zamknięcia miesiąca po stronie serwera - nie ufa checkboxom z UI.
 * Warunek 1: żadna lekcja w miesiącu nie ma statusu PLANNED/PENDING_VERIFICATION.
 * Warunek 2: wszystkie payouts za dany miesiąc mają status PAID.
 */
async function assertMonthCloseable(monthKey: string, supabase: ReturnType<typeof createServiceClient>) {
  const nextMonth = nextMonthStartIso(monthKey);

  const lessonsCheck = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .gte("date", `${monthKey}-01`)
    .lt("date", nextMonth)
    .in("status", ["PLANNED", "PENDING_VERIFICATION"]);
  if (lessonsCheck.error) throw new Error(lessonsCheck.error.message);
  if ((lessonsCheck.count ?? 0) > 0) {
    throw new Error("Warunek 1 nie jest spełniony - są lekcje ze statusem PLANNED lub PENDING_VERIFICATION.");
  }

  const payoutsCheck = await supabase
    .from("payouts")
    .select("id", { count: "exact", head: true })
    .eq("month", monthKey)
    .neq("status", "PAID");
  if (payoutsCheck.error) throw new Error(payoutsCheck.error.message);
  if ((payoutsCheck.count ?? 0) > 0) {
    throw new Error("Warunek 2 nie jest spełniony - są wypłaty, które nie mają statusu PAID.");
  }
}

export async function closeMonth(monthKey: string) {
  const adminId = await requireAdminUserId();

  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    throw new Error("Nieprawidłowy format miesiąca (oczekiwano YYYY-MM).");
  }
  if (!canCloseMonth(monthKey)) {
    throw new Error(
      "Za wcześnie na zamknięcie tego miesiąca - sprawdź DATES.monthClose.earliestDayOfNextMonth.",
    );
  }

  const supabase = createServiceClient();
  await assertMonthCloseable(monthKey, supabase);

  const { error } = await supabase.from("closed_months").upsert(
    {
      month: monthKey,
      closed_by: adminId,
      closed_at: new Date().toISOString(),
    },
    { onConflict: "month" },
  );

  if (error) {
    const msg = error.message ?? "";
    if (
      msg.includes("closed_months") ||
      msg.includes("schema cache") ||
      error.code === "42P01" ||
      error.code === "PGRST205"
    ) {
      throw new Error(
        "Tabela closed_months nie istnieje. Uruchom migrację 0005_final_after_0004.sql w Supabase.",
      );
    }
    throw new Error(msg || "Nie udało się zamknąć miesiąca.");
  }

  revalidatePath("/admin/ksiegowosc");
  revalidatePath("/finanse");
  bustTag(TAG.finance);
  bustTag(TAG.accounting);
  bustTag(financeTag(monthKey));
  staleTag(TAG.dashboardStats);
  return { ok: true as const };
}

/**
 * Nieodwracalne przełączenie NDG → JDG.
 * Zapisuje legal_mode='JDG' oraz jdg_registration_date = dziś.
 */
export async function switchToJDG() {
  const adminId = await requireAdminUserId();
  const supabase = createServiceClient();
  const today = new Date();
  const isoDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const { data: existing } = await supabase
    .from("business_settings")
    .select("legal_mode")
    .eq("id", 1)
    .maybeSingle();

  if (existing?.legal_mode === "JDG") {
    throw new Error("Firma jest już na JDG - przełączenie jest nieodwracalne.");
  }

  const { error } = await supabase.from("business_settings").upsert(
    {
      id: 1,
      legal_mode: "JDG",
      jdg_registration_date: isoDate,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    const msg = error.message ?? "";
    if (
      msg.includes("business_settings") ||
      msg.includes("schema cache") ||
      error.code === "42P01" ||
      error.code === "PGRST205"
    ) {
      throw new Error(
        "Tabela business_settings nie istnieje. Uruchom migrację 0011_business_settings.sql w Supabase.",
      );
    }
    throw new Error(msg || "Nie udało się przełączyć na JDG.");
  }

  void adminId;
  revalidatePath("/admin/ksiegowosc");
  return { ok: true as const, jdgRegistrationDate: isoDate };
}

export async function markPayoutPaid(
  tutorId: string,
  month: string,
  amount: number,
  meta?: { lessonCount?: number; lessonsAmount?: number; bonusAmount?: number },
) {
  await assertMonthOpen(month);
  const supabase = createServiceClient();

  let lessonCount = meta?.lessonCount;
  let lessonsAmount = meta?.lessonsAmount;
  let bonusAmount = meta?.bonusAmount;

  if (lessonCount == null || lessonsAmount == null || bonusAmount == null) {
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, date, start_time, end_time, students(rate_pln)")
      .eq("tutor_id", tutorId)
      .eq("status", "VERIFIED")
      .gte("date", `${month}-01`)
      .lt("date", nextMonthStartIso(month));

    const rows = lessons ?? [];
    lessonCount = lessonCount ?? rows.length;
    const clientTotal = rows.reduce((sum, row) => {
      const student = Array.isArray(row.students) ? row.students[0] : row.students;
      return sum + Number((student as { rate_pln?: number } | null)?.rate_pln ?? 0);
    }, 0);
    lessonsAmount = lessonsAmount ?? Math.round(clientTotal * TUTOR_SHARE * 100) / 100;
    const hoursDone =
      Math.round(
        (rows.reduce((sum, row) => {
          const start = String(row.start_time ?? "00:00").slice(0, 5);
          const end = String(row.end_time ?? "00:00").slice(0, 5);
          const [sh, sm] = start.split(":").map(Number);
          const [eh, em] = end.split(":").map(Number);
          return sum + ((eh! * 60 + em!) - (sh! * 60 + sm!));
        }, 0) /
          60) *
          10,
      ) / 10;
    const progress = bonusProgress(hoursDone);
    bonusAmount = bonusAmount ?? (progress.achieved ? progress.bonusPln : 0);
  }

  const resolvedBonus = bonusAmount ?? 0;
  const resolvedLessons = lessonsAmount ?? Math.round((amount - resolvedBonus) * 100) / 100;

  const fullRow = {
    tutor_id: tutorId,
    month,
    amount,
    status: "PAID" as const,
    lessons_amount: resolvedLessons,
    bonus_amount: resolvedBonus,
    lesson_count: lessonCount,
  };

  let { error } = await supabase.from("payouts").upsert(fullRow, { onConflict: "tutor_id,month" });

  if (
    error &&
    (error.message?.includes("lessons_amount") ||
      error.message?.includes("bonus_amount") ||
      error.message?.includes("lesson_count") ||
      error.code === "PGRST204")
  ) {
    const fallback = await supabase.from("payouts").upsert(
      { tutor_id: tutorId, month, amount, status: "PAID" },
      { onConflict: "tutor_id,month" },
    );
    error = fallback.error;
  }

  if (error) throw error;

  const { data: user } = await supabase.auth.admin.getUserById(tutorId);
  if (user.user?.email) {
    await sendPayoutConfirmationEmail(user.user.email, month, amount);
  }

  revalidatePath("/admin/wyplaty");
  bustTag(payoutsTag(month));
  bustTag(financeTag(month));
}

export async function unmarkPayoutPaid(tutorId: string, month: string) {
  await assertMonthOpen(month);
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("payouts")
    .delete()
    .eq("tutor_id", tutorId)
    .eq("month", month);

  if (error) throw error;

  revalidatePath("/admin/wyplaty");
  revalidatePath("/admin/ksiegowosc");
  revalidatePath("/finanse");
  bustTag(payoutsTag(month));
  bustTag(financeTag(month));
}

function nextMonthStartIso(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y!, m!, 1); // month key is 1-based; Date ctor month is 0-based → m is next month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

async function requireAdminUserId(): Promise<string> {
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
  return user.id;
}

export async function adminVerifyLesson(
  lessonId: string,
  paymentReceivedAt: string,
  paymentMethod?: string,
) {
  await requireAdminUserId();
  // Service role - omija edge-case RLS (update 0 wierszy bez błędu)
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("lessons")
    .select("date, tutor_id, student_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (existing?.date) await assertMonthOpen(monthKeyFromDate(existing.date));

  let { data, error } = await supabase
    .from("lessons")
    .update({
      status: "VERIFIED",
      payment_received_at: paymentReceivedAt,
      payment_method: paymentMethod ?? null,
    })
    .eq("id", lessonId)
    .select("id")
    .maybeSingle();

  if (error?.message?.includes("payment_method") || error?.code === "PGRST204") {
    const fallback = await supabase
      .from("lessons")
      .update({ status: "VERIFIED", payment_received_at: paymentReceivedAt })
      .eq("id", lessonId)
      .select("id")
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error?.message?.includes("payment_received_at") || error?.code === "PGRST204") {
    const fallback = await supabase
      .from("lessons")
      .update({ status: "VERIFIED" })
      .eq("id", lessonId)
      .select("id")
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Nie znaleziono lekcji do zatwierdzenia.");

  if (existing?.student_id) {
    const { syncUnpaidStreakAlert } = await import("@/lib/actions/alerts");
    await syncUnpaidStreakAlert(existing.student_id);
  }

  if (existing?.tutor_id) {
    bustLessonAndBonus(existing.tutor_id, existing.date ? monthKeyFromDate(existing.date) : undefined);
  }
  staleTag(TAG.dashboardStats);
  revalidatePath("/admin/rozliczenia");
  revalidatePath("/admin/ksiegowosc");
  revalidatePath("/admin/wyplaty");
  revalidatePath("/finanse");
  revalidatePath("/terminarz");
  revalidatePath("/panel");
}

export async function adminRejectLessonPayment(lessonId: string) {
  await requireAdminUserId();
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("lessons")
    .select("date, tutor_id, student_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (existing?.date) await assertMonthOpen(monthKeyFromDate(existing.date));

  let { data, error } = await supabase
    .from("lessons")
    .update({ status: "UNPAID", payment_received_at: null })
    .eq("id", lessonId)
    .select("id")
    .maybeSingle();

  if (error?.message?.includes("payment_received_at") || error?.code === "PGRST204") {
    const fallback = await supabase
      .from("lessons")
      .update({ status: "UNPAID" })
      .eq("id", lessonId)
      .select("id")
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Nie znaleziono lekcji.");

  if (existing?.student_id) {
    const { syncUnpaidStreakAlert } = await import("@/lib/actions/alerts");
    await syncUnpaidStreakAlert(existing.student_id);
  }

  if (existing?.tutor_id) {
    bustLessonAndBonus(existing.tutor_id, existing.date ? monthKeyFromDate(existing.date) : undefined);
  }
  staleTag(TAG.dashboardStats);
  revalidatePath("/admin/rozliczenia");
  revalidatePath("/terminarz");
  revalidatePath("/panel");
}

export type OperatingExpenseInput = {
  month: string;
  invoiceDate: string;
  documentNumber: string;
  expenseName: string;
  issuerName: string;
  amountPln: number;
};

const MAX_EXPENSE_ATTACHMENT_BYTES = 12 * 1024 * 1024;

function sanitizeExpenseFileName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

export async function createOperatingExpense(formData: FormData) {
  const adminId = await requireAdminUserId();

  const month = String(formData.get("month") ?? "");
  const invoiceDate = String(formData.get("invoiceDate") ?? "");
  const documentNumber = String(formData.get("documentNumber") ?? "");
  const expenseName = String(formData.get("expenseName") ?? "");
  const issuerName = String(formData.get("issuerName") ?? "");
  const amountRaw = String(formData.get("amountPln") ?? "").replace(",", ".");
  const amountPln = Number(amountRaw);

  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("Nieprawidłowy format miesiąca (oczekiwano YYYY-MM).");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate)) {
    throw new Error("Nieprawidłowa data rachunku/faktury.");
  }
  if (!expenseName.trim()) throw new Error("Podaj nazwę wydatku.");
  if (!issuerName.trim()) throw new Error("Podaj dane wystawcy.");
  if (!(amountPln >= 0) || Number.isNaN(amountPln)) {
    throw new Error("Nieprawidłowa kwota.");
  }
  await assertMonthOpen(month);

  const file = formData.get("file");
  let attachmentName: string | null = null;
  let attachmentPath: string | null = null;
  let attachmentMime: string | null = null;
  let attachmentSize: number | null = null;

  const supabase = createServiceClient();

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_EXPENSE_ATTACHMENT_BYTES) {
      throw new Error("Załącznik jest za duży (max 12 MB).");
    }
    const safeName = sanitizeExpenseFileName(file.name || "zalacznik");
    const unique = crypto.randomUUID();
    attachmentPath = `expenses/${month}/${unique}-${safeName}`;
    attachmentName = safeName;
    attachmentMime = file.type || "application/octet-stream";
    attachmentSize = file.size;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from("documents").upload(attachmentPath, buffer, {
      contentType: attachmentMime,
      upsert: false,
    });
    if (uploadError) {
      throw new Error(uploadError.message || "Nie udało się wgrać załącznika.");
    }
  }

  const insertBase = {
    month,
    invoice_date: invoiceDate,
    document_number: documentNumber.trim(),
    expense_name: expenseName.trim(),
    issuer_name: issuerName.trim(),
    amount_pln: Math.round(amountPln * 100) / 100,
    created_by: adminId,
  };

  const insertRow = attachmentPath
    ? {
        ...insertBase,
        attachment_name: attachmentName,
        attachment_path: attachmentPath,
        attachment_mime: attachmentMime,
        attachment_size_bytes: attachmentSize,
      }
    : insertBase;

  let { data, error } = await supabase.from("operating_expenses").insert(insertRow).select("*").single();

  if (
    error &&
    !attachmentPath &&
    (error.message?.includes("attachment_") || error.code === "PGRST204")
  ) {
    const fallback = await supabase.from("operating_expenses").insert(insertBase).select("*").single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    if (attachmentPath) {
      await supabase.storage.from("documents").remove([attachmentPath]);
    }
    const msg = error.message ?? "";
    if (msg.includes("attachment_") || error.code === "PGRST204") {
      throw new Error(
        "Załączniki / koszty wymagają migracji 0005_final_after_0004.sql w Supabase.",
      );
    }
    if (msg.includes("operating_expenses") || error.code === "42P01" || error.code === "PGRST205") {
      throw new Error(
        "Tabela operating_expenses nie istnieje. Uruchom migrację 0005_final_after_0004.sql w Supabase.",
      );
    }
    throw new Error(msg || "Nie udało się dodać wydatku.");
  }

  revalidatePath("/admin/ksiegowosc");
  bustTag(TAG.accounting);
  return data;
}

export async function deleteOperatingExpense(id: string) {
  await requireAdminUserId();
  if (!id) throw new Error("Brak identyfikatora wydatku.");

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("operating_expenses")
    .select("attachment_path, month")
    .eq("id", id)
    .maybeSingle();

  if (row?.month) await assertMonthOpen(row.month);

  const { error } = await supabase.from("operating_expenses").delete().eq("id", id);

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("operating_expenses") || error.code === "42P01" || error.code === "PGRST205") {
      throw new Error(
        "Tabela operating_expenses nie istnieje. Uruchom migrację 0005_final_after_0004.sql w Supabase.",
      );
    }
    throw new Error(msg || "Nie udało się usunąć wydatku.");
  }

  const path = (row as { attachment_path?: string | null } | null)?.attachment_path;
  if (path) {
    await supabase.storage.from("documents").remove([path]);
  }

  revalidatePath("/admin/ksiegowosc");
  bustTag(TAG.accounting);
}
