/**
 * Centralny plik dat i terminów logiki biznesowej ZALICZONE.
 * Tu ustawiasz wszystkie „do kiedy” / „od kiedy” / progi - reszta aplikacji czyta stąd.
 *
 * Format miesięcy: "YYYY-MM"
 * Format dni w miesiącu: liczby 1–31
 */

/** Udział nauczyciela w stawce klienta (0.7 = 70%) */
export const TUTOR_SHARE = 0.7;

/** Stawka PIT skali (I próg) - kanoniczna wartość w `lib/podatki-config.ts`. */
export { ADMIN_PIT_RATE } from "@/lib/podatki-config";

export const DATES = {
  /**
   * Ewidencja godzin za miesiąc M:
   * PDF do wygenerowania od `unlockDayOfNextMonth` kolejnego miesiąca,
   * podpisany skan do `deadlineDayOfNextMonth`.
   */
  ewidencja: {
    unlockDayOfNextMonth: 1,
    deadlineDayOfNextMonth: 3,
  },

  /**
   * Rachunki do podpisania - wysyłka do nauczycieli 3. dnia,
   * zwrot podpisanych do 5. dnia (po przesłaniu ewidencji).
   */
  rachunek: {
    sendDayOfNextMonth: 3,
    signedDeadlineDayOfNextMonth: 5,
  },

  /**
   * Weryfikacja zgodności podpisanych dokumentów z systemem - po 5. dniu.
   */
  verification: {
    fromDayOfNextMonth: 6,
  },

  /**
   * Wypłaty nauczycieli - przelew i odznaczenie „WYPŁACONE” do 10. dnia.
   */
  payout: {
    availableFromDay: 6,
    deadlineDayOfNextMonth: 10,
  },

  /**
   * Zamknięcie miesiąca w księgowości - najlepiej do 15. dnia:
   * generacja księgowości, koszty (wypłaty na miesiąc bieżący) + podpisane rachunki.
   */
  monthClose: {
    earliestDayOfNextMonth: 6,
    targetDayOfNextMonth: 15,
  },

  /**
   * Weryfikacja finansów (limity, koszty) - po zamknięciu miesiąca.
   */
  financeReview: {
    dayOfNextMonth: 16,
  },

  /**
   * Podatki (np. zaliczka PIT na JDG) - do 20. dnia.
   */
  taxes: {
    deadlineDayOfNextMonth: 20,
  },

  /**
   * Terminy roczne (po zamknięciu roku kalendarzowego).
   */
  yearEnd: {
    /** Zestawienie kosztów - do 15 stycznia */
    costSummaryDay: 15,
    /** PIT-11 do US - do końca stycznia */
    pit11ToUsMonth: 1,
    /** Maile z PIT do nauczycieli - do końca lutego */
    pitToTeachersMonth: 2,
    /** PIT-36 właściciela - do końca kwietnia */
    pit36Month: 4,
  },

  /**
   * Premie miesięczne dla nauczyciela (lekcje VERIFIED).
   * Progi kumulatywne: 40 h → +100 zł, 50 h → kolejne +100 zł, 60 h → kolejne +100 zł
   * (łącznie do `maxBonusPln` = 300 zł).
   * Pasek na dashboardzie pokazuje tylko aktualny segment (do 40, potem do 50, potem do 60).
   */
  bonus: {
    tiers: [
      { hoursThreshold: 40, bonusPln: 100 },
      { hoursThreshold: 50, bonusPln: 100 },
      { hoursThreshold: 60, bonusPln: 100 },
    ],
  },

  /**
   * Kotwica demo / seedów (nie wpływa na produkcyjną logikę deadline’ów).
   */
  demo: {
    temporalAnchorIso: "2026-07-21",
  },
} as const;

export type DatesConfig = typeof DATES;

/** Dzień, od którego nauczyciel może wygenerować PDF za `monthKey` (np. 2026-06 → 2026-07-01). */
export function ewidencjaUnlockDate(monthKey: string): Date {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y!, m!, DATES.ewidencja.unlockDayOfNextMonth, 0, 0, 0, 0);
}

/** Czy dziś (albo podana data) jest już dniem odblokowania PDF za miesiąc M. */
export function isEwidencjaPdfAvailable(monthKey: string, today = new Date()): boolean {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return start >= ewidencjaUnlockDate(monthKey);
}

export function ewidencjaAvailableFromHint(monthLabel: string): string {
  return `Ewidencja za ${monthLabel} będzie dostępna od ${DATES.ewidencja.unlockDayOfNextMonth}. dnia kolejnego miesiąca`;
}

/** Deadline ewidencji za dany miesiąc (np. 2026-06 → 2026-07-03). */
export function ewidencjaDeadlineIso(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  // monthKey "2026-06" → m=6; new Date(2026, 6, 3) = 3 lipca (miesiąc indeksowany od 0)
  const d = new Date(y!, m!, DATES.ewidencja.deadlineDayOfNextMonth, 12, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatEwidencjaDeadlinePl(monthKey: string): string {
  const iso = ewidencjaDeadlineIso(monthKey);
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${iso}T12:00:00`),
  );
}

/** Czy dziś jest na tyle późno, że admin może zamykać miesiąc `monthKey`. */
export function canCloseMonth(monthKey: string, today = new Date()): boolean {
  const [y, m] = monthKey.split("-").map(Number);
  const earliest = new Date(y!, m!, DATES.monthClose.earliestDayOfNextMonth, 0, 0, 0, 0);
  return today >= earliest;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function formatMonthLongPl(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(
    new Date(y!, (m ?? 1) - 1, 15),
  );
}

function formatDayLongPl(y: number, monthIndex0: number, day: number): string {
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(y, monthIndex0, day, 12),
  );
}

/**
 * Terminy „do kiedy" dla bieżącego cyklu - używane w zakładce Przewodnik i jej skrócie
 * na dashboardzie tutora. Jedno miejsce liczenia, żeby oba widoki zawsze się zgadzały.
 */
export function guideDeadlines(now = new Date()): {
  previousMonthLabel: string;
  ewidencjaDeadlineLabel: string;
  ewidencjaOverdue: boolean;
  payoutAvailableLabel: string;
} {
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const previousMonthKey = monthKeyOf(previousMonthDate);
  const ewidencjaDeadlineLabel = formatEwidencjaDeadlinePl(previousMonthKey);
  const ewidencjaOverdue = now > new Date(`${ewidencjaDeadlineIso(previousMonthKey)}T23:59:59`);
  const payoutAvailableLabel = formatDayLongPl(now.getFullYear(), now.getMonth(), DATES.payout.deadlineDayOfNextMonth);
  return {
    previousMonthLabel: formatMonthLongPl(previousMonthKey),
    ewidencjaDeadlineLabel,
    ewidencjaOverdue,
    payoutAvailableLabel,
  };
}

/** Suma maksymalnej premii miesięcznej (wszystkie progi). */
export function maxBonusPln(): number {
  return DATES.bonus.tiers.reduce((s, t) => s + t.bonusPln, 0);
}

/**
 * Postęp do premii wielostopniowej.
 * `threshold` / `ratio` / `remaining` dotyczą **aktualnego segmentu** paska
 * (0→40, potem 40→50, potem 50→60). `bonusPln` = łącznie już zarobiona premia.
 */
export function bonusProgress(hoursDone: number): {
  done: number;
  /** Cel bieżącego segmentu (40 / 50 / 60). */
  threshold: number;
  /** Ile godzin brakuje do końca bieżącego segmentu. */
  remaining: number;
  /** Postęp w bieżącym segmencie (0–1). */
  ratio: number;
  /** Czy jest jakakolwiek zarobiona premia. */
  achieved: boolean;
  /** Łączna premia już naliczona (0 / 100 / 200 / 300). */
  bonusPln: number;
  /** Premia za bieżący segment (do etykiety „+100 zł”). */
  segmentBonusPln: number;
  /** Wszystkie progi zdobyte (60 h+). */
  maxed: boolean;
} {
  const tiers = DATES.bonus.tiers;
  const done = Math.max(0, hoursDone);

  let bonusPln = 0;
  for (const tier of tiers) {
    if (done >= tier.hoursThreshold) bonusPln += tier.bonusPln;
  }

  const maxed = done >= tiers[tiers.length - 1]!.hoursThreshold;
  const achieved = bonusPln > 0;

  if (maxed) {
    const last = tiers[tiers.length - 1]!;
    return {
      done,
      threshold: last.hoursThreshold,
      remaining: 0,
      ratio: 1,
      achieved,
      bonusPln,
      segmentBonusPln: last.bonusPln,
      maxed: true,
    };
  }

  let prevHours = 0;
  let currentTier: (typeof tiers)[number] = tiers[0]!;
  for (const tier of tiers) {
    if (done < tier.hoursThreshold) {
      currentTier = tier;
      break;
    }
    prevHours = tier.hoursThreshold;
  }

  const span = currentTier.hoursThreshold - prevHours;
  const inSegment = Math.max(0, done - prevHours);
  const remaining = Math.max(0, Math.round((currentTier.hoursThreshold - done) * 10) / 10);
  const ratio = span > 0 ? Math.min(1, inSegment / span) : 1;

  return {
    done,
    threshold: currentTier.hoursThreshold,
    remaining,
    ratio,
    achieved,
    bonusPln,
    segmentBonusPln: currentTier.bonusPln,
    maxed: false,
  };
}
