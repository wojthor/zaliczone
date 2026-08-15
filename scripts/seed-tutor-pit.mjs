/**
 * Uzupełnia brakujące dane podstawowe + PIT u istniejących nauczycieli (TUTOR).
 * Nie nadpisuje pól, które już mają wartość.
 * Run: pnpm seed:pit
 * Wymaga migracji 0010_tutor_pit_fields.sql.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

/** Demo / seed profiles keyed by email (Auth) or full_name fallback */
const BY_EMAIL = {
  "teacher@zaliczone.pl": {
    phone: "+48 500 111 222",
    bank_account: "12 ACCT-000009 9012 3456",
    contract_start: "2026-03-01",
    pesel: "90031512345",
    birth_date: "1990-03-15",
    tax_street: "ul. Słoneczna 12/4",
    tax_postal_code: "00-001",
    tax_city: "Warszawa",
    tax_country: "Polska",
    tax_office: "US Warszawa-Śródmieście",
    employment_type: "UMOWA_ZLECENIE",
    tax_year_data: {
      "2026": {
        deductibleCostsPln: 0,
        taxAdvancesPln: 0,
        zusSocialPln: 0,
        zusHealthPln: 0,
        reliefYoung: false,
        notes: "Koszty 20% — uzupełnij przy rozliczeniu.",
      },
    },
  },
  "martyna@zaliczone.pl": {
    phone: "+48 501 333 444",
    bank_account: "49 ACCT-000048 0000 0000",
    contract_start: "2026-03-01",
    pesel: "95052298765",
    birth_date: "1995-05-22",
    tax_street: "ul. Lipowa 7",
    tax_postal_code: "31-001",
    tax_city: "Kraków",
    tax_country: "Polska",
    tax_office: "US Kraków-Podgórze",
    employment_type: "UMOWA_ZLECENIE",
    tax_year_data: {
      "2026": {
        deductibleCostsPln: 0,
        taxAdvancesPln: 0,
        zusSocialPln: 0,
        zusHealthPln: 0,
        reliefYoung: true,
        notes: "Ulga dla młodych — sprawdź wiek na koniec roku.",
      },
    },
  },
  "marcel@zaliczone.pl": {
    phone: "+48 502 555 666",
    bank_account: "27 ACCT-000004 0000 0000",
    contract_start: "2026-03-01",
    pesel: "88010111223",
    birth_date: "1988-01-01",
    tax_street: "ul. Długa 3/10",
    tax_postal_code: "80-001",
    tax_city: "Gdańsk",
    tax_country: "Polska",
    tax_office: "US Gdańsk-Centrum",
    employment_type: "UMOWA_ZLECENIE",
    tax_year_data: {
      "2026": {
        deductibleCostsPln: 0,
        taxAdvancesPln: 0,
        zusSocialPln: 0,
        zusHealthPln: 0,
        reliefYoung: false,
        notes: "",
      },
    },
  },
  "voj.torres9@gmail.com": {
    phone: "123456789",
    bank_account: "11 ACCT-000016 0000 0000",
    contract_start: "2026-07-21",
    pesel: "02070745678",
    birth_date: "2002-07-07",
    tax_street: "ul. Sportowa 1",
    tax_postal_code: "02-001",
    tax_city: "Warszawa",
    tax_country: "Polska",
    tax_office: "US Warszawa-Mokotów",
    employment_type: "UMOWA_ZLECENIE",
    tax_year_data: {
      "2026": {
        deductibleCostsPln: 0,
        taxAdvancesPln: 0,
        zusSocialPln: 0,
        zusHealthPln: 0,
        reliefYoung: true,
        notes: "Demo — Lamine Yamal",
      },
    },
  },
};

const BY_NAME = {
  "Benio Beniowski": BY_EMAIL["teacher@zaliczone.pl"],
  "Martyna Wilczyńska": BY_EMAIL["martyna@zaliczone.pl"],
  "Marcel Kowalski": BY_EMAIL["marcel@zaliczone.pl"],
  "Lamine Yamal": BY_EMAIL["voj.torres9@gmail.com"],
};

function isEmpty(v) {
  return v == null || v === "" || (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0);
}

function mergeMissing(current, defaults) {
  const next = { ...current };
  let changed = false;
  for (const [key, value] of Object.entries(defaults)) {
    if (key === "tax_year_data") {
      const curMap = current.tax_year_data && typeof current.tax_year_data === "object" ? current.tax_year_data : {};
      const merged = { ...value, ...curMap };
      // Prefer existing year entries; fill only missing years from defaults
      for (const [y, entry] of Object.entries(value)) {
        if (!curMap[y]) {
          merged[y] = entry;
          changed = true;
        }
      }
      if (changed || isEmpty(current.tax_year_data)) {
        next.tax_year_data = merged;
        changed = true;
      }
      continue;
    }
    if (isEmpty(current[key]) && !isEmpty(value)) {
      next[key] = value;
      changed = true;
    }
  }
  return changed ? next : null;
}

async function listUsers() {
  const res = await fetch(`${url}/auth/v1/admin/users?per_page=200`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.msg || JSON.stringify(body));
  return body.users ?? [];
}

async function listTutorProfiles() {
  const res = await fetch(`${url}/rest/v1/profiles?role=eq.TUTOR&select=*`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function patchProfile(id, patch) {
  const res = await fetch(`${url}/rest/v1/profiles?id=eq.${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function main() {
  console.log("🌱 Uzupełnianie danych PIT nauczycieli…\n");
  const users = await listUsers();
  const emailById = new Map(users.filter((u) => u.email).map((u) => [u.id, u.email]));
  const profiles = await listTutorProfiles();

  let updated = 0;
  for (const p of profiles) {
    const email = emailById.get(p.id);
    const defaults = (email && BY_EMAIL[email]) || BY_NAME[p.full_name] || null;
    if (!defaults) {
      // Generyczny zestaw dla nieznanych tutorów bez PESEL
      if (!p.pesel) {
        const generic = {
          tax_country: p.tax_country || "Polska",
          employment_type: p.employment_type || "UMOWA_ZLECENIE",
        };
        const patch = mergeMissing(p, generic);
        if (patch) {
          await patchProfile(p.id, {
            tax_country: patch.tax_country,
            employment_type: patch.employment_type,
          });
          console.log(`  ✓ ${p.full_name} — podstawowe domyślne`);
          updated += 1;
        } else {
          console.log(`  · ${p.full_name} — bez szablonu, pominięto`);
        }
      } else {
        console.log(`  · ${p.full_name} — już uzupełniony / bez szablonu`);
      }
      continue;
    }

    const merged = mergeMissing(p, defaults);
    if (!merged) {
      console.log(`  · ${p.full_name} (${email ?? "—"}) — komplet`);
      continue;
    }

    const patch = {};
    for (const key of Object.keys(defaults)) {
      if (merged[key] !== p[key]) patch[key] = merged[key];
    }
    // Always allow tax_year_data if changed
    if (merged.tax_year_data) patch.tax_year_data = merged.tax_year_data;

    await patchProfile(p.id, patch);
    console.log(`  ✓ ${p.full_name} (${email ?? "—"}) — uzupełniono: ${Object.keys(patch).join(", ")}`);
    updated += 1;
  }

  console.log(`\n✅ Gotowe. Zaktualizowano ${updated} profil(i).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
