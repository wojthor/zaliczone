/**
 * Wyczyść wszystkie dane demo — zostaw tylko admin + Benio Beniowski (bez lekcji, uczniów itd.)
 * Run: pnpm seed:clean
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const KEEP_EMAILS = new Set(["admin@zaliczone.pl", "teacher@zaliczone.pl"]);

const ACCOUNTS = [
  {
    email: "admin@zaliczone.pl",
    password: "123456",
    role: "ADMIN",
    full_name: "Administrator",
    active_subjects: [],
    ewidencja_unlocked_for_month: null,
  },
  {
    email: "teacher@zaliczone.pl",
    password: "123456",
    role: "TUTOR",
    full_name: "Benio Beniowski",
    active_subjects: ["Matematyka", "Fizyka"],
    ewidencja_unlocked_for_month: null,
  },
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

async function deleteUser(userId) {
  const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  if (!res.ok && res.status !== 404) throw new Error(await res.text());
}

async function restDelete(table, filter) {
  const res = await fetch(`${url}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: adminHeaders({ Prefer: "return=minimal" }),
  });
  if (!res.ok && res.status !== 404) throw new Error(`${table}: ${await res.text()}`);
}

async function upsertProfile(userId, account) {
  const res = await fetch(`${url}/rest/v1/profiles`, {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" }),
    body: JSON.stringify({
      id: userId,
      role: account.role,
      full_name: account.full_name,
      active_subjects: account.active_subjects,
      ewidencja_unlocked_for_month: account.ewidencja_unlocked_for_month,
      phone: null,
      bank_account: null,
      olx_url: null,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function main() {
  console.log("🧹 Czyszczenie bazy — zostają admin + Benio (pusto)\n");

  console.log("Usuwanie danych operacyjnych…");
  await restDelete("message_recipients", "id=not.is.null");
  await restDelete("admin_messages", "id=not.is.null");
  await restDelete("lessons", "id=not.is.null");
  await restDelete("payouts", "id=not.is.null");
  await restDelete("subject_requests", "id=not.is.null");
  await restDelete("students", "id=not.is.null");
  console.log("✓ Lekcje, uczniowie, wypłaty, wiadomości — usunięte");

  const users = await listUsers();
  for (const user of users) {
    if (!user.email || KEEP_EMAILS.has(user.email)) continue;
    await deleteUser(user.id);
    console.log(`✓ Usunięto konto: ${user.email}`);
  }

  for (const account of ACCOUNTS) {
    let id = users.find((u) => u.email === account.email)?.id;
    if (!id) id = await createUser(account);
    await upsertProfile(id, account);
    console.log(`✓ ${account.email} (${account.role})`);
  }

  console.log("\n✅ Gotowe. Logowanie:");
  console.log("  admin@zaliczone.pl / 123456  → panel admina (pusty)");
  console.log("  teacher@zaliczone.pl / 123456 → Benio Beniowski (pusty terminarz)");
  console.log("\nCennik (price_tiers) z migracji 0003 pozostaje bez zmian.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
