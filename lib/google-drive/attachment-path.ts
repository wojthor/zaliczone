/** Czy ścieżka załącznika to ID pliku Google Drive (legacy Supabase używa „expenses/…”). */
export function isDriveInvoiceAttachmentPath(path: string | null | undefined): boolean {
  if (!path?.trim()) return false;
  return !path.includes("/");
}
