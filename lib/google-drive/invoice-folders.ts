import { PassThrough } from "node:stream";
import { getDriveClient, getDriveConfig, getInvoicesFolderId } from "@/lib/google-drive/client";

const FOLDER_MIME = "application/vnd.google-apps.folder";

function escapeDriveQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Etykieta folderu miesiąca, np. „sierpień 2026”. */
export function formatInvoiceMonthFolderName(monthKey: string): string {
  const [ys, ms] = monthKey.split("-");
  const year = Number(ys);
  const month = Number(ms);
  if (!year || !month || month < 1 || month > 12) {
    throw new Error("Nieprawidłowy miesiąc (oczekiwano YYYY-MM).");
  }
  const label = new Intl.DateTimeFormat("pl-PL", { month: "long" }).format(
    new Date(year, month - 1, 15),
  );
  return `${label} ${year}`;
}

function invoicesAccessHint(): string {
  const email = getDriveConfig()?.clientEmail ?? "service account Google Drive";
  return `Dodaj ${email} jako członka Dysku współdzielonego z uprawnieniem Edytujący (nie tylko Udostępnij na folderze).`;
}

/** Google nie daje service accountowi miejsca na pliki w zwykłym Dysku — tylko foldery. Pliki wymagają Dysku współdzielonego. */
export function isDriveStorageQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("storage quota") ||
    msg.includes("Service Accounts do not have storage quota") ||
    msg.includes("Dysk współdzielony")
  );
}

function rethrowDriveFolderError(error: unknown, context: string): never {
  const err = error as { code?: number; message?: string };
  if (err.code === 404 || err.message?.includes("File not found")) {
    throw new Error(
      `Brak dostępu do folderu Faktury (${context}). ${invoicesAccessHint()}`,
    );
  }
  if (err.message?.includes("storage quota") || err.message?.includes("shared drives")) {
    throw new Error(
      "Service account nie może zapisać pliku w zwykłym Dysku Google. Przenieś folder Faktury na Dysk współdzielony (Shared drive) i udostępnij go kontu service account z prawem Edytujący.",
    );
  }
  throw error instanceof Error ? error : new Error(String(error));
}

async function resolveSharedDriveId(rootId: string): Promise<string | undefined> {
  const { drive } = getDriveClient();
  try {
    const shared = await drive.drives.get({ driveId: rootId, fields: "id, name" });
    if (shared.data.id) return shared.data.id;
  } catch {
    /* to nie jest ID całego dysku — spróbuj folderu */
  }
  try {
    const meta = await drive.files.get({
      fileId: rootId,
      fields: "id, driveId, mimeType",
      supportsAllDrives: true,
    });
    return meta.data.driveId ?? undefined;
  } catch {
    return undefined;
  }
}

async function assertInvoicesRootAccessible(rootId: string): Promise<void> {
  const { drive } = getDriveClient();
  try {
    await drive.drives.get({ driveId: rootId, fields: "id" });
    return;
  } catch {
    /* folder, nie cały dysk */
  }
  try {
    const meta = await drive.files.get({
      fileId: rootId,
      fields: "id, name, mimeType",
      supportsAllDrives: true,
    });
    if (meta.data.mimeType !== FOLDER_MIME) {
      throw new Error("GOOGLE_DRIVE_INVOICES_FOLDER_ID wskazuje plik, nie folder Faktury.");
    }
  } catch (error) {
    rethrowDriveFolderError(error, "sprawdzenie folderu głównego");
  }
}

async function findChildFolder(parentId: string, name: string): Promise<string | null> {
  const { drive } = getDriveClient();
  const q = [
    `'${parentId}' in parents`,
    `name = '${escapeDriveQuery(name)}'`,
    `mimeType = '${FOLDER_MIME}'`,
    "trashed = false",
  ].join(" and ");

  const driveId = await resolveSharedDriveId(parentId);
  const existing = await drive.files.list({
    q,
    fields: "files(id, name)",
    pageSize: 10,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    ...(driveId
      ? { corpora: "drive", driveId }
      : { spaces: "drive" }),
  });

  return existing.data.files?.[0]?.id ?? null;
}

async function createChildFolder(parentId: string, name: string): Promise<string> {
  const { drive } = getDriveClient();
  try {
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
  } catch (error) {
    rethrowDriveFolderError(error, `tworzenie „${name}”`);
  }
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

/** Faktury / {rok} / {miesiąc rok} — tworzy brakujące foldery. */
export async function ensureInvoiceMonthFolder(monthKey: string): Promise<string> {
  const invoicesRootId = getInvoicesFolderId();
  if (!invoicesRootId) {
    throw new Error(
      "Brak GOOGLE_DRIVE_INVOICES_FOLDER_ID — uzupełnij ID folderu Faktury w zmiennych środowiskowych.",
    );
  }

  const year = monthKey.slice(0, 4);
  const monthLabel = formatInvoiceMonthFolderName(monthKey);

  await assertInvoicesRootAccessible(invoicesRootId);

  const { folderId: yearFolderId } = await findOrCreateNamedFolderIn(invoicesRootId, year);
  const { folderId: monthFolderId } = await findOrCreateNamedFolderIn(yearFolderId, monthLabel);
  return monthFolderId;
}

function bufferToUploadStream(data: Buffer): PassThrough {
  const stream = new PassThrough();
  stream.end(Buffer.from(data));
  return stream;
}

async function isDescendantOf(
  folderId: string,
  ancestorId: string,
  maxDepth = 6,
): Promise<boolean> {
  const { drive } = getDriveClient();
  let currentId: string | undefined = folderId;
  for (let depth = 0; depth < maxDepth && currentId; depth += 1) {
    if (currentId === ancestorId) return true;
    const meta: { data: { parents?: string[] | null } } = await drive.files.get({
      fileId: currentId,
      fields: "id, parents",
      supportsAllDrives: true,
    });
    currentId = meta.data.parents?.[0];
  }
  return false;
}

export async function assertInvoiceDriveFile(fileId: string): Promise<{
  id: string;
  name: string;
  mimeType: string;
}> {
  const invoicesRootId = getInvoicesFolderId();
  if (!invoicesRootId) throw new Error("Folder Faktury nie jest skonfigurowany.");

  const { drive } = getDriveClient();
  const meta = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, parents, trashed",
    supportsAllDrives: true,
  });

  if (meta.data.trashed) throw new Error("Plik został usunięty.");
  const parentId = meta.data.parents?.[0];
  if (!parentId || !(await isDescendantOf(parentId, invoicesRootId))) {
    throw new Error("Brak dostępu do tego pliku.");
  }

  return {
    id: meta.data.id!,
    name: meta.data.name ?? "plik",
    mimeType: meta.data.mimeType ?? "application/octet-stream",
  };
}

export async function uploadInvoiceToDrive(
  monthKey: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string,
): Promise<{ fileId: string }> {
  const monthFolderId = await ensureInvoiceMonthFolder(monthKey);
  const { drive } = getDriveClient();

  try {
    const created = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [monthFolderId],
      },
      media: {
        mimeType,
        body: bufferToUploadStream(buffer),
      },
      fields: "id",
      supportsAllDrives: true,
    });

    if (!created.data.id) throw new Error("Google Drive nie zwrócił ID wgranego pliku.");
    return { fileId: created.data.id };
  } catch (error) {
    if (isDriveStorageQuotaError(error)) throw error;
    rethrowDriveFolderError(error, "wgrywanie pliku");
  }
}

export async function deleteInvoiceFromDrive(fileId: string): Promise<void> {
  await assertInvoiceDriveFile(fileId);
  const { drive } = getDriveClient();
  await drive.files.delete({ fileId, supportsAllDrives: true });
}
