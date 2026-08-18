/**
 * Demo lekcje dla Benio - losowy podział VERIFIED / UNPAID (tydzień 6–12 lipca 2026)
 * Run: pnpm seed:demo
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const TUTOR_EMAIL = "teacher@zaliczone.pl";

const STUDENTS = [
  { name: "Ola Nowak", subjects: ["Matematyka"], class_level: "Szkoła średnia", rate_pln: 70 },
  { name: "Kuba Wiśniewski", subjects: ["Fizyka"], class_level: "Matura", rate_pln: 80 },
  { name: "Zosia Kamińska", subjects: ["Matematyka"], class_level: "Szkoła podstawowa", rate_pln: 60 },
];

/** Poprzedni tydzień względem 14 lipca 2026 - widoczny domyślnie w Rozliczeniach */
const SETTLEMENT_DATES = [
  "2026-07-06",
  "2026-07-07",
  "2026-07-08",
  "2026-07-09",
  "2026-07-10",
  "2026-07-11",
  "2026-07-07",
  "2026-07-08",
  "2026-07-09",
  "2026-07-10",
  "2026-07-11",
  "2026-07-12",
];

const CURRENT_WEEK_PLANNED = [
  { date: "2026-07-14", subject: "Matematyka", studentIdx: 0 },
  { date: "2026-07-15", subject: "Fizyka", studentIdx: 1 },
  { date: "2026-07-16", subject: "Matematyka", studentIdx: 2 },
  { date: "2026-07-17", subject: "Matematyka", studentIdx: 0 },
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

/** Mix do testów rozliczeń: część do zatwierdzenia, część już rozliczona */
function randomSettlementStatus() {
  const r = Math.random();
  if (r < 0.4) return "PENDING_VERIFICATION";
  if (r < 0.75) return "VERIFIED";
  return "UNPAID";
}

function pickSubject(student) {
  return student.subjects[0] ?? "Matematyka";
}

async function main() {
  console.log("🎲 Seed demo - Benio, losowe VERIFIED / UNPAID\n");

  const users = await listUsers();
  const tutorId = users.find((u) => u.email === TUTOR_EMAIL)?.id;
  if (!tutorId) {
    console.error(`Brak konta ${TUTOR_EMAIL}. Uruchom najpierw: pnpm seed:clean`);
    process.exit(1);
  }

  await restDelete("lessons", `tutor_id=eq.${tutorId}`);
  await restDelete("students", `tutor_id=eq.${tutorId}`);
  console.log("✓ Wyczyszczono stare lekcje i uczniów Benio");

  const studentRows = STUDENTS.map((s) => ({ ...s, tutor_id: tutorId }));
  const insertedStudents = await restInsert("students", studentRows);
  console.log(`✓ ${insertedStudents.length} uczniów`);

  const lessons = [];
  let verified = 0;
  let unpaid = 0;
  let pending = 0;

  for (let i = 0; i < SETTLEMENT_DATES.length; i++) {
    const date = SETTLEMENT_DATES[i];
    const student = insertedStudents[i % insertedStudents.length];
    const status = randomSettlementStatus();
    if (status === "VERIFIED") verified += 1;
    else if (status === "UNPAID") unpaid += 1;
    else pending += 1;

    const row = {
      tutor_id: tutorId,
      student_id: student.id,
      date,
      start_time: i % 2 === 0 ? "15:00" : "16:00",
      end_time: i % 2 === 0 ? "16:00" : "17:00",
      subject: pickSubject(student),
      status,
    };
    lessons.push(row);
  }

  for (const slot of CURRENT_WEEK_PLANNED) {
    const student = insertedStudents[slot.studentIdx];
    lessons.push({
      tutor_id: tutorId,
      student_id: student.id,
      date: slot.date,
      start_time: "14:00",
      end_time: "15:00",
      subject: slot.subject,
      status: "PLANNED",
    });
  }

  const inserted = await restInsert("lessons", lessons);

  // Opcjonalnie: data wpływu (wymaga migracji 0004)
  const verifiedRows = inserted.filter((l) => l.status === "VERIFIED");
  if (verifiedRows.length > 0) {
    for (const row of verifiedRows) {
      const res = await fetch(`${url}/rest/v1/lessons?id=eq.${row.id}`, {
        method: "PATCH",
        headers: adminHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify({ payment_received_at: row.date }),
      });
      if (!res.ok) {
        console.log("ℹ Kolumna payment_received_at niedostępna - uruchom migrację 0004 w Supabase.");
        break;
      }
    }
  }

  console.log(
    `✓ ${inserted.length} lekcji (${pending} PENDING, ${verified} VERIFIED, ${unpaid} UNPAID, ${CURRENT_WEEK_PLANNED.length} PLANNED)`,
  );

  console.log("\n✅ Gotowe.");
  console.log("  Admin → Rozliczenia: tydzień 6–12 lipca 2026 (domyślny widok)");
  console.log("  teacher@zaliczone.pl / 123456 → terminarz z lekcjami");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
