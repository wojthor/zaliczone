/**
 * Seed Supabase Auth users + profiles.
 * Uses REST/Auth Admin API (no WebSocket — works on Node 21).
 *
 * Run: pnpm seed
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const ACCOUNTS = [
  {
    email: "admin@zaliczone.pl",
    password: "123456",
    role: "ADMIN",
    full_name: "Administrator",
  },
  {
    email: "teacher@zaliczone.pl",
    password: "123456",
    role: "TUTOR",
    full_name: "Benio Beniowski",
  },
];

function adminHeaders(extra = {}) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    ...extra,
  };
}

async function listUsers() {
  const res = await fetch(`${url}/auth/v1/admin/users?per_page=200`, {
    headers: adminHeaders(),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.msg || body.message || JSON.stringify(body));
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
  if (!res.ok) throw new Error(body.msg || body.message || JSON.stringify(body));
  return body;
}

async function upsertProfile(userId, role, fullName) {
  const res = await fetch(`${url}/rest/v1/profiles`, {
    method: "POST",
    headers: adminHeaders({
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    }),
    body: JSON.stringify({ id: userId, role, full_name: fullName }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body);
  }
}

async function seedAccount(account) {
  const users = await listUsers();
  const existing = users.find((u) => u.email === account.email);

  if (existing) {
    await upsertProfile(existing.id, account.role, account.full_name);
    console.log(`✓ ${account.email} — profile updated (${account.role})`);
    return existing.id;
  }

  const created = await createUser(account);
  const userId = created.id ?? created.user?.id;
  if (!userId) throw new Error(`No user id returned for ${account.email}`);

  await upsertProfile(userId, account.role, account.full_name);
  console.log(`✓ ${account.email} — created (${account.role})`);
  return userId;
}

async function main() {
  for (const account of ACCOUNTS) {
    await seedAccount(account);
  }
  console.log("\nDone. You can log in with:");
  console.log("  admin@zaliczone.pl / 123456  (ADMIN → /admin)");
  console.log("  teacher@zaliczone.pl / 123456 (TUTOR → dashboard)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
