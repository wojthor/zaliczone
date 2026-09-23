/**
 * Seed „Filmik” — żywy panel nauczyciela pod nagranie instruktażowe.
 * Run: pnpm seed:filmik
 *
 * Wymaga: NEXT_PUBLIC_FILMIK=1 w .env.local (odblokowuje „Wygeneruj ewidencję”).
 * Powrót do czystej bazy: pnpm seed:clean  (+ usuń NEXT_PUBLIC_FILMIK)
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const TUTOR_EMAIL = "teacher@zaliczone.pl";

/** Imię + pierwsza litera nazwiska — jak w scenariuszu filmu. */
const STUDENTS = [
  {
    name: "Darek K.",
    subjects: ["Matematyka"],
    class_level: "Szkoła podstawowa",
    rate_pln: 60,
    phone: "500111222",
  },
  {
    name: "Patrycja M.",
    subjects: ["Matematyka"],
    class_level: "Szkoła podstawowa",
    rate_pln: 60,
    phone: "501222333",
  },
  {
    name: "Ola N.",
    subjects: ["Matematyka"],
    class_level: "Szkoła średnia",
    rate_pln: 70,
    phone: "502333444",
  },
  {
    name: "Kuba W.",
    subjects: ["Fizyka"],
    class_level: "Matura",
    rate_pln: 80,
    phone: "503444555",
  },
  {
    name: "Zosia K.",
    subjects: ["Matematyka"],
    class_level: "Szkoła podstawowa",
    rate_pln: 60,
    phone: "504555666",
  },
  {
    name: "Ania B.",
    subjects: ["Fizyka"],
    class_level: "Szkoła średnia",
    rate_pln: 75,
    phone: "505666777",
  },
];

/**
 * Sierpień 2026 — same VERIFIED (ewidencja + rozliczenie).
 * ~22 h → ładny postęp premii gdy ktoś przełączy miesiąc; w Finansach widać kwoty.
 */
const AUGUST_VERIFIED = [
  "2026-08-04",
  "2026-08-05",
  "2026-08-06",
  "2026-08-07",
  "2026-08-08",
  "2026-08-11",
  "2026-08-12",
  "2026-08-13",
  "2026-08-14",
  "2026-08-18",
  "2026-08-19",
  "2026-08-20",
  "2026-08-21",
  "2026-08-22",
  "2026-08-25",
  "2026-08-26",
  "2026-08-27",
  "2026-08-28",
  "2026-08-29",
  "2026-08-05",
  "2026-08-12",
  "2026-08-19",
];

/**
 * Wrzesień do ~21. — VERIFIED (pasek premiowy na dashboardzie, ~28 h).
 */
const SEPTEMBER_VERIFIED = [
  "2026-09-01",
  "2026-09-02",
  "2026-09-03",
  "2026-09-04",
  "2026-09-05",
  "2026-09-08",
  "2026-09-09",
  "2026-09-10",
  "2026-09-11",
  "2026-09-12",
  "2026-09-15",
  "2026-09-16",
  "2026-09-17",
  "2026-09-18",
  "2026-09-19",
  "2026-09-01",
  "2026-09-08",
  "2026-09-15",
  "2026-09-02",
  "2026-09-09",
  "2026-09-16",
  "2026-09-03",
  "2026-09-10",
  "2026-09-17",
  "2026-09-04",
  "2026-09-11",
  "2026-09-18",
  "2026-09-05",
];

/** Lekcje do „Zalicz” / weryfikacji / nieopłacone — tydzień nagrania (22–28.09). */
const WEEK_OF_FILM = [
  { date: "2026-09-22", start: "14:00", end: "15:00", studentIdx: 0, status: "PLANNED" },
  { date: "2026-09-22", start: "16:00", end: "17:00", studentIdx: 2, status: "PENDING_VERIFICATION" },
  { date: "2026-09-23", start: "15:00", end: "16:00", studentIdx: 1, status: "PLANNED" },
  { date: "2026-09-23", start: "17:00", end: "18:00", studentIdx: 3, status: "VERIFIED" },
  { date: "2026-09-24", start: "14:00", end: "15:00", studentIdx: 4, status: "PLANNED" },
  { date: "2026-09-24", start: "16:00", end: "17:00", studentIdx: 5, status: "UNPAID" },
  { date: "2026-09-25", start: "15:00", end: "16:00", studentIdx: 0, status: "PLANNED" },
  { date: "2026-09-25", start: "17:00", end: "18:00", studentIdx: 2, status: "PENDING_VERIFICATION" },
  { date: "2026-09-26", start: "14:00", end: "15:00", studentIdx: 1, status: "PLANNED" },
  { date: "2026-09-26", start: "16:00", end: "17:00", studentIdx: 3, status: "UNPAID" },
];

/** Wcześniejsze UNPAID / PENDING w miesiącu — kolory w mini-kalendarzu. */
const SEPTEMBER_EXTRA = [
  { date: "2026-09-08", start: "18:00", end: "19:00", studentIdx: 5, status: "UNPAID" },
  { date: "2026-09-12", start: "18:00", end: "19:00", studentIdx: 4, status: "PENDING_VERIFICATION" },
  { date: "2026-09-19", start: "18:00", end: "19:00", studentIdx: 0, status: "PENDING_VERIFICATION" },
];

function adminHeaders(extra = {}) {
  return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, ...extra };
}

async function listUsers() {
  const res = await fetch(`${url}/auth/v1/admin/users?per_page=200`, { headers: adminHeaders() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.msg || JSON.stringify(body));
  return body.users ?? [];
}

async function restDelete(table, filter) {
  const res = await fetch(`${url}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: adminHeaders({ Prefer: "return=minimal" }),
  });
  if (!res.ok && res.status !== 404) throw new Error(`${table}: ${await res.text()}`);
}

async function restInsert(table, rows) {
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${table}: ${await res.text()}`);
  return res.json();
}

async function restPatch(table, filter, body) {
  const res = await fetch(`${url}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: adminHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${table} patch: ${await res.text()}`);
}

function pickSubject(student) {
  return student.subjects[0] ?? "Matematyka";
}

function lessonRow(tutorId, student, date, start, end, status) {
  return {
    tutor_id: tutorId,
    student_id: student.id,
    date,
    start_time: start,
    end_time: end,
    subject: pickSubject(student),
    status,
  };
}

async function main() {
  console.log("🎬 Seed Filmik — panel jak po kilku tygodniach pracy\n");

  if (process.env.NEXT_PUBLIC_FILMIK !== "1" && process.env.NEXT_PUBLIC_FILMIK !== "true") {
    console.log("⚠  NEXT_PUBLIC_FILMIK nie jest włączone — ewidencja może być zablokowana datą.");
    console.log("   Dodaj do .env.local: NEXT_PUBLIC_FILMIK=1  i zrestartuj pnpm dev\n");
  }

  const users = await listUsers();
  const tutorId = users.find((u) => u.email === TUTOR_EMAIL)?.id;
  if (!tutorId) {
    console.error(`Brak konta ${TUTOR_EMAIL}. Uruchom najpierw: pnpm seed:clean`);
    process.exit(1);
  }

  await restDelete("lessons", `tutor_id=eq.${tutorId}`);
  await restDelete("subject_requests", `tutor_id=eq.${tutorId}`);
  await restDelete("students", `tutor_id=eq.${tutorId}`);
  console.log("✓ Wyczyszczono stare lekcje / uczniów / zgłoszenia przedmiotów Benio");

  await restPatch(`profiles`, `id=eq.${tutorId}`, {
    full_name: "Benio Beniowski",
    active_subjects: ["Matematyka", "Fizyka"],
    phone: "600700800",
    bank_account: "12 ACCT-000009 9012 3456",
    olx_url: "https://www.olx.pl/d/oferta/korepetycje-matematyka-fizyka-filmik",
    accepting_students: true,
  });
  console.log("✓ Profil: OLX, przyjmuje uczniów, telefon / konto");

  const studentRows = STUDENTS.map((s) => ({
    name: s.name,
    subjects: s.subjects,
    class_level: s.class_level,
    rate_pln: s.rate_pln,
    phone: s.phone,
    tutor_id: tutorId,
  }));
  const insertedStudents = await restInsert("students", studentRows);
  console.log(`✓ ${insertedStudents.length} uczniów (imię + inicjał)`);

  await restInsert("subject_requests", [
    {
      tutor_id: tutorId,
      subject: "Chemia · Szkoła średnia",
      status: "PENDING",
    },
  ]);
  console.log("✓ Zgłoszenie przedmiotu Chemia (oczekujące) — Profil");

  const lessons = [];

  for (let i = 0; i < AUGUST_VERIFIED.length; i++) {
    const student = insertedStudents[i % insertedStudents.length];
    lessons.push(
      lessonRow(tutorId, student, AUGUST_VERIFIED[i], i % 2 === 0 ? "15:00" : "16:00", i % 2 === 0 ? "16:00" : "17:00", "VERIFIED"),
    );
  }

  for (let i = 0; i < SEPTEMBER_VERIFIED.length; i++) {
    const student = insertedStudents[i % insertedStudents.length];
    lessons.push(
      lessonRow(
        tutorId,
        student,
        SEPTEMBER_VERIFIED[i],
        i % 2 === 0 ? "14:00" : "15:00",
        i % 2 === 0 ? "15:00" : "16:00",
        "VERIFIED",
      ),
    );
  }

  for (const slot of [...WEEK_OF_FILM, ...SEPTEMBER_EXTRA]) {
    const student = insertedStudents[slot.studentIdx];
    lessons.push(lessonRow(tutorId, student, slot.date, slot.start, slot.end, slot.status));
  }

  const inserted = await restInsert("lessons", lessons);

  const verifiedRows = inserted.filter((l) => l.status === "VERIFIED");
  if (verifiedRows.length > 0) {
    for (const row of verifiedRows) {
      const res = await fetch(`${url}/rest/v1/lessons?id=eq.${row.id}`, {
        method: "PATCH",
        headers: adminHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify({ payment_received_at: row.date }),
      });
      if (!res.ok) {
        console.log("ℹ Kolumna payment_received_at niedostępna — migracja 0004.");
        break;
      }
    }
  }

  const counts = inserted.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  console.log(`✓ ${inserted.length} lekcji:`, counts);
  console.log("\n✅ Gotowe (Filmik).");
  console.log("  teacher@zaliczone.pl / 123456");
  console.log("  Dashboard: tydzień 22–28.09, Zalicz, pasek premii, kalendarz z kolorami");
  console.log("  Finanse → miesiąc sierpień lub wrzesień → „Wygeneruj ewidencję” (przy NEXT_PUBLIC_FILMIK=1)");
  console.log("\n  Powrót: pnpm seed:clean  + usuń NEXT_PUBLIC_FILMIK z .env.local");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
