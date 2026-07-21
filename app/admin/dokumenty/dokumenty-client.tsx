"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createFolder,
  deleteDocumentFile,
  deleteFolder,
  getSignedDownloadUrl,
  uploadDocumentFile,
} from "@/lib/actions/documents";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner, useToast } from "@/components/ui/toast";
import { FolderRow } from "@/components/admin/documents/folder-row";
import { FileRow } from "@/components/admin/documents/file-row";
import { IconBuilding, IconUpload, IconUsers } from "@/components/icons";
import type { DocumentFile, DocumentFolder, DocumentTreeResult } from "@/lib/types/database";

type TabId = "company" | "employees";
type DiskMode = "company" | "employees";
type FilterKind = "all" | "folders" | "files";
type SortMode = "name-asc" | "name-desc" | "date-desc" | "date-asc";

function matchesNameQuery(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return name.toLowerCase().includes(q);
}

function compareBySortMode(
  a: { name: string; created_at: string },
  b: { name: string; created_at: string },
  sortMode: SortMode,
): number {
  if (sortMode === "name-asc") return a.name.localeCompare(b.name, "pl");
  if (sortMode === "name-desc") return b.name.localeCompare(a.name, "pl");
  if (sortMode === "date-desc") return b.created_at.localeCompare(a.created_at);
  return a.created_at.localeCompare(b.created_at);
}

function isTutorRootFolder(folder: DocumentFolder): boolean {
  return folder.scope === "TUTOR" && folder.parent_id == null;
}

export function DokumentyClient({
  documentTree,
  initialTab = "employees",
  initialTutorId = null,
}: {
  documentTree: DocumentTreeResult;
  initialTab?: TabId;
  initialTutorId?: string | null;
}) {
  const [tab, setTab] = useState<TabId>(initialTab);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="dash-sans text-depths text-2xl font-black tracking-tight sm:text-3xl">Dokumenty</h1>
        <p className="dash-sans text-muted mt-1 text-sm">
          Dysk firmowy oraz foldery pracowników — przeciągnij pliki, aby je wgrać.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1.5 rounded-ledger border border-panel-frame/35 bg-luster/50 p-1.5">
        {(
          [
            ["employees", "Pracownicy", IconUsers],
            ["company", "Dysk firmowy", IconBuilding],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`dash-sans flex items-center justify-center gap-2 rounded-ledger px-3 py-2.5 text-xs font-bold transition sm:text-sm ${
              tab === id ? "bg-[#000C4A] text-lime" : "text-muted hover:bg-white/60 hover:text-depths"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {tab === "company" ? (
        <DiskBrowser
          mode="company"
          title="Dysk firmowy"
          description="Pliki wewnętrzne placówki. Przeciągnij pliki na folder lub bieżące miejsce."
          rootLabel="Dysk firmowy"
          folders={documentTree.folders.filter((f) => f.scope === "COMPANY")}
          files={documentTree.files.filter((f) => f.scope === "COMPANY")}
          available={documentTree.available}
          errorMessage={documentTree.errorMessage}
        />
      ) : (
        <DiskBrowser
          mode="employees"
          title="Pracownicy"
          description="Każdy nauczyciel ma własny folder (tworzy się przy zakładaniu konta). Wgraj pliki do folderu pracownika."
          rootLabel="Pracownicy"
          folders={documentTree.folders.filter((f) => f.scope === "TUTOR")}
          files={documentTree.files.filter((f) => f.scope === "TUTOR")}
          available={documentTree.available}
          errorMessage={documentTree.errorMessage}
          initialTutorId={initialTutorId}
        />
      )}
    </div>
  );
}

function DiskBrowser({
  mode,
  title,
  description,
  rootLabel,
  folders,
  files,
  available,
  errorMessage,
  initialTutorId = null,
}: {
  mode: DiskMode;
  title: string;
  description: string;
  rootLabel: string;
  folders: DocumentFolder[];
  files: DocumentFile[];
  available: boolean;
  errorMessage?: string;
  initialTutorId?: string | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const initialFolderId =
    initialTutorId != null
      ? (folders.find((f) => f.tutor_id === initialTutorId && f.parent_id == null)?.id ?? null)
      : null;
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string | null>(initialFolderId);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId);
  const [newFolderName, setNewFolderName] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [filterKind, setFilterKind] = useState<FilterKind>("all");
  const [sortMode, setSortMode] = useState<SortMode>("name-asc");
  const [dragActive, setDragActive] = useState(false);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<
    { kind: "file"; id: string; name: string } | { kind: "folder"; id: string; name: string } | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  const scope = mode === "company" ? "COMPANY" : "TUTOR";

  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  const resolveTutorId = useCallback(
    (folderId: string | null): string | null => {
      if (mode === "company") return null;
      let cursor = folderId;
      while (cursor) {
        const folder = folderById.get(cursor);
        if (!folder) break;
        if (folder.tutor_id) return folder.tutor_id;
        cursor = folder.parent_id;
      }
      return null;
    },
    [folderById, mode],
  );

  const canUploadTo = useCallback(
    (folderId: string | null): boolean => {
      if (mode === "company") return true;
      return folderId != null && resolveTutorId(folderId) != null;
    },
    [mode, resolveTutorId],
  );

  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) => compareBySortMode(a, b, sortMode)),
    [folders, sortMode],
  );

  const visibleRootFolders = useMemo(() => {
    if (selectedFolderId) return [];
    if (filterKind === "files") return [];
    return sortedFolders.filter(
      (f) => f.parent_id == null && matchesNameQuery(f.name, filterQuery),
    );
  }, [sortedFolders, selectedFolderId, filterKind, filterQuery]);

  const visibleRootFiles = useMemo(() => {
    if (selectedFolderId) return [];
    if (filterKind === "folders") return [];
    return files
      .filter((f) => f.folder_id == null && matchesNameQuery(f.name, filterQuery))
      .sort((a, b) => compareBySortMode(a, b, sortMode));
  }, [files, selectedFolderId, filterKind, filterQuery, sortMode]);

  const currentFolderFiles = useMemo(() => {
    if (!selectedFolderId) return [];
    if (filterKind === "folders") return [];
    return files
      .filter(
        (f) => f.folder_id === selectedFolderId && matchesNameQuery(f.name, filterQuery),
      )
      .sort((a, b) => compareBySortMode(a, b, sortMode));
  }, [files, selectedFolderId, filterKind, filterQuery, sortMode]);

  const currentChildFolders = useMemo(() => {
    if (!selectedFolderId) return [];
    if (filterKind === "files") return [];
    return sortedFolders.filter(
      (f) => f.parent_id === selectedFolderId && matchesNameQuery(f.name, filterQuery),
    );
  }, [sortedFolders, selectedFolderId, filterKind, filterQuery]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, DocumentFolder[]>();
    for (const folder of sortedFolders) {
      const key = folder.parent_id;
      const list = map.get(key) ?? [];
      list.push(folder);
      map.set(key, list);
    }
    return map;
  }, [sortedFolders]);

  const filesByFolder = useMemo(() => {
    const map = new Map<string | null, DocumentFile[]>();
    for (const file of files) {
      const key = file.folder_id;
      const list = map.get(key) ?? [];
      list.push(file);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => compareBySortMode(a, b, sortMode));
    }
    return map;
  }, [files, sortMode]);

  const folderPathLabel = useCallback(
    (folderId: string | null): string => {
      if (!folderId) return rootLabel;
      const parts: string[] = [];
      let cursor: string | null = folderId;
      while (cursor) {
        const folder = folderById.get(cursor);
        if (!folder) break;
        parts.unshift(folder.name);
        cursor = folder.parent_id;
      }
      return [rootLabel, ...parts].join(" › ");
    },
    [folderById, rootLabel],
  );

  const breadcrumbs = useMemo(() => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: rootLabel }];
    if (!selectedFolderId) return crumbs;
    const chain: DocumentFolder[] = [];
    let cursor: string | null = selectedFolderId;
    while (cursor) {
      const folder = folderById.get(cursor);
      if (!folder) break;
      chain.unshift(folder);
      cursor = folder.parent_id;
    }
    for (const f of chain) crumbs.push({ id: f.id, name: f.name });
    return crumbs;
  }, [folderById, rootLabel, selectedFolderId]);

  function openFolder(folderId: string | null) {
    setSelectedFolderId(folderId);
    setUploadTargetFolderId(folderId);
  }

  function run(action: () => Promise<void>, okMsg: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(okMsg);
        router.refresh();
      } catch (e) {
        toast.error("Błąd", e instanceof Error ? e.message : "Nieznany błąd");
      }
    });
  }

  function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) {
      toast.info("Podaj nazwę folderu");
      return;
    }
    if (!canUploadTo(uploadTargetFolderId)) {
      toast.info("Wejdź do folderu pracownika, aby utworzyć podfolder");
      return;
    }
    const tutorId = resolveTutorId(uploadTargetFolderId);
    run(async () => {
      await createFolder({
        name,
        parentId: uploadTargetFolderId,
        scope,
        tutorId: scope === "TUTOR" ? tutorId : null,
      });
      setNewFolderName("");
    }, "Folder utworzony");
  }

  async function handleUpload(fileList: FileList | null, targetFolderId?: string | null) {
    const folderId = targetFolderId ?? uploadTargetFolderId;
    if (!fileList || fileList.length === 0) return;
    if (!canUploadTo(folderId)) {
      toast.info(
        mode === "employees"
          ? "Przeciągnij plik na folder pracownika lub wejdź do jego folderu"
          : "Wybierz miejsce docelowe",
      );
      return;
    }

    const tutorId = resolveTutorId(folderId);
    if (scope === "TUTOR" && !tutorId) {
      toast.error("Błąd", "Nie udało się przypisać pliku do pracownika.");
      return;
    }

    setUploading(true);
    setDragActive(false);
    setDropTargetFolderId(null);
    dragDepthRef.current = 0;

    const items = Array.from(fileList);
    let ok = 0;
    try {
      for (const file of items) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("scope", scope);
        if (folderId) formData.append("folderId", folderId);
        if (scope === "TUTOR" && tutorId) formData.append("tutorId", tutorId);
        await uploadDocumentFile(formData);
        ok += 1;
      }
      toast.success(
        ok === 1 ? "Plik wgrany" : `Wgrano ${ok} plików`,
        ok === 1 ? items[0]?.name : undefined,
      );
      if (folderId) {
        openFolder(folderId);
      }
      router.refresh();
    } catch (e) {
      toast.error(
        ok > 0 ? "Częściowy upload" : "Upload nieudany",
        e instanceof Error ? e.message : "Nieznany błąd",
      );
      if (ok > 0) router.refresh();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "file") {
      await deleteDocumentFile(pendingDelete.id);
    } else {
      await deleteFolder(pendingDelete.id);
    }
  }

  async function openSignedInNewTab(file: DocumentFile) {
    try {
      const url = await getSignedDownloadUrl(file.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error("Podgląd nieudany", e instanceof Error ? e.message : "Nieznany błąd");
    }
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragDepthRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) setDragActive(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setDragActive(false);
      setDropTargetFolderId(null);
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function onDropZone(e: React.DragEvent, folderId?: string | null) {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setDragActive(false);
    setDropTargetFolderId(null);
    void handleUpload(e.dataTransfer.files, folderId ?? uploadTargetFolderId);
  }

  const uploadAllowed = canUploadTo(uploadTargetFolderId);
  const currentPath = folderPathLabel(uploadTargetFolderId);

  if (!available) {
    return (
      <section className="rounded-app border border-toffee/40 bg-toffee/10 p-4">
        <h2 className="dash-sans text-depths text-sm font-semibold">{title}</h2>
        <p className="dash-sans text-muted mt-2 text-sm">{errorMessage ?? "Dysk dokumentów niedostępny."}</p>
      </section>
    );
  }

  return (
    <section
      className="rounded-app border border-panel-frame/35 bg-snow p-4"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-ledger ${
              mode === "company" ? "bg-butter/50 text-toffee" : "bg-luster text-[#000C4A]"
            }`}
          >
            {mode === "company" ? <IconBuilding className="h-4 w-4" /> : <IconUsers className="h-4 w-4" />}
          </span>
          <div>
            <h2 className="dash-sans text-depths text-sm font-bold">{title}</h2>
            <p className="dash-sans text-muted mt-0.5 text-xs">{description}</p>
          </div>
        </div>
        {(pending || uploading) && (
          <span className="dash-sans text-muted inline-flex items-center gap-2 text-xs">
            <Spinner /> {uploading ? "Wgrywanie…" : "Zapisywanie…"}
          </span>
        )}
      </div>

      <nav className="dash-sans mt-3 flex flex-wrap items-center gap-1.5 text-xs" aria-label="Ścieżka">
        {breadcrumbs.map((crumb, i) => (
          <span key={`${crumb.id ?? "root"}-${i}`} className="inline-flex items-center gap-1.5">
            {i > 0 ? <span className="text-muted" aria-hidden>›</span> : null}
            <button
              type="button"
              onClick={() => openFolder(crumb.id)}
              className={`font-bold ${
                crumb.id === selectedFolderId ? "text-depths" : "text-[#000C4A] hover:underline"
              }`}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </nav>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          placeholder={mode === "employees" && !selectedFolderId ? "Szukaj pracownika…" : "Szukaj…"}
          className="dash-sans w-full min-w-0 flex-1 rounded-ledger border border-panel-frame/40 bg-white px-2.5 py-1.5 text-xs text-depths placeholder:text-muted sm:max-w-xs"
        />
        <div className="flex rounded-ledger border border-panel-frame/35 bg-luster/40 p-0.5">
          {(
            [
              ["all", "Wszystko"],
              ["folders", "Foldery"],
              ["files", "Pliki"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilterKind(id)}
              className={`dash-sans rounded-ledger px-2.5 py-1.5 text-[10px] font-bold transition sm:text-xs ${
                filterKind === id ? "bg-[#000C4A] text-lime" : "text-muted hover:text-depths"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-1.5">
          <span className="dash-sans text-muted text-[10px] font-semibold uppercase">Sortuj</span>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="dash-sans rounded-ledger border border-panel-frame/40 bg-white px-2 py-1.5 text-xs text-depths"
          >
            <option value="name-asc">Nazwa A–Z</option>
            <option value="name-desc">Nazwa Z–A</option>
            <option value="date-desc">Najnowsze</option>
            <option value="date-asc">Najstarsze</option>
          </select>
        </label>
        {filterQuery || filterKind !== "all" || sortMode !== "name-asc" ? (
          <button
            type="button"
            onClick={() => {
              setFilterQuery("");
              setFilterKind("all");
              setSortMode("name-asc");
            }}
            className="dash-sans text-muted text-[10px] font-semibold hover:text-depths sm:text-xs"
          >
            Wyczyść
          </button>
        ) : null}
      </div>

      {uploadAllowed ? (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-ledger border border-panel-frame/25 bg-luster/30 p-3">
          {mode === "company" ? (
            <>
              <button
                type="button"
                disabled={uploading || pending}
                onClick={() => fileInputRef.current?.click()}
                className="dash-sans btn-block inline-flex items-center gap-2 bg-[#000C4A] px-4 py-2 text-xs text-lime disabled:opacity-50"
              >
                {uploading ? <Spinner /> : null}
                + Plik
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => void handleUpload(e.target.files)}
              />
            </>
          ) : null}
          <label className="grid min-w-44 flex-1 gap-1">
            <span className="dash-sans text-muted text-[10px] font-semibold uppercase">Podfolder</span>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={`W: ${currentPath}`}
              className="dash-sans text-depths rounded-ledger border border-panel-frame/30 bg-snow px-3 py-2 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
              }}
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={handleCreateFolder}
            className="dash-sans btn-block border border-panel-frame/40 bg-jodhpur px-4 py-2 text-xs text-depths disabled:opacity-50"
          >
            + Folder
          </button>
        </div>
      ) : null}

      <div
        className={`relative mt-4 min-h-56 rounded-ledger border-2 border-dashed transition-colors ${
          dragActive
            ? "border-[#000C4A] bg-lime/10"
            : "border-panel-frame/30 bg-luster/20"
        }`}
        onDrop={(e) => onDropZone(e)}
        onDragOver={onDragOver}
      >
        {dragActive && uploadAllowed ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-ledger bg-lime/15">
            <div className="flex flex-col items-center gap-2">
              <IconUpload className="h-7 w-7 text-[#000C4A]" />
              <p className="dash-sans text-depths text-sm font-bold">Upuść pliki tutaj</p>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 border-b border-dashed border-panel-frame/25 px-3 py-2.5">
          <p className="dash-sans text-muted flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
            <IconUpload className="h-3.5 w-3.5 shrink-0" />
            {uploadAllowed
              ? `Przeciągnij pliki tutaj lub na folder`
              : mode === "employees"
                ? "Wybierz folder pracownika, aby wgrać pliki"
                : `Przeciągnij pliki tutaj`}
          </p>
          <p className="dash-mono text-muted shrink-0 truncate text-[10px]">{currentPath}</p>
        </div>

        <div className="space-y-1.5 p-3">
          {!selectedFolderId ? (
            <>
              {mode === "employees" &&
              visibleRootFolders.length === 0 &&
              visibleRootFiles.length === 0 &&
              !filterQuery &&
              filterKind === "all" ? (
                <p className="dash-sans text-muted py-8 text-center text-sm">
                  Brak nauczycieli — dodaj konto nauczyciela, a folder utworzy się automatycznie.
                </p>
              ) : null}
              {visibleRootFolders.length === 0 &&
              visibleRootFiles.length === 0 &&
              (filterQuery || filterKind !== "all") ? (
                <p className="dash-sans text-muted py-8 text-center text-sm">Brak wyników dla wybranego filtra.</p>
              ) : null}
              {visibleRootFiles.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  pending={pending}
                  onOpen={() => void openSignedInNewTab(file)}
                  onDelete={() => setPendingDelete({ kind: "file", id: file.id, name: file.name })}
                />
              ))}
              {visibleRootFolders.map((folder) => (
                <FolderRow
                  key={folder.id}
                  folder={folder}
                  selected={selectedFolderId === folder.id}
                  dropHighlight={dropTargetFolderId === folder.id}
                  pending={pending}
                  allowDelete={!isTutorRootFolder(folder)}
                  fileCount={(filesByFolder.get(folder.id) ?? []).length}
                  subfolderCount={(childrenByParent.get(folder.id) ?? []).length}
                  onOpen={() => openFolder(folder.id)}
                  onDelete={() => setPendingDelete({ kind: "folder", id: folder.id, name: folder.name })}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDropTargetFolderId(folder.id);
                  }}
                  onDragLeave={(e) => {
                    e.stopPropagation();
                    setDropTargetFolderId((prev) => (prev === folder.id ? null : prev));
                  }}
                  onDrop={(e) => onDropZone(e, folder.id)}
                />
              ))}
            </>
          ) : (
            <>
              {currentChildFolders.map((folder) => (
                <FolderRow
                  key={folder.id}
                  folder={folder}
                  selected={false}
                  dropHighlight={dropTargetFolderId === folder.id}
                  pending={pending}
                  allowDelete={!isTutorRootFolder(folder)}
                  fileCount={(filesByFolder.get(folder.id) ?? []).length}
                  subfolderCount={(childrenByParent.get(folder.id) ?? []).length}
                  onOpen={() => openFolder(folder.id)}
                  onDelete={() => setPendingDelete({ kind: "folder", id: folder.id, name: folder.name })}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDropTargetFolderId(folder.id);
                  }}
                  onDragLeave={(e) => {
                    e.stopPropagation();
                    setDropTargetFolderId((prev) => (prev === folder.id ? null : prev));
                  }}
                  onDrop={(e) => onDropZone(e, folder.id)}
                />
              ))}
              {currentFolderFiles.length === 0 && currentChildFolders.length === 0 ? (
                <p className="dash-sans text-muted py-8 text-center text-sm">
                  {filterQuery || filterKind !== "all"
                    ? "Brak wyników dla wybranego filtra."
                    : "Folder pusty — przeciągnij pliki tutaj."}
                </p>
              ) : null}
              {currentFolderFiles.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  pending={pending}
                  onOpen={() => void openSignedInNewTab(file)}
                  onDelete={() => setPendingDelete({ kind: "file", id: file.id, name: file.name })}
                />
              ))}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        tone="danger"
        title={
          pendingDelete
            ? `Usunąć ${pendingDelete.kind === "file" ? "plik" : "folder wraz z zawartością"} „${pendingDelete.name}”?`
            : ""
        }
        description="Tej operacji nie można cofnąć."
        confirmLabel="Usuń"
        successMessage="Usunięto."
        onConfirm={handleConfirmDelete}
        onSuccess={() => router.refresh()}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
