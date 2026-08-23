/**
 * Uprawnienia nauczyciela: przedmiot + poziom z cennika.
 * Przechowywane w profiles.active_subjects jako napisy „Przedmiot · Poziom”.
 * Stare wpisy bez „ · ” (sam przedmiot) traktujemy jako legacy bez poziomów.
 */

export type TutorOffering = {
  subject: string;
  level: string;
};

export const OFFERING_SEP = " · ";

export function formatTutorOffering(subject: string, level: string): string {
  return `${subject.trim()}${OFFERING_SEP}${level.trim()}`;
}

export function parseTutorOffering(raw: string): TutorOffering | null {
  const text = raw.trim();
  if (!text) return null;
  const idx = text.indexOf(OFFERING_SEP);
  if (idx === -1) {
    // Legacy: sam przedmiot — bez poziomu (nie daje uprawnień do żadnego poziomu).
    return { subject: text, level: "" };
  }
  const subject = text.slice(0, idx).trim();
  const level = text.slice(idx + OFFERING_SEP.length).trim();
  if (!subject) return null;
  return { subject, level };
}

export function parseTutorOfferings(raw: string[] | null | undefined): TutorOffering[] {
  const out: TutorOffering[] = [];
  const seen = new Set<string>();
  for (const item of raw ?? []) {
    const parsed = parseTutorOffering(item);
    if (!parsed) continue;
    const key = parsed.level
      ? formatTutorOffering(parsed.subject, parsed.level)
      : parsed.subject;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(parsed);
  }
  return out;
}

/** Unikalne nazwy przedmiotów (do landingu / filtrów). */
export function subjectsFromOfferings(raw: string[] | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of parseTutorOfferings(raw)) {
    if (seen.has(o.subject)) continue;
    seen.add(o.subject);
    out.push(o.subject);
  }
  return out;
}

/** Poziomy, do których nauczyciel ma uprawnienie (opcjonalnie ograniczone do przedmiotów). */
export function levelsAllowedForSubjects(
  raw: string[] | null | undefined,
  subjects: string[],
): string[] {
  const wanted = new Set(subjects.map((s) => s.trim()).filter(Boolean));
  if (wanted.size === 0) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const o of parseTutorOfferings(raw)) {
    if (!o.level || !wanted.has(o.subject)) continue;
    if (seen.has(o.level)) continue;
    seen.add(o.level);
    out.push(o.level);
  }
  return out;
}

/** Czy nauczyciel może uczyć danego przedmiotu na danym poziomie. */
export function tutorMayTeach(
  raw: string[] | null | undefined,
  subjects: string[],
  level: string,
): boolean {
  const lvl = level.trim();
  if (!lvl || subjects.length === 0) return false;
  const offers = parseTutorOfferings(raw).filter((o) => o.level);
  if (offers.length === 0) return false;
  // Każdy wybrany przedmiot musi mieć ten poziom w uprawnieniach.
  return subjects.every((subject) =>
    offers.some((o) => o.subject === subject && o.level === lvl),
  );
}

export function formatOfferingLabel(o: TutorOffering): string {
  if (!o.level) return o.subject;
  return formatTutorOffering(o.subject, o.level);
}
