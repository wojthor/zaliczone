import {
  ADMIN_PIT_RATE,
  NDG_CEIDG_DAYS,
  NDG_QUARTERLY_LIMIT,
  PIT_MONTHLY_TAX_REDUCING_AMOUNT,
  SKLADKA_ZDROWOTNA_MINIMUM,
  SKLADKA_ZDROWOTNA_RATE,
  VAT_ANNUAL_LIMIT,
} from "@/lib/podatki-config";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Zaliczka na PIT liczona narastająco od stycznia / od rejestracji JDG, zgodnie z ustawą o PIT.
 *
 * KROK 1: podatek_narastająco = max(0, dochód_narastająco × 0.12 − 300 × liczba_miesięcy)
 * KROK 2: zaliczka_tego_miesiąca = max(0, podatek_narastająco − suma_zaliczek_już_zapłaconych)
 *
 * @param dochodyMiesieczneOdRejestracji — dochody miesięczne po kolei od miesiąca rejestracji JDG
 * @param miesiacBiezacy — indeks 0-based w tablicy powyżej (miesiąc, dla którego liczysz zaliczkę)
 */
export function obliczZaliczkePIT(
  dochodyMiesieczneOdRejestracji: number[],
  miesiacBiezacy: number,
): number {
  if (
    miesiacBiezacy < 0 ||
    miesiacBiezacy >= dochodyMiesieczneOdRejestracji.length ||
    !Number.isFinite(miesiacBiezacy)
  ) {
    return 0;
  }

  let sumaZaplaconych = 0;
  let zaliczkaBiezaca = 0;

  for (let i = 0; i <= miesiacBiezacy; i++) {
    const dochodNarastajaco = dochodyMiesieczneOdRejestracji
      .slice(0, i + 1)
      .reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
    const liczbaMiesiecy = i + 1;
    const podatekNarastajaco = Math.max(
      0,
      round2(dochodNarastajaco * ADMIN_PIT_RATE - PIT_MONTHLY_TAX_REDUCING_AMOUNT * liczbaMiesiecy),
    );
    const zaliczka = Math.max(0, round2(podatekNarastajaco - sumaZaplaconych));
    sumaZaplaconych = round2(sumaZaplaconych + zaliczka);
    if (i === miesiacBiezacy) zaliczkaBiezaca = zaliczka;
  }

  return zaliczkaBiezaca;
}

/**
 * Składka zdrowotna dla skali podatkowej: 9% dochodu bieżącego miesiąca,
 * nie mniej niż minimum ustawowe (stała roczna w podatki-config).
 */
export function obliczSkladkeZdrowotna(
  dochodMiesieczny: number,
  minimumUstawowe: number = SKLADKA_ZDROWOTNA_MINIMUM,
): number {
  const raw = Math.max(0, Number.isFinite(dochodMiesieczny) ? dochodMiesieczny : 0) * SKLADKA_ZDROWOTNA_RATE;
  return round2(Math.max(minimumUstawowe, raw));
}

/**
 * Postęp względem limitu kwartalnego NDG.
 */
export function obliczLimitNDG(przychodyKwartalu: number[]): {
  suma: number;
  procent: number;
  przekroczono: boolean;
} {
  const suma = round2(przychodyKwartalu.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0));
  const procent = NDG_QUARTERLY_LIMIT > 0 ? round2((suma / NDG_QUARTERLY_LIMIT) * 100) : 0;
  return { suma, procent, przekroczono: suma > NDG_QUARTERLY_LIMIT };
}

/**
 * Postęp względem rocznego limitu zwolnienia VAT.
 */
export function obliczLimitVAT(przychodyRoczne: number[]): {
  suma: number;
  procent: number;
  przekroczono: boolean;
} {
  const suma = round2(przychodyRoczne.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0));
  const procent = VAT_ANNUAL_LIMIT > 0 ? round2((suma / VAT_ANNUAL_LIMIT) * 100) : 0;
  return { suma, procent, przekroczono: suma > VAT_ANNUAL_LIMIT };
}

/** Progi kolorystyczne paska limitu (0–75 / 75–95 / 95+). */
export type LimitBarTone = "ok" | "warn" | "danger";

export function toneForLimitPercent(procent: number): LimitBarTone {
  if (procent > 95) return "danger";
  if (procent >= 75) return "warn";
  return "ok";
}

/**
 * Pierwsza data (YYYY-MM-DD), w której narastająca suma przychodów przekroczyła limit.
 * `entries` muszą być posortowane chronologicznie.
 */
export function znajdzDatePrzekroczeniaLimitu(
  entries: { date: string; amount: number }[],
  limit: number,
): string | null {
  let suma = 0;
  for (const e of entries) {
    suma = round2(suma + e.amount);
    if (suma > limit) return e.date;
  }
  return null;
}

/**
 * Dni pozostałe na CEIDG-1: 7 dni od daty przekroczenia limitu NDG (włącznie z dniem przekroczenia jako dniem 0 upływu).
 * Zwraca 0 gdy termin minął.
 */
export function dniPozostaleNaCeidg(dataPrzekroczeniaIso: string, today = new Date()): number {
  const [y, m, d] = dataPrzekroczeniaIso.split("-").map(Number);
  if (!y || !m || !d) return 0;
  const exceed = new Date(y, m - 1, d, 0, 0, 0, 0);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const elapsed = Math.floor((startOfToday.getTime() - exceed.getTime()) / 86_400_000);
  return Math.max(0, NDG_CEIDG_DAYS - elapsed);
}

/** Kwartał kalendarzowy 1–4 dla miesiąca 1–12. */
export function calendarQuarter(month1to12: number): 1 | 2 | 3 | 4 {
  return (Math.floor((month1to12 - 1) / 3) + 1) as 1 | 2 | 3 | 4;
}

/** Miesiące (1–12) należące do kwartału. */
export function monthsInQuarter(quarter: 1 | 2 | 3 | 4): [number, number, number] {
  const start = (quarter - 1) * 3 + 1;
  return [start, start + 1, start + 2];
}

/** Numer miesiąca Ulgi na start (1–6) dla `asOfMonthKey` względem daty rejestracji JDG; null poza oknem. */
export function numerMiesiacaUlgiNaStart(
  jdgRegistrationDate: string,
  asOfMonthKey: string,
): number | null {
  const startKey = jdgRegistrationDate.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(startKey) || !/^\d{4}-\d{2}$/.test(asOfMonthKey)) return null;
  const [sy, sm] = startKey.split("-").map(Number);
  const [ay, am] = asOfMonthKey.split("-").map(Number);
  const idx = (ay! - sy!) * 12 + (am! - sm!);
  if (idx < 0 || idx >= 6) return null;
  return idx + 1;
}
