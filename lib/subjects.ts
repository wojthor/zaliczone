/**
 * Kanoniczna lista przedmiotów oferowanych w ZALICZONE. Używana wszędzie, gdzie
 * admin lub tutor wybiera przedmiot (konto nauczyciela, edycja profilu, wniosek
 * o przedmiot) - jedno miejsce do edycji zamiast rozjeżdżających się list.
 */
export const SUBJECTS = [
  "Matematyka",
  "Fizyka",
  "Chemia",
  "Biologia",
  "Angielski",
  "Niemiecki",
  "Hiszpański",
  "Francuski",
  "Polski",
  "Historia",
  "WOS",
  "Geografia",
  "Informatyka",
] as const;

export type Subject = (typeof SUBJECTS)[number];
