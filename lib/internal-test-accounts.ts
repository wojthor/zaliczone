/**
 * Wewnętrzne konta testowe (filmik / QA).
 * Nie pokazujemy ich na landingu ani w panelach admina — logowanie działa normalnie.
 */
export const INTERNAL_TEST_TUTOR_EMAILS = new Set([
  "marek.towarek@zaliczone.edu.pl",
]);

export const INTERNAL_TEST_TUTOR_IDS = new Set([
  "f5e0976a-978b-4c8d-abed-61713589caf0", // Marek Towarek
]);

export function isInternalTestTutorId(id: string | null | undefined): boolean {
  if (!id) return false;
  return INTERNAL_TEST_TUTOR_IDS.has(id);
}

export function isInternalTestTutorEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return INTERNAL_TEST_TUTOR_EMAILS.has(email.trim().toLowerCase());
}
