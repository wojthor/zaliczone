import {
  getAdminTutorSummaries,
  getAllVerifiedFinanceLines,
  getPendingVerificationLines,
  getTutorPitYearSummary,
  getTutorStudentsForAdmin,
  getUnpaidFinanceLines,
} from "@/lib/data/queries";
import { ensureTutorRootFolder } from "@/lib/actions/documents";
import { isDriveConfigured } from "@/lib/google-drive/client";
import { ensureTutorDriveFolder } from "@/lib/google-drive/tutor-folders";
import type { AdminStudentRow } from "@/lib/types/messages";
import { NauczycielProfilClient } from "./nauczyciel-profil-client";

function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function TutorDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pitYear?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const monthKey = currentMonthKey();
  const pitYear = Number(sp.pitYear) || new Date().getFullYear();

  const [tutors, verifiedLines, pendingLines, unpaidLines, students, pitYearSummary] =
    await Promise.all([
      getAdminTutorSummaries(monthKey),
      getAllVerifiedFinanceLines(),
      getPendingVerificationLines(),
      getUnpaidFinanceLines(),
      getTutorStudentsForAdmin(id) as Promise<AdminStudentRow[]>,
      getTutorPitYearSummary(id, pitYear),
    ]);

  const tutor = tutors.find((t) => t.id === id);
  if (!tutor) return <p className="text-muted">Nie znaleziono nauczyciela.</p>;

  try {
    await ensureTutorRootFolder(tutor.id, tutor.name);
  } catch {
    // Folder opcjonalny gdy migracja dokumentów nie jest jeszcze uruchomiona
  }

  if (isDriveConfigured()) {
    try {
      await ensureTutorDriveFolder(tutor.id, tutor.name);
    } catch {
      // Drive opcjonalny — admin i tak pracuje bezpośrednio na Dysku
    }
  }

  const forTutor = <T extends { tutorId: string }>(rows: T[]) => rows.filter((l) => l.tutorId === id);

  return (
    <NauczycielProfilClient
      tutor={tutor}
      students={students}
      pending={forTutor(pendingLines)}
      unpaid={forTutor(unpaidLines)}
      verified={forTutor(verifiedLines).filter((l) => l.monthKey === monthKey)}
      pitYearSummary={pitYearSummary}
    />
  );
}
