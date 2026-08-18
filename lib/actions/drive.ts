"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isDriveConfigured } from "@/lib/google-drive/client";
import {
  ensureTutorDriveFolder,
  listFilesInFolder,
  syncAllTutorDriveFolders,
} from "@/lib/google-drive/tutor-folders";
import type { TutorDriveFilesResult } from "@/lib/google-drive/types";

export type { TutorDriveFilesResult };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Wymagane logowanie.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, drive_folder_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) throw new Error("Brak profilu.");
  return { supabase, user, profile };
}

export async function getTutorDriveFilesForViewer(
  tutorId?: string,
): Promise<TutorDriveFilesResult> {
  if (!isDriveConfigured()) {
    return {
      configured: false,
      folderId: null,
      files: [],
      errorMessage:
        "Google Drive nie jest jeszcze podłączony. Koordynator musi uzupełnić dane service account w .env.local.",
    };
  }

  const { profile, supabase } = await requireUser();
  const targetId =
    profile.role === "ADMIN" && tutorId
      ? tutorId
      : profile.role === "TUTOR"
        ? profile.id
        : null;

  if (!targetId) {
    return {
      configured: true,
      folderId: null,
      files: [],
      errorMessage: "Brak dostępu.",
    };
  }

  if (profile.role === "TUTOR" && tutorId && tutorId !== profile.id) {
    return {
      configured: true,
      folderId: null,
      files: [],
      errorMessage: "Brak dostępu do folderu innego nauczyciela.",
    };
  }

  const { data: tutor } = await supabase
    .from("profiles")
    .select("id, full_name, drive_folder_id")
    .eq("id", targetId)
    .maybeSingle();

  if (!tutor) {
    return { configured: true, folderId: null, files: [], errorMessage: "Nie znaleziono nauczyciela." };
  }

  try {
    let folderId = (tutor.drive_folder_id as string | null) ?? null;
    if (!folderId) {
      if (profile.role === "ADMIN") {
        const ensured = await ensureTutorDriveFolder(
          tutor.id as string,
          (tutor.full_name as string) || "Nauczyciel",
        );
        folderId = ensured.folderId;
      } else {
        return {
          configured: true,
          folderId: null,
          files: [],
          errorMessage: "Twój folder na dysku nie jest jeszcze gotowy. Skontaktuj się z koordynatorem.",
        };
      }
    }

    const files = await listFilesInFolder(folderId);
    // Nauczyciel: tylko pliki (bez podfolderów do edycji - i tak tylko podgląd)
    const visible =
      profile.role === "TUTOR" ? files.filter((f) => !f.isFolder) : files;

    return { configured: true, folderId, files: visible };
  } catch (e) {
    return {
      configured: true,
      folderId: (tutor.drive_folder_id as string | null) ?? null,
      files: [],
      errorMessage: e instanceof Error ? e.message : "Nie udało się odczytać Dysku Google.",
    };
  }
}

export async function ensureTutorDriveFolderAction(tutorId: string, tutorName: string) {
  const { profile } = await requireUser();
  if (profile.role !== "ADMIN") throw new Error("Tylko koordynator.");
  if (!isDriveConfigured()) {
    throw new Error("Google Drive nie jest skonfigurowany.");
  }
  const result = await ensureTutorDriveFolder(tutorId, tutorName);
  revalidatePath(`/admin/nauczyciele/${tutorId}`);
  revalidatePath("/profil");
  return result;
}

export async function syncAllTutorDriveFoldersAction() {
  const { profile } = await requireUser();
  if (profile.role !== "ADMIN") throw new Error("Tylko koordynator.");
  if (!isDriveConfigured()) {
    throw new Error("Google Drive nie jest skonfigurowany.");
  }
  const result = await syncAllTutorDriveFolders();
  revalidatePath("/admin/nauczyciele");
  return result;
}
