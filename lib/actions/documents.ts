"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import type { DocumentFile, DocumentFolder } from "@/lib/types/database";

const MIGRATION_HINT =
  "Brak tabel dokumentów lub bucketa Storage. Uruchom migrację supabase/migrations/0005_final_after_0004.sql w Supabase.";

type DocsError = { message?: string; code?: string; details?: string } | null;

function isMissingDocsSchema(error: DocsError): boolean {
  if (!error) return false;
  const msg = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    error.code === "PGRST204" ||
    msg.includes("document_folders") ||
    msg.includes("document_files") ||
    msg.includes("bucket") ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

function throwDocsError(error: DocsError): never {
  if (isMissingDocsSchema(error)) throw new Error(MIGRATION_HINT);
  throw new Error(error?.message ?? "Operacja na dokumentach nie powiodła się.");
}

async function requireAdminUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji — zaloguj się ponownie.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "ADMIN") throw new Error("Brak uprawnień administratora.");
  return user.id;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-ąćęłńóśźżĄĆĘŁŃÓŚŹŻ ()]/gi, "_").slice(0, 180);
}

function collectDescendantFolderIds(folders: DocumentFolder[], rootId: string): string[] {
  const ids = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (f.parent_id && ids.has(f.parent_id) && !ids.has(f.id)) {
        ids.add(f.id);
        grew = true;
      }
    }
  }
  return [...ids];
}

function revalidateDocsPaths() {
  revalidatePath("/profil");
}

/** Główny folder nauczyciela (tworzony przy zakładaniu konta). */
export async function ensureTutorRootFolder(
  tutorId: string,
  fullName: string,
  createdBy?: string | null,
): Promise<DocumentFolder> {
  const supabase = createServiceClient();
  const name = fullName.trim() || "Nauczyciel";

  const { data: existing, error: fetchError } = await supabase
    .from("document_folders")
    .select("*")
    .eq("scope", "TUTOR")
    .eq("tutor_id", tutorId)
    .is("parent_id", null)
    .maybeSingle();

  if (fetchError) throwDocsError(fetchError);
  if (existing) {
    if (existing.name !== name) {
      const { data: updated, error: updateError } = await supabase
        .from("document_folders")
        .update({ name })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (updateError) throwDocsError(updateError);
      return updated as DocumentFolder;
    }
    return existing as DocumentFolder;
  }

  const { data, error } = await supabase
    .from("document_folders")
    .insert({
      name,
      parent_id: null,
      scope: "TUTOR",
      tutor_id: tutorId,
      created_by: createdBy ?? null,
    })
    .select("*")
    .single();

  if (error) throwDocsError(error);
  return data as DocumentFolder;
}

/** Uzupełnia brakujące foldery dla istniejących nauczycieli (admin). */
export async function syncMissingTutorRootFolders(): Promise<void> {
  const supabase = createServiceClient();
  const { data: tutors, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "TUTOR");

  if (error) throwDocsError(error);

  for (const tutor of tutors ?? []) {
    await ensureTutorRootFolder(tutor.id, tutor.full_name ?? "Nauczyciel");
  }
}

export async function createFolder(input: {
  name: string;
  parentId: string | null;
  scope: "COMPANY" | "TUTOR";
  tutorId?: string | null;
}) {
  const adminId = await requireAdminUserId();
  const name = input.name.trim();
  if (!name) throw new Error("Nazwa folderu nie może być pusta.");
  if (input.scope === "TUTOR" && !input.tutorId) {
    throw new Error("Folder nauczyciela wymaga tutorId.");
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("document_folders")
    .insert({
      name,
      parent_id: input.parentId,
      scope: input.scope,
      tutor_id: input.scope === "TUTOR" ? input.tutorId : null,
      created_by: adminId,
    })
    .select("*")
    .single();

  if (error) throwDocsError(error);
  revalidateDocsPaths();
  return data as DocumentFolder;
}

/** formData: file + optional fields folderId, scope, tutorId */
export async function uploadDocumentFile(formData: FormData) {
  const adminId = await requireAdminUserId();

  const scopeRaw = String(formData.get("scope") ?? "COMPANY");
  const scope: "COMPANY" | "TUTOR" = scopeRaw === "TUTOR" ? "TUTOR" : "COMPANY";
  const tutorIdRaw = formData.get("tutorId");
  const tutorId =
    typeof tutorIdRaw === "string" && tutorIdRaw.length > 0 ? tutorIdRaw : null;
  const folderIdRaw = formData.get("folderId");
  const folderId =
    typeof folderIdRaw === "string" && folderIdRaw.length > 0 ? folderIdRaw : null;

  if (scope === "TUTOR" && !tutorId) {
    throw new Error("Plik nauczyciela wymaga tutorId.");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Wybierz niepusty plik do wgrania.");
  }

  const safeName = sanitizeFileName(file.name || "plik");
  const unique = crypto.randomUUID();
  const prefix = scope === "COMPANY" ? "company" : tutorId!;
  const storagePath = `${prefix}/${unique}-${safeName}`;

  const supabase = createServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (uploadError) throwDocsError(uploadError);

  const { data, error } = await supabase
    .from("document_files")
    .insert({
      folder_id: folderId,
      name: safeName,
      storage_path: storagePath,
      mime_type: file.type || null,
      size_bytes: file.size,
      scope,
      tutor_id: scope === "TUTOR" ? tutorId : null,
      uploaded_by: adminId,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from("documents").remove([storagePath]);
    throwDocsError(error);
  }

  revalidateDocsPaths();
  return data as DocumentFile;
}

export async function deleteDocumentFile(id: string) {
  await requireAdminUserId();
  const supabase = createServiceClient();

  const { data: row, error: fetchError } = await supabase
    .from("document_files")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) throwDocsError(fetchError);
  if (!row) throw new Error("Nie znaleziono pliku.");

  const file = row as DocumentFile;
  const { error: storageError } = await supabase.storage.from("documents").remove([file.storage_path]);
  if (storageError && !isMissingDocsSchema(storageError)) {
    // kontynuuj usuwanie rekordu nawet gdy obiekt już nie istnieje
    const msg = (storageError.message ?? "").toLowerCase();
    if (!msg.includes("not found") && !msg.includes("does not exist")) {
      throwDocsError(storageError);
    }
  }

  const { error } = await supabase.from("document_files").delete().eq("id", id);
  if (error) throwDocsError(error);

  revalidateDocsPaths();
}

export async function deleteFolder(id: string) {
  await requireAdminUserId();
  const supabase = createServiceClient();

  const { data: foldersRaw, error: foldersError } = await supabase.from("document_folders").select("*");
  if (foldersError) throwDocsError(foldersError);

  const folders = (foldersRaw ?? []) as DocumentFolder[];
  if (!folders.some((f) => f.id === id)) throw new Error("Nie znaleziono folderu.");

  const folderIds = collectDescendantFolderIds(folders, id);

  const { data: filesRaw, error: filesError } = await supabase
    .from("document_files")
    .select("*")
    .in("folder_id", folderIds);

  if (filesError) throwDocsError(filesError);

  const files = (filesRaw ?? []) as DocumentFile[];
  if (files.length > 0) {
    const paths = files.map((f) => f.storage_path);
    await supabase.storage.from("documents").remove(paths);
    const { error: delFilesError } = await supabase
      .from("document_files")
      .delete()
      .in("id", files.map((f) => f.id));
    if (delFilesError) throwDocsError(delFilesError);
  }

  const { error } = await supabase.from("document_folders").delete().eq("id", id);
  if (error) throwDocsError(error);

  revalidateDocsPaths();
}

export async function listDocumentsForAdmin(): Promise<{
  folders: DocumentFolder[];
  files: DocumentFile[];
}> {
  await requireAdminUserId();
  const supabase = createServiceClient();

  const foldersRes = await supabase.from("document_folders").select("*").order("name");
  if (foldersRes.error) throwDocsError(foldersRes.error);

  const filesRes = await supabase.from("document_files").select("*").order("name");
  if (filesRes.error) throwDocsError(filesRes.error);

  return {
    folders: (foldersRes.data ?? []) as DocumentFolder[],
    files: (filesRes.data ?? []) as DocumentFile[],
  };
}

export async function listDocumentsForTutor(tutorId: string): Promise<{
  folders: DocumentFolder[];
  files: DocumentFile[];
  companyFiles: DocumentFile[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji — zaloguj się ponownie.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "ADMIN" && user.id !== tutorId) {
    throw new Error("Brak dostępu do dokumentów tego nauczyciela.");
  }

  const foldersRes = await supabase
    .from("document_folders")
    .select("*")
    .or(`and(scope.eq.TUTOR,tutor_id.eq.${tutorId}),scope.eq.COMPANY`)
    .order("name");

  if (foldersRes.error) throwDocsError(foldersRes.error);

  const filesRes = await supabase
    .from("document_files")
    .select("*")
    .or(`and(scope.eq.TUTOR,tutor_id.eq.${tutorId}),scope.eq.COMPANY`)
    .order("name");

  if (filesRes.error) throwDocsError(filesRes.error);

  const folders = (foldersRes.data ?? []) as DocumentFolder[];
  const allFiles = (filesRes.data ?? []) as DocumentFile[];

  return {
    folders: folders.filter((f) => f.scope === "TUTOR" && f.tutor_id === tutorId),
    files: allFiles.filter((f) => f.scope === "TUTOR" && f.tutor_id === tutorId),
    companyFiles: allFiles.filter((f) => f.scope === "COMPANY"),
  };
}

export async function getSignedDownloadUrl(storagePath: string): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Brak sesji — zaloguj się ponownie.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const firstSegment = storagePath.split("/")[0] ?? "";
  const isAdmin = profile?.role === "ADMIN";
  const allowed =
    isAdmin || firstSegment === "company" || firstSegment === user.id;
  if (!allowed) throw new Error("Brak dostępu do tego pliku.");

  const service = createServiceClient();
  const { data, error } = await service.storage.from("documents").createSignedUrl(storagePath, 120);

  if (error) throwDocsError(error);
  if (!data?.signedUrl) throw new Error("Nie udało się wygenerować linku do pobrania.");
  return data.signedUrl;
}
