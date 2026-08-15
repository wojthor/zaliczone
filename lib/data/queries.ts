import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  dbLessonToFinanceLine,
  dbLessonToUi,
  dbStudentToUi,
  nextLessonLabelForStudent,
} from "@/lib/data/mappers";
import type {
  AdminTutorSummary,
  DbLesson,
  DbLessonWithRelations,
  DbStudent,
  DocumentFile,
  DocumentFolder,
  DocumentTreeResult,
  FinanceLineUi,
  LessonStatus,
  OperatingExpense,
  Payout,
  Profile,
  StudentUi,
  SubjectRequest,
  BusinessSettings,
} from "@/lib/types/database";
import type { CompanySalesMonth, PriceTier } from "@/lib/types/messages";
import type {
  TutorPitYearSummary,
  TutorTaxYearEntry,
  TutorYearPayoutRow,
} from "@/lib/types/pit";
import { EMPTY_TAX_YEAR } from "@/lib/types/pit";
import type { Lesson } from "@/components/dashboard/lesson-data";

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data as Profile | null;
}

export async function getTutorStudents(tutorId: string): Promise<StudentUi[]> {
  const supabase = await createClient();
  const { data: students, error } = await supabase
    .from("students")
    .select("*")
    .eq("tutor_id", tutorId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = (students ?? []) as DbStudent[];

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, student_id, date, start_time, subject, status")
    .eq("tutor_id", tutorId);

  return rows.map((student) =>
    dbStudentToUi(student, nextLessonLabelForStudent(student.id, (lessons ?? []) as DbLesson[])),
  );
}

export async function getTutorLessons(tutorId: string): Promise<Lesson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("*, students(name, class_level)")
    .eq("tutor_id", tutorId)
    .order("date")
    .order("start_time");

  if (error) throw error;

  return ((data ?? []) as Array<DbLesson & { students: Pick<DbStudent, "name" | "class_level"> | null }>)
    .filter((row) => row.students)
    .map((row) => dbLessonToUi(row, row.students!));
}

export async function getTutorVerifiedFinanceLines(tutorId: string): Promise<FinanceLineUi[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("*, students(name, class_level, rate_pln), profiles!lessons_tutor_id_fkey(full_name)")
    .eq("tutor_id", tutorId)
    .eq("status", "VERIFIED")
    .order("date", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as DbLessonWithRelations[])
    .map(dbLessonToFinanceLine)
    .filter((line): line is FinanceLineUi => line !== null);
}

export async function getLessonsByStatus(statuses: LessonStatus[]): Promise<FinanceLineUi[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lessons")
    .select("*, students(name, class_level, rate_pln), profiles!lessons_tutor_id_fkey(full_name)")
    .in("status", statuses)
    .order("date", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as DbLessonWithRelations[])
    .map(dbLessonToFinanceLine)
    .filter((line): line is FinanceLineUi => line !== null);
}

export async function getAllVerifiedFinanceLines(): Promise<FinanceLineUi[]> {
  return getLessonsByStatus(["VERIFIED"]);
}

export async function getPendingVerificationLines(): Promise<FinanceLineUi[]> {
  return getLessonsByStatus(["PENDING_VERIFICATION"]);
}

export async function getUnpaidFinanceLines(): Promise<FinanceLineUi[]> {
  return getLessonsByStatus(["UNPAID"]);
}

export async function getPendingAndUnpaidLines(): Promise<FinanceLineUi[]> {
  return getLessonsByStatus(["PENDING_VERIFICATION", "UNPAID"]);
}

/** Wszystkie lekcje niezależnie od statusu — używane do walidacji zamknięcia miesiąca. */
export async function getAllLessonLines(): Promise<FinanceLineUi[]> {
  return getLessonsByStatus(["PLANNED", "PENDING_VERIFICATION", "VERIFIED", "UNPAID"]);
}

async function getTutorEmailMap(): Promise<Map<string, string>> {
  const supabase = createServiceClient();
  const { data } = await supabase.auth.admin.listUsers();
  const map = new Map<string, string>();
  for (const user of data?.users ?? []) {
    if (user.id && user.email) map.set(user.id, user.email);
  }
  return map;
}

function formatMonthLongPl(monthKey: string): string {
  const [ys, ms] = monthKey.split("-");
  const d = new Date(Number(ys), Number(ms) - 1, 15);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

export async function getAllTutorProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "TUTOR")
    .order("full_name");

  if (error) throw error;
  return (data ?? []) as Profile[];
}

/** Publiczna lista nauczycieli przyjmujących uczniów (landing). */
export type PublicTutorCard = {
  id: string;
  name: string;
  subjects: string[];
  phone: string | null;
  email: string | null;
  olxUrl: string | null;
  photoUrl: string | null;
  initials: string;
};

export async function getPublicTutorCards(): Promise<PublicTutorCard[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, active_subjects, phone, olx_url, photo_url, accepting_students, contract_end",
    )
    .eq("role", "TUTOR");

  let rows = data;
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("photo_url") || error.code === "PGRST204") {
      const retry = await supabase
        .from("profiles")
        .select("id, full_name, active_subjects, phone, olx_url, accepting_students, contract_end")
        .eq("role", "TUTOR");
      if (retry.error) {
        console.error("[getPublicTutorCards]", retry.error.message);
        return [];
      }
      rows = retry.data;
    } else {
      console.error("[getPublicTutorCards]", error.message);
      return [];
    }
  }

  const emailMap = await getTutorEmailMap();
  const today = new Date().toISOString().slice(0, 10);
  return (rows ?? [])
    .filter((row) => {
      const former = Boolean(row.contract_end && String(row.contract_end) <= today);
      const accepting = row.accepting_students !== false;
      return !former && accepting;
    })
    .map((row) => {
      const name = (row.full_name as string | null)?.trim() || "Korepetytor";
      const initials =
        name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase() ?? "")
          .join("") || "?";
      return {
        id: row.id as string,
        name,
        subjects: (row.active_subjects as string[] | null) ?? [],
        phone: (row.phone as string | null) ?? null,
        email: emailMap.get(row.id as string) ?? null,
        olxUrl: (row.olx_url as string | null) ?? null,
        photoUrl: ((row as { photo_url?: string | null }).photo_url as string | null) ?? null,
        initials,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pl"));
}

export async function getAdminTutorSummaries(monthKey?: string): Promise<AdminTutorSummary[]> {
  const supabase = await createClient();
  const tutors = await getAllTutorProfiles();
  const financeLines = await getAllVerifiedFinanceLines();
  const pendingLines = await getPendingAndUnpaidLines();
  const emailMap = await getTutorEmailMap();

  const now = new Date();
  const mk = monthKey ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const { data: studentCounts } = await supabase.from("students").select("tutor_id");
  const studentsByTutor = new Map<string, number>();
  for (const row of studentCounts ?? []) {
    studentsByTutor.set(row.tutor_id, (studentsByTutor.get(row.tutor_id) ?? 0) + 1);
  }

  const { data: allSubjects } = await supabase.from("students").select("tutor_id, subjects");
  const subjectsByTutor = new Map<string, Set<string>>();
  for (const row of allSubjects ?? []) {
    const set = subjectsByTutor.get(row.tutor_id) ?? new Set<string>();
    for (const subject of row.subjects ?? []) set.add(subject);
    subjectsByTutor.set(row.tutor_id, set);
  }

  const { data: payouts } = await supabase.from("payouts").select("*").eq("month", mk);
  const payoutByTutor = new Map<string, Payout>();
  for (const p of (payouts ?? []) as Payout[]) {
    payoutByTutor.set(p.tutor_id, p);
  }

  return tutors.map((tutor) => {
    const verified = financeLines.filter((line) => line.tutorId === tutor.id);
    const pending = pendingLines.filter((line) => line.tutorId === tutor.id);
    const linesThisMonth = verified.filter((line) => line.monthKey === mk);
    const pendingPln = pending.reduce((sum, line) => sum + line.amountPln, 0);
    const paidPln = verified.reduce((sum, line) => sum + line.amountPln, 0);
    const payout = payoutByTutor.get(tutor.id);

    const minutesThisMonth = linesThisMonth.reduce((sum, line) => {
      const match = line.label.match(/(\d+)\s*min/);
      return sum + (match ? Number(match[1]) : 60);
    }, 0);
    const hoursDoneMonth = Math.round((minutesThisMonth / 60) * 10) / 10;

    const subjectSet = new Set<string>([
      ...(subjectsByTutor.get(tutor.id) ?? []),
      ...(tutor.active_subjects ?? []),
    ]);

    return {
      id: tutor.id,
      name: tutor.full_name ?? "Nieznany",
      email: emailMap.get(tutor.id) ?? "",
      phone: tutor.phone ?? null,
      bankAccount: tutor.bank_account ?? null,
      olxUrl: tutor.olx_url ?? null,
      contractStart: tutor.contract_start ?? null,
      contractEnd: tutor.contract_end ?? null,
      students: studentsByTutor.get(tutor.id) ?? 0,
      lessonsDoneMonth: linesThisMonth.length,
      hoursDoneMonth,
      pendingPln,
      paidPln,
      subjects: [...subjectSet],
      ewidencjaUnlockedForMonth: tutor.ewidencja_unlocked_for_month,
      payoutStatusForMonth: payout?.status ?? null,
      acceptingStudents: tutor.accepting_students !== false,
      pesel: tutor.pesel ?? null,
      birthDate: tutor.birth_date ?? null,
      taxStreet: tutor.tax_street ?? null,
      taxPostalCode: tutor.tax_postal_code ?? null,
      taxCity: tutor.tax_city ?? null,
      taxCountry: tutor.tax_country ?? null,
      nip: tutor.nip ?? null,
      taxOffice: tutor.tax_office ?? null,
      employmentType: tutor.employment_type ?? null,
      taxYearData: (tutor.tax_year_data as Record<string, unknown> | null) ?? null,
      driveFolderId: tutor.drive_folder_id ?? null,
      photoUrl: tutor.photo_url ?? null,
    };
  });
}

export async function getStudentCountForTutor(tutorId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("tutor_id", tutorId);

  if (error) throw error;
  return count ?? 0;
}

export async function getSubjectRequests(status?: "PENDING" | "APPROVED" | "REJECTED"): Promise<SubjectRequest[]> {
  const supabase = await createClient();
  let query = supabase
    .from("subject_requests")
    .select("*, profiles(full_name)")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SubjectRequest[];
}

export async function getTutorSubjectRequests(tutorId: string): Promise<SubjectRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subject_requests")
    .select("*")
    .eq("tutor_id", tutorId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SubjectRequest[];
}

export async function getPayoutsForMonth(month: string): Promise<Payout[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payouts")
    .select("*, profiles(full_name)")
    .eq("month", month);

  if (error) throw error;
  return (data ?? []) as Payout[];
}

export async function getAllPayouts(): Promise<Payout[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payouts")
    .select("*, profiles(full_name)")
    .order("month", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Payout[];
}

export async function getTutorPayouts(tutorId: string): Promise<Payout[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payouts")
    .select("*")
    .eq("tutor_id", tutorId)
    .order("month", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Payout[];
}

export async function isMonthClosed(monthKey: string): Promise<boolean> {
  const closed = await getClosedMonths();
  return closed.includes(monthKey);
}

export async function getClosedMonths(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("closed_months").select("month").order("month", {
    ascending: false,
  });

  if (error) {
    const msg = error.message ?? "";
    // Tabela może nie istnieć przed migracją 0005 — nie blokuj UI
    if (
      msg.includes("closed_months") ||
      msg.includes("schema cache") ||
      error.code === "42P01" ||
      error.code === "PGRST205"
    ) {
      return [];
    }
    throw error;
  }
  return (data ?? []).map((row) => row.month as string);
}

/** Singleton trybu prawnego — fail-open → NDG gdy tabela nie istnieje / błąd odczytu. */
export async function getBusinessSettings(): Promise<BusinessSettings> {
  const fallback: BusinessSettings = { legalMode: "NDG", jdgRegistrationDate: null };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("business_settings")
      .select("legal_mode, jdg_registration_date")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      const msg = error.message ?? "";
      if (
        msg.includes("business_settings") ||
        msg.includes("schema cache") ||
        error.code === "42P01" ||
        error.code === "PGRST205"
      ) {
        return fallback;
      }
      return fallback;
    }
    if (!data) return fallback;
    const mode = data.legal_mode === "JDG" ? "JDG" : "NDG";
    return {
      legalMode: mode,
      jdgRegistrationDate: data.jdg_registration_date ? String(data.jdg_registration_date) : null,
    };
  } catch {
    return fallback;
  }
}

export async function getAllOperatingExpenses(): Promise<OperatingExpense[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("operating_expenses")
    .select("*")
    .order("invoice_date", { ascending: true });

  if (error) {
    const msg = error.message ?? "";
    if (
      msg.includes("operating_expenses") ||
      msg.includes("schema cache") ||
      error.code === "42P01" ||
      error.code === "PGRST205"
    ) {
      return [];
    }
    throw error;
  }
  return (data ?? []) as OperatingExpense[];
}

export async function getTutorVerifiedLessonsForMonth(
  tutorId: string,
  monthKey: string,
): Promise<FinanceLineUi[]> {
  const lines = await getTutorVerifiedFinanceLines(tutorId);
  return lines.filter((l) => l.monthKey === monthKey);
}

export async function getPriceTiers(): Promise<PriceTier[]> {
  // Cennik jest konfiguracją publiczną dla zalogowanych — service role omija RLS,
  // które w praktyce blokowało odczyt tutorom (pusta lista → złe wyliczenie wypłaty).
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("price_tiers")
    .select("*")
    .order("sort_order");

  if (error) throw error;
  return (data ?? []) as PriceTier[];
}

export async function getCompanySalesMonths(): Promise<CompanySalesMonth[]> {
  const lines = await getAllVerifiedFinanceLines();
  const map = new Map<string, { count: number; total: number }>();
  for (const line of lines) {
    const prev = map.get(line.monthKey) ?? { count: 0, total: 0 };
    prev.count += 1;
    prev.total += line.amountPln;
    map.set(line.monthKey, prev);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, stats]) => ({
      monthKey,
      monthLabel: formatMonthLongPl(monthKey),
      lessonCount: stats.count,
      totalPln: stats.total,
    }));
}

/** Uczniowie danego tutora — widok admina (profil nauczyciela). */
export async function getTutorStudentsForAdmin(tutorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("id, name, class_level, subjects, rate_pln")
    .eq("tutor_id", tutorId)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

const DOCS_MIGRATION_HINT =
  "Brak tabel dokumentów lub bucketa Storage. Uruchom migrację supabase/migrations/0005_final_after_0004.sql w Supabase.";

function isMissingDocsSchema(error: { message?: string; code?: string; details?: string } | null): boolean {
  if (!error) return false;
  const msg = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    msg.includes("document_folders") ||
    msg.includes("document_files") ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

/** Drzewo dokumentów dysku (foldery + pliki). Graceful gdy migracja 0005 nie jest uruchomiona. */
export async function getDocumentTree(): Promise<DocumentTreeResult> {
  const supabase = await createClient();

  const foldersRes = await supabase.from("document_folders").select("*").order("name");
  if (foldersRes.error) {
    if (isMissingDocsSchema(foldersRes.error)) {
      return { folders: [], files: [], available: false, errorMessage: DOCS_MIGRATION_HINT };
    }
    throw foldersRes.error;
  }

  const filesRes = await supabase.from("document_files").select("*").order("name");
  if (filesRes.error) {
    if (isMissingDocsSchema(filesRes.error)) {
      return { folders: [], files: [], available: false, errorMessage: DOCS_MIGRATION_HINT };
    }
    throw filesRes.error;
  }

  return {
    folders: (foldersRes.data ?? []) as DocumentFolder[],
    files: (filesRes.data ?? []) as DocumentFile[],
    available: true,
  };
}

/** Pliki przypisane do korepetytora (scope TUTOR). */
export async function getTutorDocumentFiles(tutorId: string): Promise<DocumentTreeResult> {
  const supabase = await createClient();

  const foldersRes = await supabase
    .from("document_folders")
    .select("*")
    .eq("scope", "TUTOR")
    .eq("tutor_id", tutorId)
    .order("name");

  if (foldersRes.error) {
    if (isMissingDocsSchema(foldersRes.error)) {
      return { folders: [], files: [], available: false, errorMessage: DOCS_MIGRATION_HINT };
    }
    throw foldersRes.error;
  }

  const filesRes = await supabase
    .from("document_files")
    .select("*")
    .eq("scope", "TUTOR")
    .eq("tutor_id", tutorId)
    .order("created_at", { ascending: false });

  if (filesRes.error) {
    if (isMissingDocsSchema(filesRes.error)) {
      return { folders: [], files: [], available: false, errorMessage: DOCS_MIGRATION_HINT };
    }
    throw filesRes.error;
  }

  return {
    folders: (foldersRes.data ?? []) as DocumentFolder[],
    files: (filesRes.data ?? []) as DocumentFile[],
    available: true,
  };
}

/** @deprecated use getTutorVerifiedFinanceLines */
export async function getTutorCompletedFinanceLines(tutorId: string) {
  return getTutorVerifiedFinanceLines(tutorId);
}

/** @deprecated use getAllVerifiedFinanceLines */
export async function getAllCompletedFinanceLines() {
  return getAllVerifiedFinanceLines();
}

function parseTaxYearEntry(raw: unknown): TutorTaxYearEntry {
  if (!raw || typeof raw !== "object") return { ...EMPTY_TAX_YEAR };
  const o = raw as Record<string, unknown>;
  return {
    deductibleCostsPln: Number(o.deductibleCostsPln ?? o.deductible_costs_pln ?? 0) || 0,
    taxAdvancesPln: Number(o.taxAdvancesPln ?? o.tax_advances_pln ?? 0) || 0,
    zusSocialPln: Number(o.zusSocialPln ?? o.zus_social_pln ?? 0) || 0,
    zusHealthPln: Number(o.zusHealthPln ?? o.zus_health_pln ?? 0) || 0,
    reliefYoung: Boolean(o.reliefYoung ?? o.relief_young ?? false),
    notes: String(o.notes ?? ""),
  };
}

/** Roczne podsumowanie wypłat PAID + ręczne pola podatkowe z profilu (pod PIT-11). */
export async function getTutorPitYearSummary(
  tutorId: string,
  year: number,
): Promise<TutorPitYearSummary> {
  const supabase = await createClient();
  const yearKey = String(year);

  const { data: payouts, error } = await supabase
    .from("payouts")
    .select("month, amount, lessons_amount, bonus_amount, lesson_count, status")
    .eq("tutor_id", tutorId)
    .eq("status", "PAID")
    .gte("month", `${year}-01`)
    .lte("month", `${year}-12`)
    .order("month");

  if (error) throw error;

  const months: TutorYearPayoutRow[] = (payouts ?? []).map((p) => ({
    month: String(p.month),
    amount: Number(p.amount) || 0,
    lessonsAmount: Number(p.lessons_amount) || 0,
    bonusAmount: Number(p.bonus_amount) || 0,
    lessonCount: Number(p.lesson_count) || 0,
  }));

  const paidIncomePln = Math.round(months.reduce((s, m) => s + m.amount, 0) * 100) / 100;

  let taxEntry = { ...EMPTY_TAX_YEAR };
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", tutorId)
    .maybeSingle();

  if (!profileErr && profile) {
    const map = ((profile as Profile).tax_year_data ?? {}) as Record<string, unknown>;
    taxEntry = parseTaxYearEntry(map[yearKey]);
  }

  return { year, paidIncomePln, months, taxEntry };
}
