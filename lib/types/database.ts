export type UserRole = "ADMIN" | "TUTOR";

export type LessonStatus = "PLANNED" | "PENDING_VERIFICATION" | "VERIFIED" | "UNPAID";

export type SubjectRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type PayoutStatus = "PENDING_DOCS" | "PAID";

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string | null;
  active_subjects: string[];
  ewidencja_unlocked_for_month: string | null;
  phone?: string | null;
  bank_account?: string | null;
  olx_url?: string | null;
  contract_start?: string | null;
  contract_end?: string | null;
  created_at?: string;
};

export type DbStudent = {
  id: string;
  tutor_id: string;
  name: string;
  subjects: string[];
  class_level: string;
  rate_pln: number;
  created_at: string;
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
};

export type FinanceLineUi = {
  id: string;
  studentName: string;
  label: string;
  amountPln: number;
  /** dd.mm — wyświetlanie */
  date: string;
  /** YYYY-MM-DD — filtrowanie tygodni / sortowanie */
  dateIso: string;
  monthKey: string;
  status: LessonStatus;
  tutorId: string;
  tutorName: string;
  subject: string;
  /** dd.mm — data wpływu na konto */
  paymentReceivedAt: string | null;
  /** YYYY-MM-DD — do pól date w UI */
  paymentReceivedAtIso: string | null;
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
  ewidencjaUnlockedForMonth: string | null;
  payoutStatusForMonth: PayoutStatus | null;
};

export type RozliczenieRow = FinanceLineUi & {
  paymentMethod?: "Przelew" | "BLIK";
};

export type TutorDocumentMonth = {
  monthKey: string;
  monthLabel: string;
  verifiedLessonCount: number;
  ewidencjaUnlocked: boolean;
  payoutStatus: PayoutStatus | null;
};

export type TutorDocumentTree = {
  tutorId: string;
  tutorName: string;
  months: TutorDocumentMonth[];
};

export type CompanyDocumentTemplate = {
  id: string;
  title: string;
  description: string;
  category: string;
  fileName: string;
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
