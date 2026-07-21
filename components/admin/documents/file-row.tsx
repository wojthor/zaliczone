"use client";

import { IconFileDoc } from "@/components/icons";
import type { DocumentFile } from "@/lib/types/database";

function formatBytes(n: number | null): string {
  if (n == null || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Wiersz pliku — ikona dokumentu, metadane, akcje jako lekkie linki tekstowe. */
export function FileRow({
  file,
  pending,
  onOpen,
  onDelete,
}: {
  file: DocumentFile;
  pending: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-ledger border border-panel-frame/20 bg-snow px-3 py-3 sm:py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ledger bg-luster text-[#000C4A]">
          <IconFileDoc className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <p className="dash-sans text-depths truncate text-sm font-semibold">{file.name}</p>
          <p className="dash-mono text-muted text-[10px]">
            {formatBytes(file.size_bytes)}
            {file.mime_type ? ` · ${file.mime_type}` : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3 pl-11 sm:pl-0">
        <button type="button" onClick={onOpen} className="dash-sans text-[11px] font-bold text-[#000C4A] hover:underline">
          Podgląd
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onDelete}
          className="dash-sans text-[11px] font-bold text-claret hover:underline disabled:opacity-50"
        >
          Usuń
        </button>
      </div>
    </div>
  );
}
