export type DemoStudent = {
  id: string;
  name: string;
  initials: string;
  subjectsLine: string;
  phone: string;
  email: string;
  guardian: string;
  classLabel: string;
  schoolClass: string;
  notes: string;
  ratePerHourPln: number;
  nextLesson: string;
};

export type DemoCennikRow = {
  label: string;
  forClientPln: number;
  yourSharePln: number;
};

export const DEMO_CENNIK: DemoCennikRow[] = [
  { label: "Szkoła podstawowa (kl. 1-8)", forClientPln: 60, yourSharePln: 42 },
  { label: "Szkoła średnia", forClientPln: 70, yourSharePln: 49 },
  { label: "Przygotowanie do matury", forClientPln: 80, yourSharePln: 56 },
  { label: "Egzamin ósmoklasisty", forClientPln: 75, yourSharePln: 52 },
  { label: "Kursanci dorośli", forClientPln: 60, yourSharePln: 40 },
  { label: "Zajęcia indywidualne - intensywne", forClientPln: 90, yourSharePln: 63 },
] as const;

export const DEMO_ACTIVE_SUBJECTS = [
  "Matematyka",
  "Fizyka",
  "Język angielski",
  "Język polski",
  "Biologia",
  "Chemia",
  "Historia",
] as const;

export function subjectsFromLine(subjectsLine: string): string[] {
  return subjectsLine
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const DEMO_STUDENTS: DemoStudent[] = [];

export type DemoMessageCategory = "employer" | "system";

export type DemoMessage = {
  id: string;
  from: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  unread: boolean;
  category: DemoMessageCategory;
};

export const DEMO_MESSAGES: DemoMessage[] = [
  {
    id: "1",
    from: "Placówka Zaliczone",
    subject: "Rozliczenie godzin za marzec",
    preview: "Prosimy o sprawdzenie liczby zaliczonych lekcji przed zamknięciem miesiąca.",
    body:
      "Prosimy o sprawdzenie liczby zaliczonych lekcji przed zamknięciem miesiąca.\n\n" +
      "Jeśli któreś zajęcia odbyły się, ale nie zostały jeszcze oznaczone w terminarzu, uzupełnij je do końca tygodnia.\n\n" +
      "Po domknięciu miesiąca przygotujemy zestawienie do wypłaty.",
    date: "Dziś, 09:12",
    unread: true,
    category: "employer",
  },
  {
    id: "2",
    from: "Zaliczone · automat",
    subject: "Wypełnij ewidencję godzin",
    preview: "Zbliża się koniec miesiąca. Uzupełnij ewidencję i sprawdź kompletność zajęć.",
    body:
      "To automatyczne przypomnienie z panelu.\n\n" +
      "Na koniec miesiąca pamiętaj o:\n" +
      "• zaliczeniu wszystkich odbytych lekcji,\n" +
      "• sprawdzeniu braków w terminarzu,\n" +
      "• przygotowaniu ewidencji godzin do rozliczenia.",
    date: "Wczoraj",
    unread: true,
    category: "system",
  },
  {
    id: "3",
    from: "Placówka Zaliczone",
    subject: "Nowy uczeń przypisany do angielskiego",
    preview: "W tym tygodniu może dojść nowy uczeń do Twojego grafiku.",
    body:
      "W tym tygodniu może dojść nowy uczeń do Twojego grafiku.\n\n" +
      "Jeśli potwierdzimy termin, dostaniesz osobne powiadomienie i będzie można dopisać go do terminarza.",
    date: "25 mar",
    unread: false,
    category: "employer",
  },
  {
    id: "4",
    from: "Zaliczone · automat",
    subject: "Eksport ewidencji gotowy",
    preview: "Wersja demonstracyjna raportu godzin jest gotowa do pobrania w Profilu.",
    body:
      "Automatyczny komunikat systemowy.\n\n" +
      "Wersja demonstracyjna raportu godzin jest gotowa do pobrania w zakładce Profil.",
    date: "24 mar",
    unread: false,
    category: "system",
  },
];

export type DemoFinanceLine = {
  id: string;
  studentName: string;
  label: string;
  amountPln: number;
  date: string;
};

export const DEMO_FINANCE_LINES: DemoFinanceLine[] = [];
