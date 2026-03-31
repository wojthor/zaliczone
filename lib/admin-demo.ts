export type AdminTutorStatus = "aktywny" | "wstrzymany" | "zablokowany" | "zakonczony";

export type AdminTutor = {
  id: string;
  name: string;
  email: string;
  phone: string;
  bankAccount: string;
  status: AdminTutorStatus;
  subjects: string[];
  students: number;
  lessonsDoneMonth: number;
  pendingPln: number;
  paidPln: number;
};

export const ADMIN_TUTORS: AdminTutor[] = [
  {
    id: "t1",
    name: "Anna Nowak",
    email: "anna.nowak@mail.example",
    phone: "+48 600 100 101",
    bankAccount: "12 3456 7890 1234 5678 9012 3456",
    status: "aktywny",
    subjects: ["Angielski", "Polski"],
    students: 9,
    lessonsDoneMonth: 34,
    pendingPln: 1240,
    paidPln: 3810,
  },
  {
    id: "t2",
    name: "Michał Zieliński",
    email: "michal.z@mail.example",
    phone: "+48 600 100 202",
    bankAccount: "98 7654 3210 9876 5432 1098 7654",
    status: "aktywny",
    subjects: ["Matematyka", "Fizyka"],
    students: 12,
    lessonsDoneMonth: 41,
    pendingPln: 980,
    paidPln: 4520,
  },
  {
    id: "t3",
    name: "Karolina Wiśniewska",
    email: "karolina.w@mail.example",
    phone: "+48 600 100 303",
    bankAccount: "44 1111 2222 3333 4444 5555 6666",
    status: "wstrzymany",
    subjects: ["Chemia", "Biologia"],
    students: 6,
    lessonsDoneMonth: 18,
    pendingPln: 760,
    paidPln: 2100,
  },
];

export type AdminPendingSubject = {
  id: string;
  tutorName: string;
  subject: string;
  level: string;
};

export const ADMIN_PENDING_SUBJECTS: AdminPendingSubject[] = [
  { id: "p1", tutorName: "Anna Nowak", subject: "Hiszpański", level: "A1-A2" },
  { id: "p2", tutorName: "Michał Zieliński", subject: "Informatyka", level: "LO" },
];

export type AdminAnnouncement = {
  id: string;
  title: string;
  body: string;
  date: string;
};

export const ADMIN_ANNOUNCEMENTS: AdminAnnouncement[] = [
  {
    id: "a1",
    title: "Przypomnienie o grafikach",
    body: "Do piątku uzupełnijcie terminy na następny tydzień.",
    date: "Dziś",
  },
  {
    id: "a2",
    title: "Rozliczenia miesiąca",
    body: "Proszę domknąć zaległe lekcje do końca dnia.",
    date: "Wczoraj",
  },
];

/** Alerty generowane automatycznie (płatności, rozliczenia) — skrzynka admina. */
export type AdminSystemAlert = {
  id: string;
  from: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  unread: boolean;
};

export const ADMIN_SYSTEM_ALERTS: AdminSystemAlert[] = [
  {
    id: "sys-1",
    from: "System · rozliczenia",
    subject: "Płatność zaległa — Tomasz Kowalski",
    preview:
      "LEKCJA TOMKA JEST NIEOPLACONA OD TYGODNIA! Kwota 90 zł (Matematyka, 24.03). Wymagana interwencja lub przypomnienie do rodzica.",
    body:
      "LEKCJA TOMKA JEST NIEOPLACONA OD TYGODNIA!\n\n" +
      "Uczeń: Tomasz Kowalski\nPrzedmiot: Matematyka\nData zajęć: 24.03\nKwota: 90 zł\n\n" +
      "Płatność nie została zaksięgowana od 7 dni. Sugerowane działania:\n" +
      "• wysłanie przypomnienia do rodzica (Piotr Kowalski),\n" +
      "• weryfikacja statusu w Rozliczeniach,\n" +
      "• eskalacja do biura jeśli brak reakcji do 48 h.\n\n" +
      "Ten komunikat został wygenerowany automatycznie.",
    date: "Dziś, 08:02",
    unread: true,
  },
  {
    id: "sys-2",
    from: "System · nauczyciele",
    subject: "Nowy przedmiot oczekuje na akceptację",
    preview:
      "Michał Zieliński zgłosił prowadzenie przedmiotu „Informatyka” (poziom LO). Przejdź do Cennik i przedmioty.",
    body:
      "Nauczyciel: Michał Zieliński\n" +
      "Zgłoszony przedmiot: Informatyka\nPoziom: szkoła średnia (LO)\n\n" +
      "Prośba o weryfikację stawki i dodanie przedmiotu do cennika. Po akceptacji nauczyciel otrzyma powiadomienie e-mail (symulacja).\n\n" +
      "Przejdź do sekcji „Cennik i przedmioty” → „Oczekujące przedmioty”.",
    date: "Dziś, 07:15",
    unread: true,
  },
  {
    id: "sys-3",
    from: "System · płatności",
    subject: "Przekroczony termin wypłaty dla korepetytora",
    preview:
      "ANNA NOWAK — WYPŁATA ZA 12 ZAJĘĆ NADAL W STATUSIE „OCZEKUJĄCE” OD 5 DNI. Sprawdź Rozliczenia.",
    body:
      "ANNA NOWAK — WYPŁATA ZA 12 ZAJĘĆ NADAL W STATUSIE „OCZEKUJĄCE” OD 5 DNI.\n\n" +
      "Kwota łączna (oczekujące): 1 240 zł wg ostatniego zestawienia.\n" +
      "Proszę sprawdzić panel Rozliczenia i potwierdzić wypłatę lub skontaktować się z księgowością.\n\n" +
      "Alert wygenerowany automatycznie z modułu płatności.",
    date: "Wczoraj, 18:40",
    unread: false,
  },
];

export type AdminStudentMessage = {
  id: string;
  studentName: string;
  subject: string;
  preview: string;
  date: string;
  unread: boolean;
};

export const ADMIN_STUDENT_MESSAGES: AdminStudentMessage[] = [
  {
    id: "s1",
    studentName: "Tomasz Kowalski",
    subject: "Zmiana godziny",
    preview: "Czy możemy przełożyć lekcję z wtorku na środę?",
    date: "Dziś, 08:40",
    unread: true,
  },
  {
    id: "s2",
    studentName: "Anna Nowak",
    subject: "Prośba o dodatkowe zajęcia",
    preview: "Czy da się dodać 1h przed sprawdzianem?",
    date: "Wczoraj, 20:11",
    unread: false,
  },
];
