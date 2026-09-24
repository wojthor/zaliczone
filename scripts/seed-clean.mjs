/**
 * Wyczyść dane operacyjne - zostaw tylko admina produkcyjnego (0 uczniów / lekcji).
 * Run: pnpm seed:clean
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const KEEP_EMAILS = new Set(["admin@zaliczone.edu.pl"]);

const ACCOUNTS = [
  {
    email: "admin@zaliczone.edu.pl",
    password: "Korki.124",
    role: "ADMIN",
    full_name: "Martyna Wilczyńska",
    active_subjects: [],
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

async function updateUser(userId, account) {
  const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
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
      phone: null,
      bank_account: null,
      olx_url: null,
      accepting_students: true,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function main() {
  console.log("🧹 Czyszczenie bazy - tryb produkcyjny (0 uczniów), sam admin\n");

  console.log("Usuwanie danych operacyjnych…");
  await restDelete("message_recipients", "id=not.is.null");
  await restDelete("admin_messages", "id=not.is.null");
  await restDelete("lessons", "id=not.is.null");
  await restDelete("payouts", "id=not.is.null");
  await restDelete("subject_requests", "id=not.is.null");
  await restDelete("students", "id=not.is.null");
  console.log("✓ Lekcje, uczniowie, wypłaty, wiadomości - usunięte");

  const users = await listUsers();
  for (const user of users) {
    if (!user.email || KEEP_EMAILS.has(user.email)) continue;
    await deleteUser(user.id);
    console.log(`✓ Usunięto konto: ${user.email}`);
  }

  const freshUsers = await listUsers();
  for (const account of ACCOUNTS) {
    let id = freshUsers.find((u) => u.email === account.email)?.id;
    if (!id) {
      id = await createUser(account);
      console.log(`✓ Utworzono ${account.email}`);
    } else {
      await updateUser(id, account);
      console.log(`✓ Zaktualizowano ${account.email} (hasło / metadata)`);
    }
    await upsertProfile(id, account);
    console.log(`✓ Profil ${account.email} (${account.role})`);
  }

  console.log("\n✅ Gotowe. Logowanie:");
  console.log("  admin@zaliczone.edu.pl / Korki.124  → panel admina (pusty)");
  console.log("\nCennik (price_tiers) z migracji 0003 pozostaje bez zmian.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
