"use client";

import { IconFolder } from "@/components/icons";
import type { DocumentFolder } from "@/lib/types/database";

/**
 * Wiersz folderu — czytelna hierarchia (ikona + nazwa + licznik zawartości) i duży,
 * jednoznaczny obszar kliknięcia „wejdź do folderu”. Osobny plik dla czytelności
 * (wydzielony z dokumenty-client.tsx).
 */
export function FolderRow({
  folder,
  selected,
  dropHighlight,
  pending,
  allowDelete,
  fileCount,
  subfolderCount,
  onOpen,
  onDelete,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  folder: DocumentFolder;
  selected: boolean;
  dropHighlight: boolean;
  pending: boolean;
  allowDelete: boolean;
  fileCount: number;
  subfolderCount: number;
  onOpen: () => void;
  onDelete: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const total = fileCount + subfolderCount;
  return (
    <div
      className={`status-rail flex items-center gap-2.5 rounded-ledger border px-3 py-3 transition sm:py-2.5 ${
        dropHighlight
          ? "status-rail-verified border-[#000C4A] bg-lime/20 ring-2 ring-lime/40"
          : selected
            ? "status-rail-neutral border-[#000C4A]/50 bg-luster/60"
            : "status-rail-neutral border-panel-frame/25 bg-snow hover:bg-luster/40"
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ledger bg-butter/40 text-toffee">
          <IconFolder className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="dash-sans text-depths block truncate text-sm font-bold">{folder.name}</span>
          <span className="dash-mono text-muted block text-[10px]">
            {total === 0 ? "puste" : `${fileCount} pl. · ${subfolderCount} fol.`}
          </span>
        </span>
        <span aria-hidden className="text-muted shrink-0 text-base leading-none">
          ›
        </span>
      </button>
      {allowDelete ? (
        <button
          type="button"
          disabled={pending}
          onClick={onDelete}
          className="dash-sans shrink-0 rounded-ledger px-2 py-1.5 text-[10px] font-bold text-claret hover:bg-claret/10 disabled:opacity-50"
        >
          Usuń
        </button>
      ) : null}
    </div>
  );
}
