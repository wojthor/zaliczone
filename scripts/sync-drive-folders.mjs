/**
 * Jednorazowa synchronizacja folderów Drive (aktywni ↔ byli pracownicy).
 * Usage: node --env-file=.env.local scripts/sync-drive-folders.mjs
 */
import { google } from "googleapis";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const FORMER_NAME = "byli pracownicy";

function escapeQ(v) {
  return v.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function getAuth() {
  const email = process.env.GOOGLE_DRIVE_CLIENT_EMAIL?.trim();
  const keyRaw = process.env.GOOGLE_DRIVE_PRIVATE_KEY;
  const teachersFolderId = process.env.GOOGLE_DRIVE_TEACHERS_FOLDER_ID?.trim();
  if (!email || !keyRaw || !teachersFolderId) {
    throw new Error("Brak GOOGLE_DRIVE_* w env");
  }
  const privateKey = keyRaw.includes("\\n") ? keyRaw.replace(/\\n/g, "\n") : keyRaw;
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return { drive: google.drive({ version: "v3", auth }), teachersFolderId };
}

async function findChild(drive, parentId, name) {
  const res = await drive.files.list({
    q: `'${parentId}' in parents and name = '${escapeQ(name)}' and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: "files(id,name)",
    pageSize: 5,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return res.data.files?.[0]?.id ?? null;
}

async function getFormerFolderId(drive, teachersFolderId) {
  const fromEnv = process.env.GOOGLE_DRIVE_FORMER_TEACHERS_FOLDER_ID?.trim();
  if (fromEnv) return fromEnv;

  const global = await drive.files.list({
    q: `name = '${escapeQ(FORMER_NAME)}' and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: "files(id,name)",
    pageSize: 20,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const hit = (global.data.files ?? []).find((f) => f.id && f.id !== teachersFolderId);
  if (hit?.id) return hit.id;

  try {
    const meta = await drive.files.get({
      fileId: teachersFolderId,
      fields: "parents",
      supportsAllDrives: true,
    });
    const parentId = meta.data.parents?.[0];
    if (parentId) {
      const existing = await findChild(drive, parentId, FORMER_NAME);
      if (existing) return existing;
      const created = await drive.files.create({
        requestBody: { name: FORMER_NAME, mimeType: FOLDER_MIME, parents: [parentId] },
        fields: "id",
        supportsAllDrives: true,
      });
      return created.data.id;
    }
  } catch {
    /* shared folder without parents */
  }

  const nested = await findChild(drive, teachersFolderId, FORMER_NAME);
  if (nested) return nested;
  const created = await drive.files.create({
    requestBody: { name: FORMER_NAME, mimeType: FOLDER_MIME, parents: [teachersFolderId] },
    fields: "id",
    supportsAllDrives: true,
  });
  console.log("Utworzono fallback:", `nauczyciele/${FORMER_NAME}`);
  return created.data.id;
}

async function moveTo(drive, folderId, newParentId) {
  const meta = await drive.files.get({
    fileId: folderId,
    fields: "parents",
    supportsAllDrives: true,
  });
  const parents = meta.data.parents ?? [];
  if (parents.includes(newParentId)) return false;
  await drive.files.update({
    fileId: folderId,
    addParents: newParentId,
    removeParents: parents.join(","),
    fields: "id,parents",
    supportsAllDrives: true,
  });
  return true;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const res = await fetch(
  `${url}/rest/v1/profiles?role=eq.TUTOR&select=id,full_name,contract_end,drive_folder_id`,
  {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  },
);
if (!res.ok) throw new Error(await res.text());
const tutors = await res.json();
const today = new Date().toISOString().slice(0, 10);
const { drive, teachersFolderId } = getAuth();
const formerFolderId = await getFormerFolderId(drive, teachersFolderId);
console.log("former folder:", formerFolderId);

for (const t of tutors) {
  const name = (t.full_name || "").trim() || "Nauczyciel";
  const former = Boolean(t.contract_end && t.contract_end <= today);
  const target = former ? formerFolderId : teachersFolderId;
  let folderId = t.drive_folder_id;

  if (!folderId) {
    const inActive = await findChild(drive, teachersFolderId, name);
    const inFormer = inActive ? null : await findChild(drive, formerFolderId, name);
    folderId = inActive || inFormer;
    if (!folderId) {
      const created = await drive.files.create({
        requestBody: { name, mimeType: FOLDER_MIME, parents: [target] },
        fields: "id",
        supportsAllDrives: true,
      });
      folderId = created.data.id;
      console.log("CREATED", name, "→", former ? FORMER_NAME : "nauczyciele");
    }
    await fetch(`${url}/rest/v1/profiles?id=eq.${t.id}`, {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ drive_folder_id: folderId }),
    });
  }

  const moved = await moveTo(drive, folderId, target);
  console.log(
    former ? "FORMER" : "ACTIVE",
    name,
    moved ? "MOVED" : "OK",
    "→",
    former ? FORMER_NAME : "nauczyciele",
  );
}

console.log("Done.");
