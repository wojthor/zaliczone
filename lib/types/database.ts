export type UserRole = "ADMIN" | "TUTOR";

export type LessonStatus = "PLANNED" | "PENDING_VERIFICATION" | "VERIFIED" | "UNPAID";

export type SubjectRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type PayoutStatus = "PENDING_DOCS" | "PAID";

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string | null;
  active_subjects: string[];
  /** Czy nauczyciel chce przyjmować dodatkowych uczniów */
  accepting_students?: boolean;
  phone?: string | null;
  bank_account?: string | null;
  olx_url?: string | null;
  contract_start?: string | null;
  contract_end?: string | null;
  created_at?: string;
  /** Dane do PIT-11 (migracja 0010) */
  pesel?: string | null;
  birth_date?: string | null;
  tax_street?: string | null;
  tax_postal_code?: string | null;
  tax_city?: string | null;
  tax_country?: string | null;
  tax_office?: string | null;
  nip?: string | null;
  employment_type?: string | null;
  tax_year_data?: Record<string, unknown> | null;
  /** ID folderu Google Drive nauczyciela */
  drive_folder_id?: string | null;
  /** Publiczne zdjęcie na landing (3:4) */
  photo_url?: string | null;
};

export type DbStudent = {
  id: string;
  tutor_id: string;
  name: string;
  subjects: string[];
  class_level: string;
  rate_pln: number;
  created_at: string;
  blocked?: boolean;
  blocked_at?: string | null;
  blocked_reason?: string | null;
  /** Migracja 0017 - dane kontaktowe i notatki ucznia. */
  phone?: string | null;
  email?: string | null;
  school_class?: string | null;
  notes?: string | null;
};

export type AlertKind = "UNPAID_STREAK" | "STOP_TEACHING" | "STUDENT_BLOCKED";
export type AlertAudience = "ADMIN" | "TUTOR";

export type AppAlert = {
  id: string;
  kind: AlertKind;
  audience: AlertAudience;
  tutorId: string | null;
  tutorName: string | null;
  studentId: string | null;
  studentName: string | null;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  resolvedAt: string | null;
};

export type NotificationKind = "EWIDENCJA_REQUEST" | "CENNIK_UPDATE" | "PAYOUT" | "INFO";

export type AppNotification = {
  id: string;
  audience: AlertAudience;
  tutorId: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  createdAt: string;
  readAt: string | null;
};

export type DbLesson = {
  id: string;
  tutor_id: string;
  student_id: string;
  date: string;
  start_time: string;
  end_time: string;
  subject: string;
  status: LessonStatus;
  payment_received_at?: string | null;
  payment_method?: string | null;
  /** Wspólne ID dla lekcji z jednego cyklicznego dodania */
  series_id?: string | null;
  created_at: string;
};

export type DbLessonWithRelations = DbLesson & {
  students: Pick<DbStudent, "name" | "class_level" | "rate_pln"> | null;
  profiles: Pick<Profile, "full_name"> | null;
};

export type SubjectRequest = {
  id: string;
  tutor_id: string;
  subject: string;
  status: SubjectRequestStatus;
  created_at: string;
  profiles?: Pick<Profile, "full_name"> | null;
};

export type Payout = {
  id: string;
  tutor_id: string;
  month: string;
  amount: number;
  status: PayoutStatus;
  created_at: string;
  lessons_amount?: number;
  bonus_amount?: number;
  lesson_count?: number;
  student_count?: number;
  profiles?: Pick<Profile, "full_name"> | null;
};

export type StudentUi = {
  id: string;
  name: string;
  initials: string;
  subjectsLine: string;
  phone: string;
  email: string;
  guardian: string;
  classLabel: string;
  schoolClass: string;
  notes: string;
  ratePerHourPln: number;
  nextLesson: string;
  createdAtTs: number;
  blocked: boolean;
};

export type FinanceLineUi = {
  id: string;
  studentName: string;
  /** Id ucznia - unikalne zliczanie w zestawieniach */
  studentId: string;
  /** Poziom / klasa ucznia (nabywcy) */
  classLevel: string | null;
  label: string;
  amountPln: number;
  /** Czas lekcji w minutach */
  durationMinutes: number;
  /** dd.mm - wyświetlanie */
  date: string;
  /** YYYY-MM-DD - filtrowanie tygodni / sortowanie */
  dateIso: string;
  monthKey: string;
  status: LessonStatus;
  tutorId: string;
  tutorName: string;
  subject: string;
  /** dd.mm - data wpływu na konto */
  paymentReceivedAt: string | null;
  /** YYYY-MM-DD - do pól date w UI */
  paymentReceivedAtIso: string | null;
  /** Metoda płatności - ustawiana przy zatwierdzeniu (zob. lib/payment-methods.ts) */
  paymentMethod: string | null;
};

export type AdminTutorSummary = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  bankAccount: string | null;
  olxUrl: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  students: number;
  lessonsDoneMonth: number;
  hoursDoneMonth: number;
  pendingPln: number;
  paidPln: number;
  subjects: string[];
  payoutStatusForMonth: PayoutStatus | null;
  /** Czy przyjmuje dodatkowych uczniów */
  acceptingStudents: boolean;
  /** Dane PIT (opcjonalne - po migracji 0010) */
  pesel: string | null;
  birthDate: string | null;
  taxStreet: string | null;
  taxPostalCode: string | null;
  taxCity: string | null;
  taxCountry: string | null;
  taxOffice: string | null;
  nip: string | null;
  employmentType: string | null;
  taxYearData: Record<string, unknown> | null;
  /** ID folderu Google Drive (null = nie zsynchronizowano) */
  driveFolderId: string | null;
  /** Zdjęcie na landing */
  photoUrl: string | null;
};

/** Wydatek operacyjny (faktura / rachunek) w księgowości miesięcznej */
export type OperatingExpense = {
  id: string;
  month: string;
  invoice_date: string;
  document_number: string;
  expense_name: string;
  issuer_name: string;
  amount_pln: number;
  created_at: string;
  created_by?: string | null;
  attachment_name?: string | null;
  attachment_path?: string | null;
  attachment_mime?: string | null;
  attachment_size_bytes?: number | null;
};

/** Singleton trybu prawnego działalności (NDG / JDG) */
export type LegalMode = "NDG" | "JDG";

export type BusinessSettings = {
  legalMode: LegalMode;
  jdgRegistrationDate: string | null;
};

export type DocumentFolder = {
  id: string;
  parent_id: string | null;
  name: string;
  scope: "COMPANY" | "TUTOR";
  tutor_id: string | null;
  created_at: string;
};

export type DocumentFile = {
  id: string;
  folder_id: string | null;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  scope: "COMPANY" | "TUTOR";
  tutor_id: string | null;
  created_at: string;
};

export type DocumentTreeResult = {
  folders: DocumentFolder[];
  files: DocumentFile[];
  available: boolean;
  errorMessage?: string;
};

export type CandidateStatus = "NEW" | "IN_PROGRESS" | "REJECTED" | "HIRED";

export type RequiredTest = {
  subject: string;
  level: string;
};

/** Wyniki: { "Biologia": { score: "18/20", level: "Matura" } } */
export type CandidateTestResultEntry = {
  score: string;
  level: string;
};

export type CandidateTestResults = Record<string, CandidateTestResultEntry | string>;

export type Candidate = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  dob: string | null;
  student_status: boolean;
  university: string | null;
  experience: boolean;
  required_tests: RequiredTest[];
  levels: string | null;
  hours_per_week: string | null;
  cv_url: string | null;
  tests_expected: number;
  tests_completed: number;
  test_results: CandidateTestResults;
  test_sent_manually: boolean;
  status: CandidateStatus;
  created_at: string;
};

