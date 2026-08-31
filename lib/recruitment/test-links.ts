/** Poziomy jak w cenniku / formularzu rekrutacyjnym. */
export const RECRUITMENT_LEVELS = [
  "Szkoła podstawowa",
  "Szkoła średnia - poziom podstawowy",
  "Szkoła średnia - poziom rozszerzony",
  "Matura - poziom podstawowy",
  "Matura - poziom rozszerzony",
] as const;

/** Im wyższy rank, tym wyższy poziom → jeden test na przedmiot. */
export const LEVEL_RANK: Record<string, number> = {
  "szkola podstawowa": 1,
  "szkola srednia poziom podstawowy": 2,
  "szkola srednia poziom rozszerzony": 3,
  matura: 4,
  "matura poziom podstawowy": 4,
  "matura poziom rozszerzony": 5,
};

export type RequiredTest = {
  subject: string;
  level: string;
};

export type TestResultEntry = {
  subject: string;
  level: string;
  score: string;
};

/**
 * Istniejące testy Google Forms (tylko te, które faktycznie mamy).
 * Klucze poziomów = etykiety z cennika. Lookup normalizuje też warianty z Formów
 * (nawiasy, wielkość liter, „Język Angielski” → Angielski).
 */
export const TEST_URLS: Record<string, Record<string, string>> = {
  Biologia: {
    "Szkoła średnia - poziom podstawowy":
      "https://docs.google.com/forms/d/1ry60w6Pn7gsG9TVatCgH6aHhHLyR4Czm9DBBCJ2i_r4/viewform",
    "Szkoła średnia - poziom rozszerzony":
      "https://docs.google.com/forms/d/1XvU2PWPO1nxX2JVMuEevSqcgB7765EvL_S-Wo8RQGjI/viewform",
  },
  Chemia: {
    "Szkoła średnia - poziom podstawowy":
      "https://docs.google.com/forms/d/10Wlc0SOCfs4Ec5ZwiA3d_875x3CKwCeJ60Tl-wRBj_4/viewform",
    "Szkoła średnia - poziom rozszerzony":
      "https://docs.google.com/forms/d/1J7or-03dR9Uspb6w7nN3Xujus6pMlbz4Q7Oh9g1UoUM/viewform",
  },
  Angielski: {
    "Szkoła podstawowa":
      "https://docs.google.com/forms/d/10I8M5kwKF-YnfQ9zLM0E4iR7I3FxNRgVj9U0VfA_qj8/viewform",
    "Szkoła średnia - poziom podstawowy":
      "https://docs.google.com/forms/d/1iNiqKrj7F_3NCpTeYW76im8g2rvebnraTJtn5eFDdeo/viewform",
    "Szkoła średnia - poziom rozszerzony":
      "https://docs.google.com/forms/d/10oHdpzm0K_0e76duz6q06Vv5z8AvgeHw1Yghgvn4YFE/viewform",
  },
  Niemiecki: {
    "Szkoła podstawowa":
      "https://docs.google.com/forms/d/1I-tbhOpmoaUYpnAJ-oWPk0ijLl4BygAWaZW6MSeJ_7U/viewform",
    "Szkoła średnia - poziom podstawowy":
      "https://docs.google.com/forms/d/1FqWbsm9etvjJT6eabCkM27cK6Anlhb-J9P536u6qyQw/viewform",
  },
  Polski: {
    "Szkoła podstawowa":
      "https://docs.google.com/forms/d/1rQpSn_P70OnIIUY6I5F6S6RwmmiNyijhTSTNaKnagi4/viewform",
    "Szkoła średnia - poziom podstawowy":
      "https://docs.google.com/forms/d/1F4DypH30aE_wfE2qIwQFolXnnOYsvrfafq6YEKTDpzo/viewform",
    "Szkoła średnia - poziom rozszerzony":
      "https://docs.google.com/forms/d/1pByaVAyhpnztb6wmtVQQq1tbU7aTEFTnr-k4OoFc_V8/viewform",
  },
  Matematyka: {
    "Szkoła podstawowa":
      "https://docs.google.com/forms/d/138d8J2rhS3mpG1pZ5hWm1yRgS2v9rK4U4nM71QiIMZM/viewform",
    "Szkoła średnia - poziom podstawowy":
      "https://docs.google.com/forms/d/10-UkiKpdY1JWGewKmO5PZJIYOOriCvlhYJcWWYRvcSk/viewform",
  },
};

/**
 * Formularze z wklejonym Apps Script (onFormSubmit / backfill).
 * Synchronizowane z TEST_URLS — każdy Forms z URL-em ma skrypt.
 */
export const TESTS_WITH_APPS_SCRIPT: Record<string, readonly string[]> = Object.fromEntries(
  Object.entries(TEST_URLS).map(([subject, byLevel]) => [subject, Object.keys(byLevel)]),
);

export type ResolvedTestLink = {
  subject: string;
  level: string;
  url: string;
  label: string;
};

export type SuggestedTest = {
  subject: string;
  level: string;
  label: string;
  url: string | null;
  missing: boolean;
  scriptMissing: boolean;
};

function normKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l")
    .replace(/^jezyk\s+/, "")
    .replace(/[()]/g, " ")
    .replace(/\s*-\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ujednolica etykiety poziomu z różnych Forms do kanonicznej formy z cennika. */
export function canonicalizeLevel(level: string): string {
  const n = normKey(level);
  if (!n) return "";
  const aliases: Record<string, string> = {
    "szkola podstawowa": "Szkoła podstawowa",
    "szkola srednia poziom podstawowy": "Szkoła średnia - poziom podstawowy",
    "szkola srednia poziom rozszerzony": "Szkoła średnia - poziom rozszerzony",
    matura: "Matura",
    "matura poziom podstawowy": "Matura - poziom podstawowy",
    "matura poziom rozszerzony": "Matura - poziom rozszerzony",
  };
  return aliases[n] || level.trim().replace(/\s+/g, " ");
}

/** Poziom z zgłoszenia → jaki test wysłać (Matura traktujemy jak rozszerzony). */
export function levelForTestSuggestion(level: string): string {
  const n = normKey(level);
  if (n === "matura" || n === "matura poziom podstawowy" || n === "matura poziom rozszerzony") {
    return "Szkoła średnia - poziom rozszerzony";
  }
  return canonicalizeLevel(level);
}

function levelRank(level: string): number {
  return LEVEL_RANK[normKey(level)] ?? 0;
}

/** Ujednolica nazwę przedmiotu (Język polski → Polski w linkach; zachowuje czytelny label). */
export function canonicalizeSubject(subject: string): string {
  const key = resolveSubjectKey(subject);
  return key ?? subject.trim();
}

/** Najwyższy poziom spośród zaznaczonych (np. z pytania o poziomy). */
export function pickHighestLevel(levels: string[]): string {
  let best = "";
  let bestRank = -1;
  for (const level of levels) {
    const l = level.trim();
    if (!l) continue;
    const canonical = canonicalizeLevel(l);
    const rank = levelRank(canonical);
    if (rank > bestRank || (rank === bestRank && canonical.length > best.length)) {
      best = canonical || l;
      bestRank = rank;
    }
  }
  return best;
}

/** Lista stringów z Forms — rozbija też „poziom1,poziom2” w jednym elemencie tablicy. */
export function asStringList(raw: unknown): string[] {
  const splitOne = (s: string): string[] => {
    const t = s.trim();
    if (!t) return [];
    if (t.includes("\n")) {
      return t
        .split(/\n+/)
        .flatMap(splitOne)
        .filter(Boolean);
    }
    if (t.includes(",")) {
      return t
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    }
    return [t];
  };

  if (Array.isArray(raw)) {
    return raw.flatMap((x) => splitOne(String(x ?? ""))).filter(Boolean);
  }
  if (typeof raw === "string") {
    return splitOne(raw);
  }
  return [];
}

export type SubjectLevels = {
  subject: string;
  levels: string[];
};

/**
 * Grupuje zaznaczenia z formularza: przedmiot → wszystkie poziomy (rosnąco).
 * `required_tests` może mieć wiele wierszy na ten sam przedmiot.
 */
export function groupSubjectLevels(tests: RequiredTest[]): SubjectLevels[] {
  const map = new Map<string, { subject: string; levels: string[]; order: number }>();
  let order = 0;
  for (const t of tests) {
    const subject = t.subject.trim();
    if (!subject) continue;
    const key = normKey(subject);
    const level = canonicalizeLevel(t.level) || t.level.trim();
    let row = map.get(key);
    if (!row) {
      row = { subject: canonicalizeSubject(subject), levels: [], order: order++ };
      map.set(key, row);
    }
    if (level && !row.levels.some((l) => normKey(l) === normKey(level))) {
      row.levels.push(level);
    }
  }
  return [...map.values()]
    .sort((a, b) => a.order - b.order)
    .map(({ subject, levels }) => ({
      subject,
      levels: [...levels].sort((a, b) => levelRank(a) - levelRank(b)),
    }));
}

/** Jeden test na przedmiot = najwyższy zaznaczony poziom. */
export function highestRequiredTests(tests: RequiredTest[]): RequiredTest[] {
  return groupSubjectLevels(tests).map(({ subject, levels }) => ({
    subject,
    level: pickHighestLevel(levels) || levels[levels.length - 1] || "",
  }));
}

export function countUniqueSubjects(tests: RequiredTest[]): number {
  return groupSubjectLevels(tests).length;
}

/**
 * CheckboxGrid / mapa przedmiot → poziomy → płaska lista wszystkich zaznaczeń.
 * Zachowuje każdy poziom (do wyświetlenia); podpowiedź testów bierze najwyższy.
 */
export function buildRequiredTestsFromOfferings(
  offerings: Record<string, string[]> | SubjectLevels[],
): RequiredTest[] {
  const out: RequiredTest[] = [];
  const seen = new Set<string>();

  const push = (subjectRaw: string, levelsRaw: string[]) => {
    const subject = subjectRaw.trim();
    if (!subject) return;
    for (const levelRaw of levelsRaw) {
      const level = canonicalizeLevel(levelRaw) || levelRaw.trim();
      if (!level) continue;
      const key = `${normKey(subject)}::${normKey(level)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ subject, level });
    }
  };

  if (Array.isArray(offerings)) {
    for (const row of offerings) {
      push(row.subject, row.levels);
    }
  } else {
    for (const [subject, levels] of Object.entries(offerings)) {
      push(subject, levels);
    }
  }
  return out;
}

/**
 * Parsuje notatkę „Biologia: SP, SS pp; Chemia: SP” → wszystkie pary przedmiot×poziom.
 * Forms / stary skrypt często klei poziomy przecinkiem bez spacji.
 */
export function parseLevelsNote(raw: unknown): RequiredTest[] {
  if (typeof raw !== "string") return [];
  const text = raw.trim();
  if (!text) return [];

  const map: Record<string, string[]> = {};
  for (const chunk of text.split(";")) {
    const part = chunk.trim();
    if (!part) continue;
    const colon = part.indexOf(":");
    if (colon <= 0) continue;
    const subject = part.slice(0, colon).trim();
    const levels = asStringList(part.slice(colon + 1));
    if (!subject || levels.length === 0) continue;
    map[subject] = [...(map[subject] ?? []), ...levels];
  }
  return buildRequiredTestsFromOfferings(map);
}

/**
 * Parsuje siatkę z Forms: { "Biologia": ["Szkoła podstawowa", ...] }
 * albo wiersze „Biologia [Szkoła podstawowa]”.
 */
export function parseOfferingsGrid(raw: unknown): RequiredTest[] {
  if (!raw) return [];

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const map: Record<string, string[]> = {};
    for (const [subject, levels] of Object.entries(raw as Record<string, unknown>)) {
      map[subject] = asStringList(levels);
    }
    return buildRequiredTestsFromOfferings(map);
  }

  if (Array.isArray(raw)) {
    const map: Record<string, string[]> = {};
    for (const row of raw) {
      if (row && typeof row === "object" && !Array.isArray(row)) {
        const subject = String((row as { subject?: unknown }).subject ?? "").trim();
        const levels = asStringList(
          (row as { levels?: unknown; level?: unknown }).levels ??
            (row as { level?: unknown }).level,
        );
        if (!subject) continue;
        map[subject] = [...(map[subject] ?? []), ...levels];
        continue;
      }
      const m = String(row ?? "").match(/^(.+?)\s*\[(.+)\]\s*$/);
      if (!m) continue;
      const subject = m[1]!.trim();
      const level = m[2]!.trim();
      if (!subject || !level) continue;
      map[subject] = [...(map[subject] ?? []), level];
    }
    return buildRequiredTestsFromOfferings(map);
  }

  return [];
}

/**
 * Ostateczność: osobne listy przedmiotów + poziomów (ten sam najwyższy poziom na wszystkie).
 * Nie oddaje różnic per przedmiot — używaj tylko gdy nie ma CheckboxGrid.
 */
export function buildRequiredTestsFromSubjectsAndLevels(
  subjects: string[],
  levels: string[],
): RequiredTest[] {
  const cleanSubjects = subjects.map((s) => s.trim()).filter(Boolean);
  if (cleanSubjects.length === 0) return [];
  const highest = pickHighestLevel(levels);
  if (!highest) return [];
  const out: RequiredTest[] = [];
  const seen = new Set<string>();
  for (const subject of cleanSubjects) {
    const key = normKey(subject);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ subject, level: highest });
  }
  return out;
}

function resolveSubjectKey(subject: string): string | null {
  const n = normKey(subject);
  for (const key of Object.keys(TEST_URLS)) {
    if (normKey(key) === n) return key;
  }
  return null;
}

function resolveLevelUrl(byLevel: Record<string, string>, level: string): string | null {
  if (!level) return null;
  const canonical = canonicalizeLevel(level);
  if (byLevel[canonical]) return byLevel[canonical]!;
  if (byLevel[level]) return byLevel[level]!;
  const n = normKey(level);
  for (const [key, url] of Object.entries(byLevel)) {
    if (normKey(key) === n) return url;
  }
  return null;
}

/** Dobiera poziom testu i URL — Matura → rozszerzony. Nie podnosimy poziomu do wyższego dostępnego Forms. */
function resolveTestLevelAndUrl(
  byLevel: Record<string, string>,
  applicationLevel: string,
): { level: string; url: string | null } {
  const preferred = levelForTestSuggestion(applicationLevel);
  const direct = resolveLevelUrl(byLevel, preferred);
  if (direct) return { level: preferred, url: direct };
  return { level: preferred, url: null };
}

export function parseRequiredTests(raw: unknown): RequiredTest[] {
  if (!Array.isArray(raw)) return [];
  const out: RequiredTest[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const subject = String((item as { subject?: unknown }).subject ?? "").trim();
    if (!subject) continue;
    const levelParts = asStringList((item as { level?: unknown }).level);
    const levels =
      levelParts.length > 0
        ? levelParts
        : asStringList((item as { levels?: unknown }).levels);
    if (levels.length === 0) {
      const key = `${normKey(subject)}::`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ subject, level: "" });
      continue;
    }
    for (const part of levels) {
      const level = canonicalizeLevel(part) || part.trim();
      const key = `${normKey(subject)}::${normKey(level)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ subject, level });
    }
  }
  return out;
}

export function parseTestResults(raw: unknown): Record<string, { score: string; level: string }> {
  const list = parseTestResultsList(raw);
  const out: Record<string, { score: string; level: string }> = {};
  for (const row of list) {
    const prev = out[row.subject];
    if (!prev || levelRank(row.level) >= levelRank(prev.level)) {
      out[row.subject] = { score: row.score, level: row.level };
    }
  }
  return out;
}

function resultKey(subject: string, level: string): string {
  return `${normKey(subject)}::${normKey(level)}`;
}

function sameSubject(a: string, b: string): boolean {
  return normKey(a) === normKey(b);
}

/**
 * Wyniki jako lista (wiele poziomów na ten sam przedmiot).
 * Czyta też stary format: { "Biologia": { score, level } }.
 */
export function parseTestResultsList(raw: unknown): TestResultEntry[] {
  const out: TestResultEntry[] = [];
  const seen = new Set<string>();

  const push = (subject: string, level: string, score: string) => {
    const s = subject.trim();
    const sc = score.trim();
    if (!s || !sc) return;
    const key = resultKey(s, level);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ subject: s, level: level.trim(), score: sc });
  };

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const subject = String((item as { subject?: unknown }).subject ?? "").trim();
      const level = String((item as { level?: unknown }).level ?? "").trim();
      const score = String((item as { score?: unknown }).score ?? "").trim();
      push(subject, level, score);
    }
    return out;
  }

  if (!raw || typeof raw !== "object") return out;

  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val === "string" && val.trim()) {
      const parts = key.split("::");
      push(parts[0] || key, parts.slice(1).join("::"), val);
      continue;
    }
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const score = String((val as { score?: unknown }).score ?? "").trim();
      const level = String((val as { level?: unknown }).level ?? "").trim();
      const subjectFromVal = String((val as { subject?: unknown }).subject ?? "").trim();
      const subject = subjectFromVal || key.split("::")[0] || key;
      push(subject, level, score);
    }
  }
  return out;
}

/** Upsert: ten sam przedmiot+poziom → nadpisz; inny poziom → dopisz (np. matma rozsz. + podst.). */
export function upsertTestResult(
  prev: TestResultEntry[],
  next: { subject: string; level: string; score: string },
): TestResultEntry[] {
  const subject = next.subject.trim();
  const level = (next.level || "").trim();
  const score = next.score.trim();
  if (!subject || !score) return prev;

  const key = resultKey(subject, level);
  let found = false;
  const out = prev.map((row) => {
    if (resultKey(row.subject, row.level) !== key) return row;
    found = true;
    return { subject, level, score };
  });
  if (!found) out.push({ subject, level, score });
  return out;
}

export function countSubjectsWithResults(results: TestResultEntry[]): number {
  const seen = new Set<string>();
  for (const r of results) seen.add(normKey(r.subject));
  return seen.size;
}

/** Dokładny poziom, inaczej dowolny wynik z przedmiotu. */
export function findResultForRequired(
  results: TestResultEntry[],
  required: RequiredTest,
): TestResultEntry | null {
  const exact = results.find(
    (r) => sameSubject(r.subject, required.subject) && normKey(r.level) === normKey(required.level),
  );
  if (exact) return exact;
  return results.find((r) => sameSubject(r.subject, required.subject)) ?? null;
}

export type CandidateTestDisplayRow = {
  subject: string;
  level: string;
  score: string | null;
  note?: string;
  kind: "required" | "retry" | "extra";
};

function resultEntryKey(entry: Pick<TestResultEntry, "subject" | "level">): string {
  return `${normKey(entry.subject)}::${normKey(entry.level)}`;
}

/** Jedna linia na wymagany test; wynik z innego poziomu scala się z wierszem wymaganym. */
export function buildCandidateTestDisplayRows(
  required: RequiredTest[],
  results: TestResultEntry[],
): CandidateTestDisplayRow[] {
  const rows: CandidateTestDisplayRow[] = [];
  const used = new Set<string>();

  // Wyniki: jeden wiersz na przedmiot (najwyższy wymagany poziom), nie każdy zaznaczony poziom.
  for (const t of highestRequiredTests(required)) {
    const forSubject = results.filter((r) => sameSubject(r.subject, t.subject));
    const primary = findResultForRequired(results, t);

    if (!primary) {
      rows.push({ subject: t.subject, level: t.level, score: null, kind: "required" });
      continue;
    }

    used.add(resultEntryKey(primary));
    const exactLevel = normKey(primary.level) === normKey(t.level);
    rows.push({
      subject: t.subject,
      level: t.level,
      score: primary.score,
      note: exactLevel ? undefined : `Wykonano: ${primary.level}`,
      kind: "required",
    });

    for (const r of forSubject) {
      const key = resultEntryKey(r);
      if (used.has(key)) continue;
      used.add(key);
      rows.push({
        subject: r.subject,
        level: r.level,
        score: r.score,
        note: "Kolejna próba",
        kind: "retry",
      });
    }
  }

  for (const r of results) {
    const key = resultEntryKey(r);
    if (used.has(key)) continue;
    used.add(key);
    rows.push({
      subject: r.subject,
      level: r.level,
      score: r.score,
      kind: "extra",
    });
  }

  return rows;
}

/** Dobiera URL z TEST_URLS dla listy required_tests. */
export function resolveTestLinks(requiredTests: RequiredTest[]): ResolvedTestLink[] {
  return suggestTestsToSend(requiredTests)
    .filter((t) => t.url)
    .map((t) => ({
      subject: t.subject,
      level: t.level,
      url: t.url!,
      label: t.label,
    }));
}

function hasAppsScript(subjectKey: string | null, level: string): boolean {
  if (!subjectKey) return false;
  const levels = TESTS_WITH_APPS_SCRIPT[subjectKey];
  if (!levels?.length) return false;
  const n = normKey(level);
  return levels.some((l) => normKey(l) === n);
}

/**
 * Podpowiedź: jeden test na przedmiot = najwyższy zaznaczony poziom.
 * Nie podnosimy poziomu tylko dlatego, że w TEST_URLS jest wyższy Forms.
 */
export function suggestTestsToSend(requiredTests: RequiredTest[]): SuggestedTest[] {
  return highestRequiredTests(requiredTests).map((t) => {
    const subjectKey = resolveSubjectKey(t.subject);
    const byLevel = subjectKey ? TEST_URLS[subjectKey] : null;
    const subject = subjectKey ?? t.subject;
    const resolved = byLevel
      ? resolveTestLevelAndUrl(byLevel, t.level)
      : { level: levelForTestSuggestion(t.level), url: null as string | null };
    const url = resolved.url;
    const displayLevel = resolved.level;
    return {
      subject,
      level: displayLevel,
      label: displayLevel ? `${subject} · ${displayLevel}` : subject,
      url,
      missing: !url,
      scriptMissing: Boolean(url) && !hasAppsScript(subjectKey, displayLevel),
    };
  });
}

/** Buduje active_subjects z required_tests („Przedmiot · Poziom”). */
export function offeringsFromCandidate(candidate: {
  required_tests: unknown;
}): string[] {
  const tests = parseRequiredTests(candidate.required_tests);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tests) {
    const key = t.level ? `${t.subject} · ${t.level}` : t.subject;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

export type CandidateTestWorkflow = "NOT_SENT" | "IN_PROGRESS" | "DONE" | "OVERDUE";

export const CANDIDATE_TEST_WORKFLOW_ORDER: CandidateTestWorkflow[] = [
  "OVERDUE",
  "NOT_SENT",
  "IN_PROGRESS",
  "DONE",
];

export const CANDIDATE_TEST_WORKFLOW_LABEL: Record<CandidateTestWorkflow, string> = {
  NOT_SENT: "Test nie wysłany",
  IN_PROGRESS: "W toku",
  DONE: "Zrobione",
  OVERDUE: "Po czasie",
};

function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function addBusinessDays(from: Date, days: number): Date {
  const result = dateOnly(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) added += 1;
  }
  return result;
}

/** Liczba dni roboczych między datami (dodatnia, gdy `to` jest po `from`). */
export function businessDaysBetween(from: Date, to: Date): number {
  const a = dateOnly(from);
  const b = dateOnly(to);
  const sign = b.getTime() >= a.getTime() ? 1 : -1;
  const start = sign === 1 ? a : b;
  const end = sign === 1 ? b : a;
  let count = 0;
  const cur = new Date(start);
  while (cur.getTime() < end.getTime()) {
    cur.setDate(cur.getDate() + 1);
    if (!isWeekend(cur)) count += 1;
  }
  return count * sign;
}

export function countCompletedRequiredTests(
  required: RequiredTest[],
  results: TestResultEntry[],
): number {
  return highestRequiredTests(required).filter((t) =>
    results.some((r) => normKey(r.subject) === normKey(t.subject)),
  ).length;
}

export function getCandidateTestProgress(candidate: {
  required_tests: unknown;
  test_results: unknown;
  tests_expected: number | null;
  tests_completed: number | null;
}): { required: RequiredTest[]; expected: number; completed: number } {
  const required = parseRequiredTests(candidate.required_tests);
  const results = parseTestResultsList(candidate.test_results);
  const expected = Math.max(
    candidate.tests_expected || 0,
    countUniqueSubjects(required),
  );
  const completed = countCompletedRequiredTests(required, results);
  return { required, expected, completed };
}

/** Etap procesu testowego (tylko dla otwartych kandydatów). */
export function getCandidateTestWorkflow(candidate: {
  status: string;
  test_sent_manually: boolean;
  test_sent_at: string | null;
  required_tests: unknown;
  test_results: unknown;
  tests_expected: number | null;
  tests_completed: number | null;
}): CandidateTestWorkflow | null {
  if (candidate.status === "HIRED" || candidate.status === "REJECTED") return null;

  if (!candidate.test_sent_manually || !candidate.test_sent_at) {
    return "NOT_SENT";
  }

  const { expected, completed } = getCandidateTestProgress(candidate);
  if (expected > 0 && completed >= expected) {
    return "DONE";
  }

  const sent = new Date(`${candidate.test_sent_at.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(sent.getTime())) {
    return "NOT_SENT";
  }

  const deadline = addBusinessDays(sent, 3);
  const diff = businessDaysBetween(dateOnly(new Date()), deadline);
  if (diff < 0) {
    return "OVERDUE";
  }

  return "IN_PROGRESS";
}
