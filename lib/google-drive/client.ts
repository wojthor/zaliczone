import { google } from "googleapis";
import type { drive_v3 } from "googleapis";

export type DriveConfig = {
  clientEmail: string;
  privateKey: string;
  teachersFolderId: string;
};

export function getDriveConfig(): DriveConfig | null {
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL?.trim();
  const privateKeyRaw = process.env.GOOGLE_DRIVE_PRIVATE_KEY;
  const teachersFolderId = process.env.GOOGLE_DRIVE_TEACHERS_FOLDER_ID?.trim();

  if (!clientEmail || !privateKeyRaw || !teachersFolderId) return null;

  const privateKey = privateKeyRaw.includes("\\n")
    ? privateKeyRaw.replace(/\\n/g, "\n")
    : privateKeyRaw;

  return { clientEmail, privateKey, teachersFolderId };
}

export function isDriveConfigured(): boolean {
  return getDriveConfig() !== null;
}

export function getDriveClient(): { drive: drive_v3.Drive; teachersFolderId: string } {
  const config = getDriveConfig();
  if (!config) {
    throw new Error(
      "Google Drive nie jest skonfigurowany. Uzupełnij GOOGLE_DRIVE_CLIENT_EMAIL, GOOGLE_DRIVE_PRIVATE_KEY i GOOGLE_DRIVE_TEACHERS_FOLDER_ID.",
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.clientEmail,
      private_key: config.privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return {
    drive: google.drive({ version: "v3", auth }),
    teachersFolderId: config.teachersFolderId,
  };
}
