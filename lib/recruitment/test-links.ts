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
  score: string;
  level: string;
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
  /** Brak formularza w TEST_URLS dla tej pary. */
  missing: boolean;
};

function normKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/^jezyk\s+/, "")
    .replace(/[()]/g, " ")
    .replace(/\s*-\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levelRank(level: string): number {
  return LEVEL_RANK[normKey(level)] ?? 0;
}

/** Najwyższy poziom spośród zaznaczonych (np. z pytania o poziomy). */
export function pickHighestLevel(levels: string[]): string {
  let best = "";
  let bestRank = -1;
  for (const level of levels) {
    const l = level.trim();
    if (!l) continue;
    const rank = levelRank(l);
    if (rank > bestRank || (rank === bestRank && l.length > best.length)) {
      best = l;
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

/**
 * Przedmioty × najwyższy poziom → jeden test na przedmiot.
 * Np. [Biologia, Chemia] + [podstawowy, rozszerzony] → oba na rozszerzonym.
 */
export function buildRequiredTestsFromSubjectsAndLevels(
  subjects: string[],
  levels: string[],
): RequiredTest[] {
  const cleanSubjects = subjects.map((s) => s.trim()).filter(Boolean);
  if (cleanSubjects.length === 0) return [];
  const highest = pickHighestLevel(levels);
  const out: RequiredTest[] = [];
  const seen = new Set<string>();
  for (const subject of cleanSubjects) {
    const key = subject.toLowerCase();
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
  if (byLevel[level]) return byLevel[level]!;
  const n = normKey(level);
  for (const [key, url] of Object.entries(byLevel)) {
    if (normKey(key) === n) return url;
  }
  return null;
}

export function parseRequiredTests(raw: unknown): RequiredTest[] {
  if (!Array.isArray(raw)) return [];
  const out: RequiredTest[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const subject = String((item as { subject?: unknown }).subject ?? "").trim();
    const levelRaw = String((item as { level?: unknown }).level ?? "").trim();
    if (!subject) continue;
    const levelParts = asStringList(levelRaw);
    const level = levelParts.length > 1 ? pickHighestLevel(levelParts) : levelRaw;
    const key = `${subject}::${level}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ subject, level });
  }
  return out;
}

export function parseTestResults(raw: unknown): Record<string, TestResultEntry> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, TestResultEntry> = {};
  for (const [subject, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val === "string" && val.trim()) {
      out[subject] = { score: val.trim(), level: "" };
      continue;
    }
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const score = String((val as { score?: unknown }).score ?? "").trim();
      const level = String((val as { level?: unknown }).level ?? "").trim();
      if (score) out[subject] = { score, level };
    }
  }
  return out;
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

/**
 * Podpowiedź: jakie testy wysłać na podstawie required_tests ze zgłoszenia.
 * Pokazuje też brakujące URL-e (przedmiot/poziom bez Forms).
 */
export function suggestTestsToSend(requiredTests: RequiredTest[]): SuggestedTest[] {
  return requiredTests.map((t) => {
    const subjectKey = resolveSubjectKey(t.subject);
    const byLevel = subjectKey ? TEST_URLS[subjectKey] : null;
    const url = byLevel ? resolveLevelUrl(byLevel, t.level) : null;
    const subject = subjectKey ?? t.subject;
    return {
      subject,
      level: t.level,
      label: t.level ? `${subject} · ${t.level}` : subject,
      url,
      missing: !url,
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
