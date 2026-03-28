export type DemoStudent = {
  id: string;
  name: string;
  initials: string;
  subjectsLine: string;
  phone: string;
  email: string;
  guardian: string;
  classLabel: string;
  notes: string;
  ratePerHourPln: number;
  nextLesson: string;
};

export const DEMO_STUDENTS: DemoStudent[] = [
  {
    id: "1",
    name: "Tomasz Kowalski",
    initials: "TK",
    subjectsLine: "Matematyka, Fizyka",
    phone: "+48 601 234 567",
    email: "tomasz.k@mail.example",
    guardian: "Rodzic: Piotr Kowalski",
    classLabel: "Szkoła podstawowa, kl. 8",
    notes: "Przygotowanie do egzaminu ósmoklasisty. Preferuje zadania tekstowe.",
    ratePerHourPln: 60,
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
    classLabel: "Szkoła podstawowa, kl. 6",
    notes: "Czytanie ze zrozumieniem, wypracowania.",
    ratePerHourPln: 55,
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
    classLabel: "Szkoła podstawowa, kl. 4",
    notes: "Poziom A2, gry i dialogi.",
    ratePerHourPln: 50,
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
    classLabel: "Szkoła podstawowa, kl. 7",
    notes: "Powtórki przed klasówkami, tablice.",
    ratePerHourPln: 55,
    nextLesson: "Piątek 15:00 · Biologia",
  },
];

export type DemoMessage = {
  id: string;
  from: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  unread: boolean;
};

export const DEMO_MESSAGES: DemoMessage[] = [
  {
    id: "1",
    from: "Katarzyna Nowak",
    subject: "Przesunięcie lekcji Ani",
    preview: "Czy możemy przełożyć środowe spotkanie na czwartek?",
    body: "Dzień dobry,\nczy możemy przełożyć środowe spotkanie na czwartek o tej samej godzinie? Pozdrawiam,\nKatarzyna",
    date: "Dziś, 09:12",
    unread: true,
  },
  {
    id: "2",
    from: "Piotr Kowalski",
    subject: "Faktura za luty",
    preview: "Proszę o wystawienie faktury na firmę…",
    body: "Proszę o wystawienie faktury na firmę EduKids Sp. z o.o., NIP … Kwota jak ustalaliśmy za 8 godzin.\nPozdrawiam,\nPiotr",
    date: "Wczoraj",
    unread: true,
  },
  {
    id: "3",
    from: "Biuro szkoły",
    subject: "Potwierdzenie sali",
    preview: "Sala 12 zarezerwowana w sobotę…",
    body: "Potwierdzamy rezerwację sali 12 na sobotę 10:00–12:00.\nBiuro",
    date: "25 mar",
    unread: false,
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
];
