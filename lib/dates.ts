/**
 * Centralny plik dat i terminów logiki biznesowej ZALICZONE.
 * Tu ustawiasz wszystkie „do kiedy” / „od kiedy” / progi — reszta aplikacji czyta stąd.
 *
 * Format miesięcy: "YYYY-MM"
 * Format dni w miesiącu: liczby 1–31
 */

/** Udział nauczyciela w stawce klienta (0.7 = 70%) */
export const TUTOR_SHARE = 0.7;

/** Stawka PIT ryczałt / liniowy używana w panelu księgowości admina */
export const ADMIN_PIT_RATE = 0.12;

export const DATES = {
  /**
   * Ewidencja godzin — deadline dla nauczyciela.
   * „Do 3. dnia nowego miesiąca” = ewidencja za czerwiec należy wysłać do 3 lipca włącznie.
   */
  ewidencja: {
    /** Dzień miesiąca następnego, do którego włącznie obowiązuje deadline */
    deadlineDayOfNextMonth: 3,
    /** Od którego dnia miesiąca admin może prosić o ewidencję (powiadomienia) */
    requestAvailableFromDay: 1,
  },

  /**
   * Wypłaty nauczycieli.
   * Admin może oznaczać „Wypłacono” od tego dnia miesiąca (kolejnego względem miesiąca rozliczenia).
   */
  payout: {
    availableFromDay: 25,
  },

  /**
   * Zamknięcie miesiąca w księgowości.
   * Po tej dacie admin może zamknąć poprzedni miesiąc (checklist).
   */
  monthClose: {
    earliestDayOfNextMonth: 5,
  },

  /**
   * Premia miesięczna dla nauczyciela.
   * Po osiągnięciu `hoursThreshold` godzin lekcji VERIFIED w miesiącu — dodatek `bonusPln` do wypłaty.
   */
  bonus: {
    hoursThreshold: 40,
    bonusPln: 100,
  },

  /**
   * Kotwica demo / seedów (nie wpływa na produkcyjną logikę deadline’ów).
   */
  demo: {
    temporalAnchorIso: "2026-07-13",
  },
} as const;

export type DatesConfig = typeof DATES;

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

/** Postęp do premii: hoursDone / threshold (godziny VERIFIED), clamped 0–1. */
export function bonusProgress(hoursDone: number): {
  done: number;
  threshold: number;
  remaining: number;
  ratio: number;
  achieved: boolean;
  bonusPln: number;
} {
  const threshold = DATES.bonus.hoursThreshold;
  const bonusPln = DATES.bonus.bonusPln;
  const done = Math.max(0, hoursDone);
  const remaining = Math.max(0, Math.round((threshold - done) * 10) / 10);
  return {
    done,
    threshold,
    remaining,
    ratio: Math.min(1, done / threshold),
    achieved: done >= threshold,
    bonusPln,
  };
}
