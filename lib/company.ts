/**
 * Dane firmowe ZALICZONE - jedno miejsce do edycji, czytane m.in. przez zakładkę
 * „Przewodnik” (panel tutora) i wydruki księgowości. Podmień na docelowe dane firmy.
 */
export const COMPANY = {
  name: "Krzysztof Wilczyński",
  owner: "Krzysztof Wilczyński",
  nip: "………………",
  address: "ul. Gliwicka 3, 45-132, Opole",
  email: "kontakt@zaliczone.edu.pl",
  /** Numer rachunku do przelewów od rodziców / uczniów. */
  bankAccount: "39 1160 2202 0000 0007 3524 4970",
  /** Numer telefonu (kontakt / BLIK). */
  phone: "+48 780 890 905",
} as const;
