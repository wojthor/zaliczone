/** Rodzaj współpracy - wpływa na to, czy wystawiasz PIT-11 (B2B zwykle nie). */
export const EMPLOYMENT_TYPES = [
  { value: "UMOWA_ZLECENIE", label: "Umowa zlecenie" },
  { value: "UMOWA_O_PRACE", label: "Umowa o pracę" },
  { value: "UMOWA_DZIELO", label: "Umowa o dzieło" },
  { value: "B2B", label: "B2B (JDG - faktura)" },
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]["value"];

export function isEmploymentType(v: string): v is EmploymentType {
  return EMPLOYMENT_TYPES.some((t) => t.value === v);
}

/** Ręczne pola roczne uzupełniane przez admina przy przygotowaniu PIT. */
export type TutorTaxYearEntry = {
  deductibleCostsPln: number;
  taxAdvancesPln: number;
  zusSocialPln: number;
  zusHealthPln: number;
  /** Ulga dla młodych (do 26. r.ż.) - zwolnienie z PIT, jeśli dotyczy */
  reliefYoung: boolean;
  notes: string;
};

export const EMPTY_TAX_YEAR: TutorTaxYearEntry = {
  deductibleCostsPln: 0,
  taxAdvancesPln: 0,
  zusSocialPln: 0,
  zusHealthPln: 0,
  reliefYoung: false,
  notes: "",
};

export type TutorTaxYearDataMap = Record<string, TutorTaxYearEntry>;

/** Dane identyfikacyjne potrzebne do PIT-11 (część A/C formularza). */
export type TutorPitIdentity = {
  pesel: string | null;
  birthDate: string | null;
  taxStreet: string | null;
  taxPostalCode: string | null;
  taxCity: string | null;
  taxCountry: string | null;
  taxOffice: string | null;
  nip: string | null;
  employmentType: EmploymentType | null;
};

export type TutorYearPayoutRow = {
  month: string;
  amount: number;
  lessonsAmount: number;
  bonusAmount: number;
  lessonCount: number;
};

export type TutorPitYearSummary = {
  year: number;
  /** Suma wypłat PAID w danym roku (przychód z systemu) */
  paidIncomePln: number;
  months: TutorYearPayoutRow[];
  taxEntry: TutorTaxYearEntry;
};
