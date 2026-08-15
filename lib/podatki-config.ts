/**
 * Stałe podatkowe / ZUS / limity na rok 2026.
 * Aktualizuj ręcznie przy zmianie przepisów lub ogłoszeniach ZUS/MF.
 */

/** Stawka skali podatkowej (I próg) — używana do zaliczek PIT JDG */
export const ADMIN_PIT_RATE = 0.12;

/**
 * Miesięczna kwota zmniejszająca podatek (3 600 zł / 12).
 * We wzorze zaliczki: dochód_narastająco × 0.12 − 300 × liczba_miesięcy.
 */
export const PIT_MONTHLY_TAX_REDUCING_AMOUNT = 300;

/** Kwota wolna od podatku (rocznie) — pasek PIT-36 w trybie NDG */
export const PIT_TAX_FREE_AMOUNT = 30_000;

/** Limit kwartalny działalności nierejestrowanej (NDG) 2026 */
export const NDG_QUARTERLY_LIMIT = 10_813.5;

/** Limit zwolnienia podmiotowego z VAT (rocznie) 2026 */
export const VAT_ANNUAL_LIMIT = 240_000;

/** Ulga na start — składki społeczne = 0 zł przez pierwsze 6 miesięcy JDG */
export const ZUS_ULGA_NA_START_SPOLECZNE = 0;

/** Preferencyjny ZUS — składki społeczne (ok. 30% minimalnego wynagrodzenia 2026) */
export const ZUS_PREFERENCYJNY_SPOLECZNE = 456.18;

/** Minimum składki zdrowotnej na skali podatkowej 2026 */
export const SKLADKA_ZDROWOTNA_MINIMUM = 432.54;

/** Stawka składki zdrowotnej na skali (9% dochodu) */
export const SKLADKA_ZDROWOTNA_RATE = 0.09;

/** Liczba miesięcy Ulgi na start */
export const ULGA_NA_START_MONTHS = 6;

/** Dni na złożenie CEIDG-1 po przekroczeniu limitu NDG */
export const NDG_CEIDG_DAYS = 7;
