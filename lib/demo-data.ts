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

export const DEMO_STUDENTS: DemoStudent[] = [
  {
    id: "1",
    name: "Tomasz Kowalski",
    initials: "TK",
    subjectsLine: "Matematyka, Fizyka",
    phone: "+48 601 234 567",
    email: "tomasz.k@mail.example",
    guardian: "Rodzic: Piotr Kowalski",
    classLabel: "Egzamin ósmoklasisty",
    schoolClass: "Klasa 8",
    notes: "Przygotowanie do egzaminu ósmoklasisty. Preferuje zadania tekstowe.",
    ratePerHourPln: 75,
    nextLesson: "Jutro 16:00 · Matematyka",
  },
  {
    id: "2",
    name: "Anna Nowak",
    initials: "AN",
    subjectsLine: "Język polski, Historia",
    phone: "+48 602 345 678",
    email: "anna.nowak@mail.example",
    guardian: "Rodzic: Katarzyna Nowak",
    classLabel: "Szkoła podstawowa (kl. 1-8)",
    schoolClass: "Klasa 6",
    notes: "Czytanie ze zrozumieniem, wypracowania.",
    ratePerHourPln: 60,
    nextLesson: "Środa 14:30 · Polski",
  },
  {
    id: "3",
    name: "Kuba Wiśniewski",
    initials: "KW",
    subjectsLine: "Język angielski",
    phone: "+48 603 456 789",
    email: "kuba.w@mail.example",
    guardian: "Rodzic: Magdalena Wiśniewska",
    classLabel: "Szkoła podstawowa (kl. 1-8)",
    schoolClass: "Klasa 4",
    notes: "Poziom A2, gry i dialogi.",
    ratePerHourPln: 60,
    nextLesson: "Dziś 17:15 · Angielski",
  },
  {
    id: "4",
    name: "Zofia Lewandowska",
    initials: "ZL",
    subjectsLine: "Biologia, Chemia",
    phone: "+48 604 567 890",
    email: "zofia.l@mail.example",
    guardian: "Rodzic: Adam Lewandowski",
    classLabel: "Szkoła podstawowa (kl. 1-8)",
    schoolClass: "Klasa 7",
    notes: "Powtórki przed klasówkami, tablice.",
    ratePerHourPln: 60,
    nextLesson: "Piątek 15:00 · Biologia",
  },
];

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

export const DEMO_FINANCE_LINES: DemoFinanceLine[] = [
  { id: "1", studentName: "Tomasz Kowalski", label: "Matematyka · 90 min", amountPln: 90, date: "24.03" },
  { id: "2", studentName: "Anna Nowak", label: "J. polski · 60 min", amountPln: 55, date: "23.03" },
  { id: "3", studentName: "Kuba Wiśniewski", label: "Angielski · 60 min", amountPln: 50, date: "23.03" },
  { id: "4", studentName: "Zofia Lewandowska", label: "Biologia · 90 min", amountPln: 82, date: "22.03" },
  { id: "5", studentName: "Tomasz Kowalski", label: "Matematyka · 60 min", amountPln: 60, date: "20.03" },
  { id: "6", studentName: "Anna Nowak", label: "Historia · 60 min", amountPln: 55, date: "18.02" },
  { id: "7", studentName: "Kuba Wiśniewski", label: "Angielski · 60 min", amountPln: 50, date: "14.02" },
  { id: "8", studentName: "Zofia Lewandowska", label: "Chemia · 60 min", amountPln: 55, date: "16.01" },
] as const;
