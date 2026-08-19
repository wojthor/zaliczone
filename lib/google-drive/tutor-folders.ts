import { createServiceClient } from "@/lib/supabase/admin";
import { getDriveClient, getDriveConfig } from "@/lib/google-drive/client";
import type { DriveFileItem } from "@/lib/google-drive/types";

export type { DriveFileItem };

const FOLDER_MIME = "application/vnd.google-apps.folder";
const FORMER_FOLDER_NAME = "byli pracownicy";

function escapeDriveQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function isFormerContractEnd(contractEnd: string | null | undefined, todayIso?: string): boolean {
  if (!contractEnd) return false;
  const today = todayIso ?? new Date().toISOString().slice(0, 10);
  return contractEnd <= today;
}

async function findChildFolder(parentId: string, name: string): Promise<string | null> {
  const { drive } = getDriveClient();
  const q = [
    `'${parentId}' in parents`,
    `name = '${escapeDriveQuery(name)}'`,
    `mimeType = '${FOLDER_MIME}'`,
    "trashed = false",
  ].join(" and ");

  const existing = await drive.files.list({
    q,
    fields: "files(id, name)",
    spaces: "drive",
    pageSize: 10,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return existing.data.files?.[0]?.id ?? null;
}

async function createChildFolder(parentId: string, name: string): Promise<string> {
  const { drive } = getDriveClient();
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });
  if (!created.data.id) throw new Error("Google Drive nie zwrócił ID nowego folderu.");
  return created.data.id;
}

/** Folder „byli pracownicy” - env, wyszukiwanie po nazwie, albo child `nauczyciele/`. */
export async function getFormerTeachersFolderId(): Promise<string> {
  const fromEnv = process.env.GOOGLE_DRIVE_FORMER_TEACHERS_FOLDER_ID?.trim();
  if (fromEnv) return fromEnv;

  const { drive, teachersFolderId } = getDriveClient();

  // 1) Folder już udostępniony SA (np. zaliczone/byli pracownicy)
  const global = await drive.files.list({
    q: `name = '${escapeDriveQuery(FORMER_FOLDER_NAME)}' and mimeType = '${FOLDER_MIME}' and trashed = false`,
    fields: "files(id, name, parents)",
    spaces: "drive",
    pageSize: 20,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const candidates = (global.data.files ?? []).filter((f) => f.id);
  const siblingLike = candidates.find(
    (f) => f.id && !(f.parents ?? []).includes(teachersFolderId),
  );
  if (siblingLike?.id) return siblingLike.id;
  const nestedExisting = candidates.find((f) => (f.parents ?? []).includes(teachersFolderId));
  if (nestedExisting?.id) return nestedExisting.id;

  // 2) Sibling obok nauczyciele - tylko gdy SA widzi parenta
  try {
    const meta = await drive.files.get({
      fileId: teachersFolderId,
      fields: "id, parents",
      supportsAllDrives: true,
    });
    const parentId = meta.data.parents?.[0];
    if (parentId) {
      const existing = await findChildFolder(parentId, FORMER_FOLDER_NAME);
      if (existing) return existing;
      return createChildFolder(parentId, FORMER_FOLDER_NAME);
    }
  } catch {
    /* shared folder bez parentów - fallback poniżej */
  }

  // 3) Fallback: nauczyciele/byli pracownicy (działa przy samym share folderu nauczyciele)
  const nested = await findChildFolder(teachersFolderId, FORMER_FOLDER_NAME);
  if (nested) return nested;
  return createChildFolder(teachersFolderId, FORMER_FOLDER_NAME);
}

function isDriveNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("file not found") || msg.includes("404");
}

async function findOrCreateNamedFolderIn(
  parentId: string,
  name: string,
): Promise<{ folderId: string; created: boolean }> {
  const hit = await findChildFolder(parentId, name);
  if (hit) return { folderId: hit, created: false };
  const folderId = await createChildFolder(parentId, name);
  return { folderId, created: true };
}

export async function moveDriveFolder(folderId: string, newParentId: string): Promise<void> {
  const { drive } = getDriveClient();
  const meta = await drive.files.get({
    fileId: folderId,
    fields: "id, parents",
    supportsAllDrives: true,
  });
  const parents = meta.data.parents ?? [];
  if (parents.includes(newParentId)) return;

  await drive.files.update({
    fileId: folderId,
    addParents: newParentId,
    removeParents: parents.join(","),
    fields: "id, parents",
    supportsAllDrives: true,
  });
}

export async function renameTutorDriveFolder(folderId: string, newName: string): Promise<void> {
  const { drive } = getDriveClient();
  await drive.files.update({
    fileId: folderId,
    requestBody: { name: newName.trim() },
    supportsAllDrives: true,
  });
}

export async function listFilesInFolder(folderId: string): Promise<DriveFileItem[]> {
  const { drive } = getDriveClient();
  const items: DriveFileItem[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields:
        "nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)",
      orderBy: "folder,name_natural",
      pageSize: 100,
      pageToken,
      spaces: "drive",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    for (const f of res.data.files ?? []) {
      if (!f.id || !f.name) continue;
      const mimeType = f.mimeType ?? "application/octet-stream";
      items.push({
        id: f.id,
        name: f.name,
        mimeType,
        sizeBytes: f.size ? Number(f.size) : null,
        modifiedAt: f.modifiedTime ?? null,
        isFolder: mimeType === FOLDER_MIME,
        webViewLink: f.webViewLink ?? null,
      });
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return items;
}

export async function assertFileInFolder(fileId: string, folderId: string): Promise<{
  id: string;
  name: string;
  mimeType: string;
}> {
  const { drive } = getDriveClient();
  const meta = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, parents, trashed",
    supportsAllDrives: true,
  });

  if (meta.data.trashed) throw new Error("Plik został usunięty.");
  const parents = meta.data.parents ?? [];
  if (!parents.includes(folderId)) {
    throw new Error("Brak dostępu do tego pliku.");
  }

  return {
    id: meta.data.id!,
    name: meta.data.name ?? "plik",
    mimeType: meta.data.mimeType ?? "application/octet-stream",
  };
}

/**
 * Tworzy / podpina folder Drive.
 * Aktywni → `nauczyciele/`, byli → `byli pracownicy/`.
 * Jeśli folder już istnieje w złym katalogu - przenosi.
 */
export async function ensureTutorDriveFolder(
  tutorId: string,
  tutorName: string,
  opts?: { former?: boolean },
): Promise<{ folderId: string; created: boolean; moved: boolean }> {
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("drive_folder_id, full_name, contract_end")
    .eq("id", tutorId)
    .maybeSingle();

  const name = (tutorName || profile?.full_name || "").trim();
  if (!name) throw new Error("Brak nazwy nauczyciela.");

  const former =
    opts?.former ?? isFormerContractEnd(profile?.contract_end as string | null | undefined);

  const { teachersFolderId } = getDriveClient();
  const targetParentId = former ? await getFormerTeachersFolderId() : teachersFolderId;

  let folderId = (profile?.drive_folder_id as string | null) ?? null;
  let created = false;
  let moved = false;

  if (!folderId) {
    // Szukaj w obu katalogach (aktywnych i byłych), potem utwórz w docelowym
    const inActive = await findChildFolder(teachersFolderId, name);
    const formerParent = await getFormerTeachersFolderId();
    const inFormer = inActive ? null : await findChildFolder(formerParent, name);
    if (inActive) {
      folderId = inActive;
    } else if (inFormer) {
      folderId = inFormer;
    } else {
      const made = await findOrCreateNamedFolderIn(targetParentId, name);
      folderId = made.folderId;
      created = made.created;
    }
  }

  const { drive } = getDriveClient();
  let meta;
  try {
    meta = await drive.files.get({
      fileId: folderId,
      fields: "id, parents",
      supportsAllDrives: true,
    });
  } catch (error) {
    if (!isDriveNotFoundError(error)) throw error;

    const inActive = await findChildFolder(teachersFolderId, name);
    const formerParent = await getFormerTeachersFolderId();
    const inFormer = inActive ? null : await findChildFolder(formerParent, name);
    if (inActive) {
      folderId = inActive;
    } else if (inFormer) {
      folderId = inFormer;
    } else {
      const made = await findOrCreateNamedFolderIn(targetParentId, name);
      folderId = made.folderId;
      created = created || made.created;
    }

    meta = await drive.files.get({
      fileId: folderId,
      fields: "id, parents",
      supportsAllDrives: true,
    });
  }
  const parents = meta.data.parents ?? [];
  if (!parents.includes(targetParentId)) {
    await moveDriveFolder(folderId, targetParentId);
    moved = true;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ drive_folder_id: folderId })
    .eq("id", tutorId);

  if (error) {
    const msg = `${error.message}`.toLowerCase();
    if (msg.includes("drive_folder_id") || msg.includes("column") || error.code === "PGRST204") {
      throw new Error(
        "Brak kolumny drive_folder_id. Uruchom migrację supabase/migrations/0012_drive_folder_id.sql.",
      );
    }
    throw error;
  }

  return { folderId, created, moved };
}

/** Po zakończeniu współpracy - przenieś folder do „byli pracownicy”. */
export async function moveTutorDriveFolderToFormer(
  tutorId: string,
  tutorName?: string,
): Promise<void> {
  if (!getDriveConfig()) return;
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, drive_folder_id")
    .eq("id", tutorId)
    .maybeSingle();

  const name = (tutorName || profile?.full_name || "").trim() || "Nauczyciel";
  await ensureTutorDriveFolder(tutorId, name, { former: true });
}

export async function syncAllTutorDriveFolders(): Promise<{
  synced: number;
  created: number;
  moved: number;
  errors: Array<{ tutorId: string; name: string; message: string }>;
}> {
  const supabase = createServiceClient();
  const { data: tutors, error } = await supabase
    .from("profiles")
    .select("id, full_name, drive_folder_id, contract_end")
    .eq("role", "TUTOR");

  if (error) throw error;

  let synced = 0;
  let created = 0;
  let moved = 0;
  const errors: Array<{ tutorId: string; name: string; message: string }> = [];

  for (const t of tutors ?? []) {
    const name = (t.full_name as string | null)?.trim() || "Nauczyciel";
    try {
      const result = await ensureTutorDriveFolder(t.id as string, name, {
        former: isFormerContractEnd(t.contract_end as string | null),
      });
      synced += 1;
      if (result.created) created += 1;
      if (result.moved) moved += 1;
    } catch (e) {
      errors.push({
        tutorId: t.id as string,
        name,
        message: e instanceof Error ? e.message : "Nieznany błąd",
      });
    }
  }

  return { synced, created, moved, errors };
}
