/**
 * Battle-test seed - temporal anchor: Monday, July 13, 2026
 * Run: pnpm seed:battle
 *
 * Requires migration 0002_lesson_status_workflow.sql applied in Supabase.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const TUTOR_SHARE = 0.7;

const ACCOUNTS = [
  { email: "admin@zaliczone.pl", password: "123456", role: "ADMIN", full_name: "Administrator", subjects: [] },
  { email: "teacher@zaliczone.pl", password: "123456", role: "TUTOR", full_name: "Benio Beniowski", subjects: ["Matematyka", "Fizyka"] },
  { email: "martyna@zaliczone.pl", password: "123456", role: "TUTOR", full_name: "Martyna Wilczyńska", subjects: ["Chemia", "Biologia"] },
  { email: "marcel@zaliczone.pl", password: "123456", role: "TUTOR", full_name: "Marcel Kowalski", subjects: ["Angielski", "Historia"] },
];

const STUDENTS_BY_TUTOR = {
  "teacher@zaliczone.pl": [
    { name: "Ola Nowak", subjects: ["Matematyka"], class_level: "Szkoła średnia", rate_pln: 70 },
    { name: "Kuba Wiśniewski", subjects: ["Fizyka"], class_level: "Matura", rate_pln: 80 },
    { name: "Zosia Kamińska", subjects: ["Matematyka"], class_level: "Szkoła podstawowa", rate_pln: 60 },
  ],
  "martyna@zaliczone.pl": [
    { name: "Maja Lewandowska", subjects: ["Chemia"], class_level: "Matura", rate_pln: 80 },
    { name: "Filip Zieliński", subjects: ["Biologia"], class_level: "Szkoła średnia", rate_pln: 70 },
  ],
  "marcel@zaliczone.pl": [
    { name: "Nina Wójcik", subjects: ["Angielski"], class_level: "Szkoła średnia", rate_pln: 70 },
    { name: "Antoni Mazur", subjects: ["Historia"], class_level: "Szkoła podstawowa", rate_pln: 60 },
    { name: "Lena Pawlak", subjects: ["Angielski"], class_level: "Matura", rate_pln: 80 },
  ],
};

function adminHeaders(extra = {}) {
  return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, ...extra };
}

async function listUsers() {
  const res = await fetch(`${url}/auth/v1/admin/users?per_page=200`, { headers: adminHeaders() });
  const body = await res.json();
  if (!res.ok) throw new Error(body.msg || JSON.stringify(body));
  return body.users ?? [];
}

async function createUser(account) {
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { role: account.role, full_name: account.full_name },
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.msg || JSON.stringify(body));
  return body.id ?? body.user?.id;
}

async function upsertProfile(userId, account) {
  const res = await fetch(`${url}/rest/v1/profiles`, {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" }),
    body: JSON.stringify({
      id: userId,
      role: account.role,
      full_name: account.full_name,
      active_subjects: account.subjects,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function restDelete(table, filter) {
  const res = await fetch(`${url}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: adminHeaders({ Prefer: "return=minimal" }),
  });
  if (!res.ok && res.status !== 404) throw new Error(await res.text());
}

async function restInsert(table, rows) {
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function lessonAmount(rate, start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  return Math.round((rate * mins) / 60);
}

function juneLessons(tutorId, studentId, subject, rate, days) {
  return days.map((date) => ({
    tutor_id: tutorId,
    student_id: studentId,
    date,
    start_time: "16:00",
    end_time: "17:00",
    subject,
    status: "VERIFIED",
    _rate: rate,
  }));
}

function weekLessons(tutorId, studentId, subject, rate, dates, status) {
  return dates.map((date) => ({
    tutor_id: tutorId,
    student_id: studentId,
    date,
    start_time: "15:00",
    end_time: "16:00",
    subject,
    status,
    _rate: rate,
  }));
}

async function main() {
  console.log("🌱 Battle seed - anchor: 2026-07-13\n");

  const userIds = {};
  for (const account of ACCOUNTS) {
    const users = await listUsers();
    let id = users.find((u) => u.email === account.email)?.id;
    if (!id) id = await createUser(account);
    await upsertProfile(id, account);
    userIds[account.email] = id;
    console.log(`✓ ${account.email}`);
  }

  console.log("\nClearing demo data…");
  await restDelete("lessons", "id=not.is.null");
  await restDelete("students", "id=not.is.null");
  await restDelete("payouts", "id=not.is.null");
  await restDelete("subject_requests", "id=not.is.null");

  const studentIds = {};
  for (const [email, students] of Object.entries(STUDENTS_BY_TUTOR)) {
    const tutorId = userIds[email];
    const rows = students.map((s) => ({ ...s, tutor_id: tutorId }));
    const inserted = await restInsert("students", rows);
    studentIds[email] = inserted;
    console.log(`  ${email}: ${inserted.length} students`);
  }

  const benio = studentIds["teacher@zaliczone.pl"];
  const martyna = studentIds["martyna@zaliczone.pl"];
  const marcel = studentIds["marcel@zaliczone.pl"];

  const lessons = [];

  // June 2026 - VERIFIED (historical, paid out)
  lessons.push(...juneLessons(userIds["teacher@zaliczone.pl"], benio[0].id, "Matematyka", 70, ["2026-06-03", "2026-06-10", "2026-06-17", "2026-06-24"]));
  lessons.push(...juneLessons(userIds["teacher@zaliczone.pl"], benio[1].id, "Fizyka", 80, ["2026-06-05", "2026-06-12", "2026-06-19"]));
  lessons.push(...juneLessons(userIds["martyna@zaliczone.pl"], martyna[0].id, "Chemia", 80, ["2026-06-04", "2026-06-11", "2026-06-18", "2026-06-25"]));
  lessons.push(...juneLessons(userIds["martyna@zaliczone.pl"], martyna[1].id, "Biologia", 70, ["2026-06-06", "2026-06-13", "2026-06-20"]));
  lessons.push(...juneLessons(userIds["marcel@zaliczone.pl"], marcel[0].id, "Angielski", 70, ["2026-06-02", "2026-06-09", "2026-06-16", "2026-06-23", "2026-06-30"]));
  lessons.push(...juneLessons(userIds["marcel@zaliczone.pl"], marcel[1].id, "Historia", 60, ["2026-06-07", "2026-06-14", "2026-06-21"]));

  // Previous week July 6–12 - admin verifies today
  lessons.push(...weekLessons(userIds["teacher@zaliczone.pl"], benio[0].id, "Matematyka", 70, ["2026-07-07", "2026-07-09"], "PENDING_VERIFICATION"));
  lessons.push(...weekLessons(userIds["teacher@zaliczone.pl"], benio[2].id, "Matematyka", 60, ["2026-07-08"], "PENDING_VERIFICATION"));
  lessons.push(...weekLessons(userIds["martyna@zaliczone.pl"], martyna[0].id, "Chemia", 80, ["2026-07-06", "2026-07-10"], "PENDING_VERIFICATION"));
  lessons.push(...weekLessons(userIds["martyna@zaliczone.pl"], martyna[1].id, "Biologia", 70, ["2026-07-07", "2026-07-11"], "UNPAID"));
  lessons.push(...weekLessons(userIds["martyna@zaliczone.pl"], martyna[0].id, "Chemia", 80, ["2026-07-12"], "UNPAID"));
  lessons.push(...weekLessons(userIds["marcel@zaliczone.pl"], marcel[0].id, "Angielski", 70, ["2026-07-06", "2026-07-08", "2026-07-10"], "VERIFIED"));
  lessons.push(...weekLessons(userIds["marcel@zaliczone.pl"], marcel[2].id, "Angielski", 80, ["2026-07-07", "2026-07-09"], "PENDING_VERIFICATION"));
  lessons.push(...weekLessons(userIds["marcel@zaliczone.pl"], marcel[1].id, "Historia", 60, ["2026-07-11"], "PENDING_VERIFICATION"));

  // Current week July 13–19 - PLANNED
  const plannedDates = ["2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17"];
  for (const [email, studs] of Object.entries(studentIds)) {
    const tutorId = userIds[email];
    for (let i = 0; i < studs.length; i++) {
      const s = studs[i];
      const dates = plannedDates.filter((_, idx) => idx % studs.length === i).slice(0, 2);
      for (const date of dates) {
        lessons.push({
          tutor_id: tutorId,
          student_id: s.id,
          date,
          start_time: i % 2 === 0 ? "14:00" : "17:00",
          end_time: i % 2 === 0 ? "15:00" : "18:00",
          subject: s.subjects[0],
          status: "PLANNED",
          _rate: s.rate_pln,
        });
      }
    }
  }

  const lessonRows = lessons.map((l) => {
    const row = { ...l };
    delete row._rate;
    return row;
  });
  await restInsert("lessons", lessonRows);
  console.log(`\n✓ ${lessonRows.length} lessons inserted`);

  const payouts = [];
  for (const email of ["teacher@zaliczone.pl", "martyna@zaliczone.pl", "marcel@zaliczone.pl"]) {
    const tutorId = userIds[email];
    const juneVerified = lessons.filter((l) => l.tutor_id === tutorId && l.date.startsWith("2026-06") && l.status === "VERIFIED");
    const amount = Math.round(juneVerified.reduce((sum, l) => sum + lessonAmount(l._rate, l.start_time, l.end_time), 0) * TUTOR_SHARE);
    payouts.push({ tutor_id: tutorId, month: "2026-06", amount, status: "PAID" });
  }
  await restInsert("payouts", payouts);
  console.log(`✓ ${payouts.length} June payouts (PAID)`);

  console.log("\n✅ Battle seed complete. Log in as:");
  console.log("  admin@zaliczone.pl / 123456");
  console.log("  teacher@zaliczone.pl / 123456 (Benio)");
  console.log("  martyna@zaliczone.pl / 123456");
  console.log("  marcel@zaliczone.pl / 123456");
  console.log("\nAdmin → Rozliczenia: verify July 6–12 lessons.");
  console.log("Martyna has 2 UNPAID (red alert). Marcel has 3 VERIFIED.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
