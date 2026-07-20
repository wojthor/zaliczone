"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  sendCennikUpdateEmail,
  sendEwidencjaRequestEmail,
  sendPayoutConfirmationEmail,
  sendTutorWelcomeEmail,
} from "@/lib/emails/send";
import { createInAppMessages } from "@/lib/actions/messages";
import { ensureTutorRootFolder } from "@/lib/actions/documents";
import { MESSAGE_TEMPLATES } from "@/lib/message-templates";
import { TUTOR_SHARE, bonusProgress, canCloseMonth } from "@/lib/dates";

export async function createTutorAccount(input: {
  email: string;
  fullName: string;
  tempPassword: string;
  activeSubjects?: string[];
}) {
  const supabase = createServiceClient();

  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = list?.users.find((u) => u.email === input.email);
  if (existing) {
    throw new Error("Ten adres e-mail jest już zajęty.");
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.tempPassword,
    email_confirm: true,
    user_metadata: { role: "TUTOR", full_name: input.fullName },
  });

  if (error || !data.user) throw error ?? new Error("Nie udało się utworzyć użytkownika.");

  await supabase.from("profiles").upsert({
    id: data.user.id,
    role: "TUTOR",
    full_name: input.fullName,
    active_subjects: input.activeSubjects ?? [],
  });

  await ensureTutorRootFolder(data.user.id, input.fullName);

  await sendTutorWelcomeEmail(input.email, input.tempPassword);

  revalidatePath("/admin/nauczyciele");
  revalidatePath("/admin/dokumenty");
  return { id: data.user.id };
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
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName,
      active_subjects: input.activeSubjects,
      phone: input.phone ?? null,
      bank_account: input.bankAccount ?? null,
      olx_url: input.olxUrl ?? null,
      contract_start: input.contractStart || null,
      contract_end: input.contractEnd || null,
    })
    .eq("id", tutorId);

  if (error) throw error;
  revalidatePath("/admin/nauczyciele");
  revalidatePath(`/admin/nauczyciele/${tutorId}`);
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

  revalidatePath("/admin/cennik");
  revalidatePath("/profil");
}

export async function archiveTutorAccount(tutorId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("profiles")
    .update({ contract_end: today })
    .eq("id", tutorId);

  if (error) throw error;
  revalidatePath("/admin/nauczyciele");
  revalidatePath(`/admin/nauczyciele/${tutorId}`);
}

export async function deleteTutorAccount(tutorId: string) {
  const supabase = createServiceClient();
  const { error } = await supabase.auth.admin.deleteUser(tutorId);
  if (error) throw error;
  revalidatePath("/admin/nauczyciele");
}

export async function approveSubjectRequest(requestId: string, subject: string, tutorId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("active_subjects")
    .eq("id", tutorId)
    .single();

  const current: string[] = profile?.active_subjects ?? [];
  const merged = [...new Set([...current, subject])];

  await supabase.from("subject_requests").update({ status: "APPROVED" }).eq("id", requestId);
  await supabase.from("profiles").update({ active_subjects: merged }).eq("id", tutorId);

  revalidatePath("/admin/cennik");
  revalidatePath("/profil");
}

export async function rejectSubjectRequest(requestId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("subject_requests")
    .update({ status: "REJECTED" })
    .eq("id", requestId);

  if (error) throw error;
  revalidatePath("/admin/cennik");
}

export async function requestEwidencjaForMonth(month: string) {
  const supabase = createServiceClient();
  const tutors = await supabase.from("profiles").select("id, full_name").eq("role", "TUTOR");
  const monthLabel = new Intl.DateTimeFormat("pl-PL", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number(month.split("-")[0]), Number(month.split("-")[1]) - 1, 15));

  const tutorIds: string[] = [];
  const emails: string[] = [];
  for (const tutor of tutors.data ?? []) {
    await supabase
      .from("profiles")
      .update({ ewidencja_unlocked_for_month: month })
      .eq("id", tutor.id);

    tutorIds.push(tutor.id);
    const { data: user } = await supabase.auth.admin.getUserById(tutor.id);
    if (user.user?.email) {
      emails.push(user.user.email);
      await sendEwidencjaRequestEmail(user.user.email, month);
    }
  }

  await createInAppMessages({
    title: `${MESSAGE_TEMPLATES.EWIDENCJA.title} — ${monthLabel}`,
    body: MESSAGE_TEMPLATES.EWIDENCJA.body,
    category: MESSAGE_TEMPLATES.EWIDENCJA.category,
    template: MESSAGE_TEMPLATES.EWIDENCJA.template,
    recipientIds: tutorIds,
  });

  revalidatePath("/admin/wyplaty");
  revalidatePath("/finanse");
  return { count: emails.length };
}

export type MonthCloseChecklist = {
  ewidencjaGenerated: boolean;
  pendingCleared: boolean;
  payoutsCalculated: boolean;
  pitZusNoted: boolean;
};

export async function closeMonth(monthKey: string, checklist: MonthCloseChecklist) {
  const adminId = await requireAdminUserId();

  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    throw new Error("Nieprawidłowy format miesiąca (oczekiwano YYYY-MM).");
  }
  if (!canCloseMonth(monthKey)) {
    throw new Error(
      "Za wcześnie na zamknięcie tego miesiąca — sprawdź DATES.monthClose.earliestDayOfNextMonth.",
    );
  }
  if (
    !checklist.ewidencjaGenerated ||
    !checklist.pendingCleared ||
    !checklist.payoutsCalculated ||
    !checklist.pitZusNoted
  ) {
    throw new Error("Uzupełnij całą checklistę przed zamknięciem miesiąca.");
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("closed_months").upsert(
    {
      month: monthKey,
      closed_by: adminId,
      checklist,
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
  return { ok: true as const };
}

export async function markPayoutPaid(
  tutorId: string,
  month: string,
  amount: number,
  meta?: { lessonCount?: number; lessonsAmount?: number; bonusAmount?: number },
) {
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

  await createInAppMessages({
    title: `${MESSAGE_TEMPLATES.PAYOUT.title} — ${month}`,
    body: `${MESSAGE_TEMPLATES.PAYOUT.body}\n\nKwota: ${amount.toLocaleString("pl-PL")} zł`,
    category: MESSAGE_TEMPLATES.PAYOUT.category,
    template: MESSAGE_TEMPLATES.PAYOUT.template,
    recipientIds: [tutorId],
  });

  revalidatePath("/admin/wyplaty");
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
  if (!user) throw new Error("Brak sesji — zaloguj się ponownie.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "ADMIN") throw new Error("Brak uprawnień administratora.");
  return user.id;
}

export async function adminVerifyLesson(lessonId: string, paymentReceivedAt: string) {
  await requireAdminUserId();
  // Service role — omija edge-case RLS (update 0 wierszy bez błędu)
  const supabase = createServiceClient();

  let { data, error } = await supabase
    .from("lessons")
    .update({ status: "VERIFIED", payment_received_at: paymentReceivedAt })
    .eq("id", lessonId)
    .select("id")
    .maybeSingle();

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

  revalidatePath("/admin/rozliczenia");
  revalidatePath("/admin/ksiegowosc");
  revalidatePath("/admin/wyplaty");
  revalidatePath("/finanse");
  revalidatePath("/terminarz");
}

export async function adminRejectLessonPayment(lessonId: string) {
  await requireAdminUserId();
  const supabase = createServiceClient();

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

  revalidatePath("/admin/rozliczenia");
  revalidatePath("/terminarz");
}

export async function notifyCennikUpdate() {
  const supabase = createServiceClient();
  const { data: tutors } = await supabase.from("profiles").select("id").eq("role", "TUTOR");
  const tutorIds = (tutors ?? []).map((t) => t.id);
  const emails: string[] = [];

  for (const t of tutors ?? []) {
    const { data: user } = await supabase.auth.admin.getUserById(t.id);
    if (user.user?.email) emails.push(user.user.email);
  }

  if (emails.length > 0) await sendCennikUpdateEmail(emails);

  await createInAppMessages({
    title: MESSAGE_TEMPLATES.CENNIK.title,
    body: MESSAGE_TEMPLATES.CENNIK.body,
    category: MESSAGE_TEMPLATES.CENNIK.category,
    template: MESSAGE_TEMPLATES.CENNIK.template,
    recipientIds: tutorIds,
  });

  return { count: emails.length };
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
  return data;
}

export async function deleteOperatingExpense(id: string) {
  await requireAdminUserId();
  if (!id) throw new Error("Brak identyfikatora wydatku.");

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("operating_expenses")
    .select("attachment_path")
    .eq("id", id)
    .maybeSingle();

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
}
