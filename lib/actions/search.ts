"use server";

import { createServiceClient } from "@/lib/supabase/admin";
import {
  getCurrentUserProfile,
  getPendingAndUnpaidLines,
  getAllVerifiedFinanceLines,
  getTutorLessons,
  getTutorStudents,
} from "@/lib/data/queries";

export type SearchHit = {
  id: string;
  /** Główna linia - imię ucznia / nauczyciela / przedmiot. */
  title: string;
  /** Druga linia - kontekst (klasa, przedmioty, data). */
  subtitle: string;
  /** Docelowy adres po kliknięciu w wynik. */
  href: string;
};

export type WorkspaceSearchResult = {
  students: SearchHit[];
  teachers: SearchHit[];
  lessons: SearchHit[];
};

const EMPTY_RESULT: WorkspaceSearchResult = { students: [], teachers: [], lessons: [] };

const MAX_HITS = 6;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatLessonDatePl(dateIso: string | undefined): string {
  if (!dateIso) return "";
  const d = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pl-PL", { weekday: "short", day: "numeric", month: "long" }).format(d);
}

/** Same znaki - do porównywania numerów telefonu niezależnie od spacji/myślników/prefiksu. */
function onlyDigits(value: string): string {
  return value.replace(/[^\d]/g, "");
}

/** Nazwy miesięcy (dopełniacz + mianownik + skrót) po normalizacji (bez polskich znaków). */
const MONTHS_PL: Record<string, number> = {
  stycznia: 1, styczen: 1, sty: 1,
  lutego: 2, luty: 2, lut: 2,
  marca: 3, marzec: 3, mar: 3,
  kwietnia: 4, kwiecien: 4, kwi: 4,
  maja: 5, maj: 5,
  czerwca: 6, czerwiec: 6, cze: 6,
  lipca: 7, lipiec: 7, lip: 7,
  sierpnia: 8, sierpien: 8, sie: 8,
  wrzesnia: 9, wrzesien: 9, wrz: 9,
  pazdziernika: 10, pazdziernik: 10, paz: 10,
  listopada: 11, listopad: 11, lis: 11,
  grudnia: 12, grudzien: 12, gru: 12,
};

type ParsedDateQuery = { day: number; month: number; year?: number };

/** Wyłuskuje dzień/miesiąc(/rok) z fraz typu "15 sierpnia", "15 sie", "15.08", "15/08/2026". */
function parseDateQuery(needle: string): ParsedDateQuery | null {
  const numeric = needle.match(/\b(\d{1,2})[.\/-](\d{1,2})(?:[.\/-](\d{2,4}))?\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const yearRaw = numeric[3] ? Number(numeric[3]) : undefined;
      const year = yearRaw ? (yearRaw < 100 ? 2000 + yearRaw : yearRaw) : undefined;
      return { day, month, year };
    }
  }

  const monthWord = needle.match(/\b(\d{1,2})\s+([a-z]+)\.?(?:\s+(\d{4}))?\b/);
  if (monthWord) {
    const month = MONTHS_PL[monthWord[2]];
    const day = Number(monthWord[1]);
    if (month && day >= 1 && day <= 31) {
      const year = monthWord[3] ? Number(monthWord[3]) : undefined;
      return { day, month, year };
    }
  }

  return null;
}

function dateIsoMatchesQuery(dateIso: string | undefined, parsed: ParsedDateQuery | null): boolean {
  if (!parsed || !dateIso) return false;
  const [y, m, d] = dateIso.split("-").map(Number);
  if (d !== parsed.day || m !== parsed.month) return false;
  if (parsed.year && y !== parsed.year) return false;
  return true;
}

/** Globalne wyszukiwanie w sidebarze - uczniowie/nauczyciele/lekcje, w zależności od roli. */
export async function searchWorkspace(rawQuery: string): Promise<WorkspaceSearchResult> {
  const query = rawQuery.trim();
  if (query.length < 2) return EMPTY_RESULT;
  const needle = normalize(query);

  const profile = await getCurrentUserProfile();
  if (!profile) return EMPTY_RESULT;

  if (profile.role === "ADMIN") {
    return searchAdminWorkspace(needle);
  }
  return searchTutorWorkspace(profile.id, needle);
}

async function searchTutorWorkspace(tutorId: string, needle: string): Promise<WorkspaceSearchResult> {
  const [students, lessons] = await Promise.all([getTutorStudents(tutorId), getTutorLessons(tutorId)]);

  const needleDigits = onlyDigits(needle);
  const dateQuery = parseDateQuery(needle);

  const studentHits: SearchHit[] = students
    .filter(
      (s) =>
        normalize(s.name).includes(needle) ||
        (needleDigits.length >= 3 && s.phone !== "-" && onlyDigits(s.phone).includes(needleDigits)),
    )
    .slice(0, MAX_HITS)
    .map((s) => ({
      id: s.id,
      title: s.name,
      subtitle: s.classLabel || s.subjectsLine || "Uczeń",
      href: `/uczniowie?student=${s.id}`,
    }));

  // Dopasowanie po przedmiocie albo po dacie - wyszukanie ucznia po imieniu ma dać
  // jeden wynik (link do profilu w /uczniowie), nie zalewać listą jego lekcji.
  // Historię lekcji danego ucznia otwiera się z jego kafelka (przycisk „Lekcje”).
  const lessonHits: SearchHit[] = lessons
    .filter((l) => normalize(l.subject).includes(needle) || dateIsoMatchesQuery(l.date, dateQuery))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, MAX_HITS)
    .map((l) => ({
      id: l.id,
      title: `${l.subject} · ${l.studentName}`,
      subtitle: formatLessonDatePl(l.date) || "Bez daty",
      href: `/terminarz?lesson=${l.id}`,
    }));

  return { students: studentHits, teachers: [], lessons: lessonHits };
}

async function searchAdminWorkspace(needle: string): Promise<WorkspaceSearchResult> {
  const supabase = createServiceClient();
  const [{ data: teacherRows }, pendingUnpaid, verified] = await Promise.all([
    supabase.from("profiles").select("id, full_name, active_subjects").eq("role", "TUTOR"),
    getPendingAndUnpaidLines(),
    getAllVerifiedFinanceLines(),
  ]);

  const teacherHits: SearchHit[] = (teacherRows ?? [])
    .filter((t) => normalize((t.full_name as string | null) ?? "").includes(needle))
    .slice(0, MAX_HITS)
    .map((t) => ({
      id: t.id as string,
      title: (t.full_name as string | null)?.trim() || "Nauczyciel",
      subtitle: ((t.active_subjects as string[] | null) ?? []).join(", ") || "Nauczyciel",
      href: `/admin/nauczyciele/${t.id}`,
    }));

  const dateQuery = parseDateQuery(needle);

  const lessonHits: SearchHit[] = [...pendingUnpaid, ...verified]
    .filter(
      (l) =>
        normalize(l.studentName).includes(needle) ||
        normalize(l.tutorName ?? "").includes(needle) ||
        dateIsoMatchesQuery(l.dateIso, dateQuery),
    )
    .sort((a, b) => (b.dateIso ?? "").localeCompare(a.dateIso ?? ""))
    .slice(0, MAX_HITS)
    .map((l) => ({
      id: l.id,
      title: `${l.label} · ${l.studentName}`,
      subtitle: `${l.tutorName ?? ""} · ${l.date}`.trim(),
      href: `/admin/rozliczenia?q=${encodeURIComponent(l.studentName)}&date=${l.dateIso}`,
    }));

  return { students: [], teachers: teacherHits, lessons: lessonHits };
}
