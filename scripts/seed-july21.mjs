/**
 * Seed na dzień 21 lipca 2026 (środek miesiąca).
 *
 * - Czerwiec 2026: wszystkie lekcje VERIFIED, wypłaty PAID, miesiąc zamknięty
 * - Lipiec 2026: w toku - mix VERIFIED / PENDING_VERIFICATION / PLANNED
 * - Brak lekcji UNPAID
 *
 * Run: pnpm seed:july21
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const TUTOR_SHARE = 0.7;
const ANCHOR = "2026-07-21";

const ACCOUNTS = [
  {
    email: "admin@zaliczone.pl",
    password: "123456",
    role: "ADMIN",
    full_name: "Administrator",
    subjects: [],
    phone: null,
    bank_account: null,
  },
  {
    email: "teacher@zaliczone.pl",
    password: "123456",
    role: "TUTOR",
    full_name: "Benio Beniowski",
    subjects: ["Matematyka", "Fizyka"],
    phone: "+48 500 111 222",
    bank_account: "12 1050 1025 1000 0092 1234 5678",
  },
  {
    email: "martyna@zaliczone.pl",
    password: "123456",
    role: "TUTOR",
    full_name: "Martyna Wilczyńska",
    subjects: ["Chemia", "Biologia"],
    phone: "+48 501 333 444",
    bank_account: "61 1140 2004 0000 3102 0137 5487",
  },
  {
    email: "marcel@zaliczone.pl",
    password: "123456",
    role: "TUTOR",
    full_name: "Marcel Kowalski",
    subjects: ["Angielski", "Historia"],
    phone: "+48 502 555 666",
    bank_account: "27 1090 2590 0000 0001 2345 6789",
  },
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
    { name: "Hania Król", subjects: ["Chemia"], class_level: "Szkoła podstawowa", rate_pln: 60 },
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
      phone: account.phone,
      bank_account: account.bank_account,
      contract_start: account.role === "TUTOR" ? "2026-03-01" : null,
      contract_end: null,
    }),
  });
  if (!res.ok) throw new Error(`profiles ${account.email}: ${await res.text()}`);
}

async function restDelete(table, filter) {
  const res = await fetch(`${url}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: adminHeaders({ Prefer: "return=minimal" }),
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    // tabela może nie istnieć w niektórych środowiskach
    if (text.includes("does not exist") || text.includes("PGRST205") || text.includes("42P01")) {
      console.log(`  ℹ pominięto ${table} (brak tabeli)`);
      return;
    }
    throw new Error(`${table}: ${text}`);
  }
}

async function restInsert(table, rows) {
  if (!rows.length) return [];
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
  return res.ok;
}

function lessonAmount(rate, start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  return Math.round((rate * mins) / 60);
}

function L(tutorId, studentId, subject, rate, date, start, end, status, paymentMethod = null) {
  return {
    tutor_id: tutorId,
    student_id: studentId,
    date,
    start_time: start,
    end_time: end,
    subject,
    status,
    payment_method: status === "VERIFIED" ? paymentMethod ?? "przelew" : null,
    _rate: rate,
  };
}

async function main() {
  console.log(`🌱 Seed - kotwica czasowa: ${ANCHOR} (środek lipca)\n`);

  const userIds = {};
  for (const account of ACCOUNTS) {
    const users = await listUsers();
    let id = users.find((u) => u.email === account.email)?.id;
    if (!id) id = await createUser(account);
    await upsertProfile(id, account);
    userIds[account.email] = id;
    console.log(`✓ ${account.email}`);
  }

  console.log("\nCzyszczenie danych operacyjnych…");
  await restDelete("message_recipients", "id=not.is.null");
  await restDelete("admin_messages", "id=not.is.null");
  await restDelete("lessons", "id=not.is.null");
  await restDelete("payouts", "id=not.is.null");
  await restDelete("subject_requests", "id=not.is.null");
  await restDelete("operating_expenses", "id=not.is.null");
  await restDelete("closed_months", "month=not.is.null");
  await restDelete("students", "id=not.is.null");
  console.log("✓ wyczyszczono");

  const studentIds = {};
  for (const [email, students] of Object.entries(STUDENTS_BY_TUTOR)) {
    const tutorId = userIds[email];
    const inserted = await restInsert(
      "students",
      students.map((s) => ({ ...s, tutor_id: tutorId })),
    );
    studentIds[email] = inserted;
    console.log(`  ${email}: ${inserted.length} uczniów`);
  }

  const benio = studentIds["teacher@zaliczone.pl"];
  const martyna = studentIds["martyna@zaliczone.pl"];
  const marcel = studentIds["marcel@zaliczone.pl"];
  const tBenio = userIds["teacher@zaliczone.pl"];
  const tMartyna = userIds["martyna@zaliczone.pl"];
  const tMarcel = userIds["marcel@zaliczone.pl"];

  const lessons = [];

  // ── CZERWIEC 2026 - zamknięty, wszystko VERIFIED ──────────────────────────
  const juneBenio = [
    ["2026-06-02", "16:00", "17:00", 0, "Matematyka"],
    ["2026-06-03", "17:00", "18:00", 1, "Fizyka"],
    ["2026-06-05", "16:00", "17:00", 2, "Matematyka"],
    ["2026-06-09", "16:00", "17:00", 0, "Matematyka"],
    ["2026-06-10", "17:00", "18:00", 1, "Fizyka"],
    ["2026-06-12", "15:00", "16:00", 2, "Matematyka"],
    ["2026-06-16", "16:00", "17:00", 0, "Matematyka"],
    ["2026-06-17", "17:00", "18:00", 1, "Fizyka"],
    ["2026-06-19", "16:00", "17:30", 0, "Matematyka"],
    ["2026-06-23", "16:00", "17:00", 2, "Matematyka"],
    ["2026-06-24", "17:00", "18:00", 1, "Fizyka"],
    ["2026-06-26", "15:00", "16:00", 0, "Matematyka"],
    ["2026-06-30", "16:00", "17:00", 1, "Fizyka"],
  ];
  for (const [date, start, end, si, subject] of juneBenio) {
    const s = benio[si];
    lessons.push(L(tBenio, s.id, subject, s.rate_pln, date, start, end, "VERIFIED", "przelew"));
  }

  const juneMartyna = [
    ["2026-06-03", "15:00", "16:00", 0, "Chemia"],
    ["2026-06-04", "16:00", "17:00", 1, "Biologia"],
    ["2026-06-06", "14:00", "15:00", 2, "Chemia"],
    ["2026-06-10", "15:00", "16:00", 0, "Chemia"],
    ["2026-06-11", "16:00", "17:00", 1, "Biologia"],
    ["2026-06-13", "14:00", "15:00", 2, "Chemia"],
    ["2026-06-17", "15:00", "16:00", 0, "Chemia"],
    ["2026-06-18", "16:00", "17:00", 1, "Biologia"],
    ["2026-06-20", "14:00", "15:00", 0, "Chemia"],
    ["2026-06-24", "15:00", "16:00", 2, "Chemia"],
    ["2026-06-25", "16:00", "17:00", 1, "Biologia"],
    ["2026-06-27", "14:00", "15:00", 0, "Chemia"],
  ];
  for (const [date, start, end, si, subject] of juneMartyna) {
    const s = martyna[si];
    lessons.push(L(tMartyna, s.id, subject, s.rate_pln, date, start, end, "VERIFIED", "blik"));
  }

  const juneMarcel = [
    ["2026-06-02", "14:00", "15:00", 0, "Angielski"],
    ["2026-06-04", "15:00", "16:00", 2, "Angielski"],
    ["2026-06-05", "16:00", "17:00", 1, "Historia"],
    ["2026-06-09", "14:00", "15:00", 0, "Angielski"],
    ["2026-06-11", "15:00", "16:00", 2, "Angielski"],
    ["2026-06-12", "16:00", "17:00", 1, "Historia"],
    ["2026-06-16", "14:00", "15:00", 0, "Angielski"],
    ["2026-06-18", "15:00", "16:00", 2, "Angielski"],
    ["2026-06-19", "16:00", "17:00", 1, "Historia"],
    ["2026-06-23", "14:00", "15:00", 0, "Angielski"],
    ["2026-06-25", "15:00", "16:00", 2, "Angielski"],
    ["2026-06-26", "16:00", "17:00", 1, "Historia"],
    ["2026-06-30", "14:00", "15:00", 0, "Angielski"],
  ];
  for (const [date, start, end, si, subject] of juneMarcel) {
    const s = marcel[si];
    lessons.push(L(tMarcel, s.id, subject, s.rate_pln, date, start, end, "VERIFIED", "przelew"));
  }

  // ── LIPIEC 2026 - w toku (stan na 21.07) ──────────────────────────────────
  // 1–11 VII: większość już VERIFIED (wcześniejsze tygodnie)
  const julyVerified = [
    [tBenio, benio, "2026-07-01", "16:00", "17:00", 0, "Matematyka"],
    [tBenio, benio, "2026-07-02", "17:00", "18:00", 1, "Fizyka"],
    [tBenio, benio, "2026-07-03", "15:00", "16:00", 2, "Matematyka"],
    [tBenio, benio, "2026-07-07", "16:00", "17:00", 0, "Matematyka"],
    [tBenio, benio, "2026-07-08", "17:00", "18:00", 1, "Fizyka"],
    [tBenio, benio, "2026-07-10", "15:00", "16:00", 2, "Matematyka"],
    [tBenio, benio, "2026-07-14", "16:00", "17:00", 0, "Matematyka"],
    [tBenio, benio, "2026-07-15", "17:00", "18:00", 1, "Fizyka"],
    [tMartyna, martyna, "2026-07-01", "15:00", "16:00", 0, "Chemia"],
    [tMartyna, martyna, "2026-07-02", "16:00", "17:00", 1, "Biologia"],
    [tMartyna, martyna, "2026-07-04", "14:00", "15:00", 2, "Chemia"],
    [tMartyna, martyna, "2026-07-08", "15:00", "16:00", 0, "Chemia"],
    [tMartyna, martyna, "2026-07-09", "16:00", "17:00", 1, "Biologia"],
    [tMartyna, martyna, "2026-07-11", "14:00", "15:00", 2, "Chemia"],
    [tMartyna, martyna, "2026-07-15", "15:00", "16:00", 0, "Chemia"],
    [tMarcel, marcel, "2026-07-01", "14:00", "15:00", 0, "Angielski"],
    [tMarcel, marcel, "2026-07-03", "15:00", "16:00", 2, "Angielski"],
    [tMarcel, marcel, "2026-07-04", "16:00", "17:00", 1, "Historia"],
    [tMarcel, marcel, "2026-07-08", "14:00", "15:00", 0, "Angielski"],
    [tMarcel, marcel, "2026-07-10", "15:00", "16:00", 2, "Angielski"],
    [tMarcel, marcel, "2026-07-11", "16:00", "17:00", 1, "Historia"],
    [tMarcel, marcel, "2026-07-15", "14:00", "15:00", 0, "Angielski"],
    [tMarcel, marcel, "2026-07-17", "15:00", "16:00", 2, "Angielski"],
  ];
  for (const [tutorId, studs, date, start, end, si, subject] of julyVerified) {
    const s = studs[si];
    lessons.push(L(tutorId, s.id, subject, s.rate_pln, date, start, end, "VERIFIED", "przelew"));
  }

  // Ostatnie dni (16–20 VII): zgłoszone, czekają na zatwierdzenie admina
  const julyPending = [
    [tBenio, benio, "2026-07-16", "16:00", "17:00", 0, "Matematyka"],
    [tBenio, benio, "2026-07-17", "17:00", "18:00", 1, "Fizyka"],
    [tBenio, benio, "2026-07-18", "15:00", "16:00", 2, "Matematyka"],
    [tBenio, benio, "2026-07-20", "16:00", "17:00", 0, "Matematyka"],
    [tMartyna, martyna, "2026-07-16", "16:00", "17:00", 1, "Biologia"],
    [tMartyna, martyna, "2026-07-17", "14:00", "15:00", 2, "Chemia"],
    [tMartyna, martyna, "2026-07-18", "15:00", "16:00", 0, "Chemia"],
    [tMartyna, martyna, "2026-07-20", "16:00", "17:00", 1, "Biologia"],
    [tMarcel, marcel, "2026-07-16", "16:00", "17:00", 1, "Historia"],
    [tMarcel, marcel, "2026-07-18", "14:00", "15:00", 0, "Angielski"],
    [tMarcel, marcel, "2026-07-20", "15:00", "16:00", 2, "Angielski"],
  ];
  for (const [tutorId, studs, date, start, end, si, subject] of julyPending) {
    const s = studs[si];
    lessons.push(L(tutorId, s.id, subject, s.rate_pln, date, start, end, "PENDING_VERIFICATION"));
  }

  // Dziś 21.07 + reszta miesiąca: PLANNED (nadchodzące)
  const julyPlanned = [
    [tBenio, benio, "2026-07-21", "16:00", "17:00", 0, "Matematyka"],
    [tBenio, benio, "2026-07-21", "17:30", "18:30", 1, "Fizyka"],
    [tMartyna, martyna, "2026-07-21", "15:00", "16:00", 0, "Chemia"],
    [tMarcel, marcel, "2026-07-21", "14:00", "15:00", 0, "Angielski"],
    [tBenio, benio, "2026-07-22", "16:00", "17:00", 2, "Matematyka"],
    [tBenio, benio, "2026-07-23", "17:00", "18:00", 1, "Fizyka"],
    [tBenio, benio, "2026-07-24", "15:00", "16:00", 0, "Matematyka"],
    [tBenio, benio, "2026-07-28", "16:00", "17:00", 0, "Matematyka"],
    [tBenio, benio, "2026-07-29", "17:00", "18:00", 1, "Fizyka"],
    [tBenio, benio, "2026-07-30", "15:00", "16:00", 2, "Matematyka"],
    [tMartyna, martyna, "2026-07-22", "15:00", "16:00", 1, "Biologia"],
    [tMartyna, martyna, "2026-07-23", "14:00", "15:00", 2, "Chemia"],
    [tMartyna, martyna, "2026-07-25", "15:00", "16:00", 0, "Chemia"],
    [tMartyna, martyna, "2026-07-28", "16:00", "17:00", 1, "Biologia"],
    [tMartyna, martyna, "2026-07-29", "14:00", "15:00", 0, "Chemia"],
    [tMartyna, martyna, "2026-07-31", "15:00", "16:00", 2, "Chemia"],
    [tMarcel, marcel, "2026-07-22", "14:00", "15:00", 2, "Angielski"],
    [tMarcel, marcel, "2026-07-23", "16:00", "17:00", 1, "Historia"],
    [tMarcel, marcel, "2026-07-24", "14:00", "15:00", 0, "Angielski"],
    [tMarcel, marcel, "2026-07-28", "15:00", "16:00", 2, "Angielski"],
    [tMarcel, marcel, "2026-07-29", "16:00", "17:00", 1, "Historia"],
    [tMarcel, marcel, "2026-07-30", "14:00", "15:00", 0, "Angielski"],
  ];
  for (const [tutorId, studs, date, start, end, si, subject] of julyPlanned) {
    const s = studs[si];
    lessons.push(L(tutorId, s.id, subject, s.rate_pln, date, start, end, "PLANNED"));
  }

  const unpaidCount = lessons.filter((l) => l.status === "UNPAID").length;
  if (unpaidCount > 0) throw new Error("Seed nie może zawierać UNPAID");

  const lessonRows = lessons.map(({ _rate, ...row }) => ({
    tutor_id: row.tutor_id,
    student_id: row.student_id,
    date: row.date,
    start_time: row.start_time,
    end_time: row.end_time,
    subject: row.subject,
    status: row.status,
    payment_method: row.payment_method ?? null,
  }));

  let insertedLessons;
  try {
    insertedLessons = await restInsert("lessons", lessonRows);
  } catch (err) {
    // fallback bez payment_method
    insertedLessons = await restInsert(
      "lessons",
      lessonRows.map(({ payment_method: _, ...rest }) => rest),
    );
  }
  console.log(`\n✓ ${insertedLessons.length} lekcji`);

  // payment_received_at dla VERIFIED
  const verifiedInserted = insertedLessons.filter((l) => l.status === "VERIFIED");
  let paymentPatched = 0;
  for (const row of verifiedInserted) {
    const ok = await restPatch(`lessons`, `id=eq.${row.id}`, {
      payment_received_at: row.date,
    });
    if (!ok) {
      console.log("ℹ payment_received_at niedostępne - pomijam");
      break;
    }
    paymentPatched += 1;
  }
  if (paymentPatched) console.log(`✓ payment_received_at ustawione dla ${paymentPatched} lekcji`);

  // Wypłaty za czerwiec - PAID (wypłacone na początku lipca)
  const payouts = [];
  for (const email of ["teacher@zaliczone.pl", "martyna@zaliczone.pl", "marcel@zaliczone.pl"]) {
    const tutorId = userIds[email];
    const juneVerified = lessons.filter(
      (l) => l.tutor_id === tutorId && l.date.startsWith("2026-06") && l.status === "VERIFIED",
    );
    const clientTotal = juneVerified.reduce(
      (sum, l) => sum + lessonAmount(l._rate, l.start_time, l.end_time),
      0,
    );
    const lessonsAmount = Math.round(clientTotal * TUTOR_SHARE * 100) / 100;
    const hours =
      Math.round(
        (juneVerified.reduce((sum, l) => {
          const [sh, sm] = l.start_time.split(":").map(Number);
          const [eh, em] = l.end_time.split(":").map(Number);
          return sum + (eh * 60 + em - (sh * 60 + sm));
        }, 0) /
          60) *
          10,
      ) / 10;
    const bonusAmount = hours >= 40 ? 100 : 0;
    const amount = Math.round((lessonsAmount + bonusAmount) * 100) / 100;
    payouts.push({
      tutor_id: tutorId,
      month: "2026-06",
      amount,
      status: "PAID",
      lessons_amount: lessonsAmount,
      bonus_amount: bonusAmount,
      lesson_count: juneVerified.length,
    });
  }

  let insertedPayouts;
  try {
    insertedPayouts = await restInsert("payouts", payouts);
  } catch (err) {
    // fallback bez kolumn meta
    insertedPayouts = await restInsert(
      "payouts",
      payouts.map(({ tutor_id, month, amount, status }) => ({ tutor_id, month, amount, status })),
    );
  }
  console.log(`✓ ${insertedPayouts.length} wypłat PAID za 2026-06`);

  // Koszty czerwca (już zamknięty miesiąc)
  const expenses = [
    {
      month: "2026-06",
      invoice_date: "2026-06-05",
      document_number: "FV/6/2026/01",
      expense_name: "Hosting i domena",
      issuer_name: "OVH Sp. z o.o.",
      amount_pln: 89.0,
      created_by: userIds["admin@zaliczone.pl"],
    },
    {
      month: "2026-06",
      invoice_date: "2026-06-12",
      document_number: "FV/6/2026/02",
      expense_name: "Reklama OLX",
      issuer_name: "OLX Group",
      amount_pln: 250.0,
      created_by: userIds["admin@zaliczone.pl"],
    },
    {
      month: "2026-07",
      invoice_date: "2026-07-08",
      document_number: "FV/7/2026/01",
      expense_name: "Księgowość - abonament",
      issuer_name: "Biuro Rachunkowe Alfa",
      amount_pln: 400.0,
      created_by: userIds["admin@zaliczone.pl"],
    },
  ];
  try {
    const insertedExp = await restInsert("operating_expenses", expenses);
    console.log(`✓ ${insertedExp.length} kosztów operacyjnych`);
  } catch (err) {
    console.log(`ℹ operating_expenses: ${err.message}`);
  }

  // Zamknięcie czerwca
  try {
    await restInsert("closed_months", [
      {
        month: "2026-06",
        closed_by: userIds["admin@zaliczone.pl"],
        closed_at: "2026-07-12T10:00:00.000Z",
      },
    ]);
    console.log("✓ closed_months: 2026-06");
  } catch (err) {
    console.log(`ℹ closed_months: ${err.message}`);
  }

  const counts = {
    VERIFIED: lessons.filter((l) => l.status === "VERIFIED").length,
    PENDING_VERIFICATION: lessons.filter((l) => l.status === "PENDING_VERIFICATION").length,
    PLANNED: lessons.filter((l) => l.status === "PLANNED").length,
    june: lessons.filter((l) => l.date.startsWith("2026-06")).length,
    july: lessons.filter((l) => l.date.startsWith("2026-07")).length,
  };

  console.log("\n✅ Seed gotowy - stan na 21.07.2026");
  console.log(`  Czerwiec: ${counts.june} lekcji VERIFIED · wypłaty PAID · miesiąc ZAMKNIĘTY`);
  console.log(
    `  Lipiec: ${counts.july} lekcji · ${counts.VERIFIED - counts.june} VERIFIED · ${counts.PENDING_VERIFICATION} do zatwierdzenia · ${counts.PLANNED} zaplanowanych · 0 UNPAID`,
  );
  console.log("\nLogowanie:");
  console.log("  admin@zaliczone.pl / 123456");
  console.log("  teacher@zaliczone.pl / 123456 (Benio)");
  console.log("  martyna@zaliczone.pl / 123456");
  console.log("  marcel@zaliczone.pl / 123456");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
