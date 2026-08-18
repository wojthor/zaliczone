"use client";

import { useState } from "react";
import { Spinner, useToast } from "@/components/ui/toast";
import type { DriveFileItem, TutorDriveFilesResult } from "@/lib/google-drive/types";

function formatBytes(n: number | null): string {
  if (n == null || n <= 0) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fileHref(fileId: string, opts: { tutorId?: string; disposition: "inline" | "attachment" }) {
  const q = new URLSearchParams({ disposition: opts.disposition });
  if (opts.tutorId) q.set("tutorId", opts.tutorId);
  return `/api/drive/files/${encodeURIComponent(fileId)}?${q.toString()}`;
}

export function DriveFilesPanel({
  drive,
  tutorId,
  title = "Twoje dokumenty",
  emptyLabel = "Brak plików w folderze.",
}: {
  drive: TutorDriveFilesResult;
  /** Wymagane dla admina (API sprawdza folder nauczyciela). */
  tutorId?: string;
  title?: string;
  emptyLabel?: string;
}) {
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  function openFile(file: DriveFileItem, disposition: "inline" | "attachment") {
    if (file.isFolder) {
      toast.error("To jest folder", "Otwórz go bezpośrednio na Dysku Google.");
      return;
    }
    setBusyId(file.id);
    try {
      window.open(fileHref(file.id, { tutorId, disposition }), "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error("Nie udało się otworzyć pliku", e instanceof Error ? e.message : "Nieznany błąd");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="card-quiet p-4">
      <h2 className="section-label">{title}</h2>

      {!drive.configured ? (
        <p className="mt-3 rounded-app bg-mist px-3 py-2 text-xs text-depths">
          {drive.errorMessage ?? "Dysk Google nie jest podłączony."}
        </p>
      ) : drive.errorMessage && drive.files.length === 0 ? (
        <p className="mt-3 rounded-app bg-mist px-3 py-2 text-xs text-depths">{drive.errorMessage}</p>
      ) : drive.files.length === 0 ? (
        <p className="text-muted mt-3 text-sm">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 flex flex-col">
          {drive.files.map((file) => (
            <li
              key={file.id}
              className="flex flex-col gap-3 border-b-2 border-paper py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-depths">{file.name}</p>
                <p className="text-muted mt-0.5 text-xs">
                  {file.isFolder ? "Folder" : formatBytes(file.sizeBytes)}
                  {file.mimeType && !file.isFolder ? ` · ${file.mimeType}` : ""}
                  {file.modifiedAt
                    ? ` · ${new Date(file.modifiedAt).toLocaleDateString("pl-PL")}`
                    : ""}
                </p>
              </div>
              {!file.isFolder ? (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={busyId === file.id}
                    onClick={() => openFile(file, "inline")}
                    className="inline-flex items-center justify-center gap-2 rounded-ledger border border-mist bg-snow px-3 py-1.5 text-xs font-bold text-depths disabled:opacity-50"
                  >
                    {busyId === file.id ? <Spinner className="h-3 w-3" /> : null}
                    Podgląd
                  </button>
                  <button
                    type="button"
                    disabled={busyId === file.id}
                    onClick={() => openFile(file, "attachment")}
                    className="btn-block inline-flex items-center justify-center gap-2 bg-depths px-3 py-1.5 text-xs text-lime disabled:opacity-50"
                  >
                    Pobierz
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
