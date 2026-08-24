export type DriveFileItem = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
  modifiedAt: string | null;
  isFolder: boolean;
  webViewLink: string | null;
};

export type TutorDriveFilesResult = {
  configured: boolean;
  folderId: string | null;
  files: DriveFileItem[];
  errorMessage?: string;
};

export function driveFolderWebUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

export function driveFileWebUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
