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
import { Spinner, useToast } from "@/components/ui/toast";
import type { DocumentFile, DocumentFolder, DocumentTreeResult } from "@/lib/types/database";

type TabId = "company" | "employees";
type DiskMode = "company" | "employees";
type FilterKind = "all" | "folders" | "files";
type SortMode = "name-asc" | "name-desc" | "date-desc" | "date-asc";

function formatBytes(n: number | null): string {
  if (n == null || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

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
        <h1 className="text-depths text-2xl font-semibold tracking-tight">Dokumenty</h1>
        <p className="text-muted mt-1 text-sm">
          Dysk firmowy oraz foldery pracowników — przeciągnij pliki, aby je wgrać.
        </p>
      </div>

      <div className="flex flex-col gap-1 rounded-app border border-panel-frame/35 bg-luster/50 p-1 sm:flex-row">
        {(
          [
            ["employees", "Pracownicy"],
            ["company", "Dysk firmowy"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-app px-3 py-2 text-xs font-bold transition sm:text-sm ${
              tab === id ? "bg-[#000C4A] text-lime" : "text-muted hover:text-depths"
            }`}
          >
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
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const f of folders) {
      if (f.parent_id == null) initial[f.id] = true;
    }
    return initial;
  });
  const [newFolderName, setNewFolderName] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [filterKind, setFilterKind] = useState<FilterKind>("all");
  const [sortMode, setSortMode] = useState<SortMode>("name-asc");
  const [dragActive, setDragActive] = useState(false);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);
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

  function toggleExpanded(folderId: string) {
    setExpandedIds((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  }

  function openFolder(folderId: string | null) {
    setSelectedFolderId(folderId);
    setUploadTargetFolderId(folderId);
    if (folderId) {
      setExpandedIds((prev) => {
        const next = { ...prev, [folderId]: true };
        let cursor: string | null = folderId;
        while (cursor) {
          const folder = folderById.get(cursor);
          if (!folder?.parent_id) break;
          next[folder.parent_id] = true;
          cursor = folder.parent_id;
        }
        return next;
      });
    }
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
      if (uploadTargetFolderId) {
        setExpandedIds((prev) => ({ ...prev, [uploadTargetFolderId]: true }));
      }
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
        setExpandedIds((prev) => ({ ...prev, [folderId]: true }));
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
      <section className="rounded-app border border-amber-500/40 bg-amber-50 p-4">
        <h2 className="text-depths text-sm font-semibold">{title}</h2>
        <p className="text-muted mt-2 text-sm">{errorMessage ?? "Dysk dokumentów niedostępny."}</p>
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
        <div>
          <h2 className="text-depths text-sm font-semibold">{title}</h2>
          <p className="text-muted mt-1 text-xs">{description}</p>
        </div>
        {(pending || uploading) && (
          <span className="text-muted inline-flex items-center gap-2 text-xs">
            <Spinner /> {uploading ? "Wgrywanie…" : "Zapisywanie…"}
          </span>
        )}
      </div>

      <nav className="mt-3 flex flex-wrap items-center gap-1 text-xs" aria-label="Ścieżka">
        {breadcrumbs.map((crumb, i) => (
          <span key={`${crumb.id ?? "root"}-${i}`} className="inline-flex items-center gap-1">
            {i > 0 ? <span className="text-muted">›</span> : null}
            <button
              type="button"
              onClick={() => openFolder(crumb.id)}
              className={`font-semibold ${
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
          className="w-full min-w-0 flex-1 rounded-app border border-panel-frame/40 bg-white px-2.5 py-1.5 text-xs text-depths placeholder:text-muted sm:max-w-xs"
        />
        <div className="flex rounded-app border border-panel-frame/35 bg-luster/40 p-0.5">
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
              className={`rounded-app px-2.5 py-1.5 text-[10px] font-bold transition sm:text-xs ${
                filterKind === id ? "bg-[#000C4A] text-lime" : "text-muted hover:text-depths"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-1.5">
          <span className="text-muted text-[10px] font-semibold uppercase">Sortuj</span>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-app border border-panel-frame/40 bg-white px-2 py-1.5 text-xs text-depths"
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
            className="text-muted text-[10px] font-semibold hover:text-depths sm:text-xs"
          >
            Wyczyść
          </button>
        ) : null}
      </div>

      {uploadAllowed ? (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-app border border-panel-frame/25 bg-luster/30 p-3">
          {mode === "company" ? (
            <>
              <button
                type="button"
                disabled={uploading || pending}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full bg-[#000C4A] px-4 py-2 text-xs font-bold text-lime disabled:opacity-50"
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
            <span className="text-muted text-[10px] font-semibold uppercase">Podfolder</span>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={`W: ${currentPath}`}
              className="text-depths rounded-app border border-panel-frame/30 bg-snow px-3 py-2 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
              }}
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={handleCreateFolder}
            className="rounded-full border border-panel-frame/40 bg-jodhpur px-4 py-2 text-xs font-bold text-depths disabled:opacity-50"
          >
            + Folder
          </button>
        </div>
      ) : null}

      <p className="text-muted mt-2 text-[10px]">
        {uploadAllowed
          ? `Przeciągnij pliki tutaj lub na folder · ${currentPath}`
          : mode === "employees"
            ? "Wybierz folder pracownika, aby wgrać pliki"
            : `Przeciągnij pliki tutaj · ${currentPath}`}
      </p>

      <div
        className={`relative mt-4 min-h-48 rounded-app border-2 border-dashed transition-colors ${
          dragActive
            ? "border-[#000C4A] bg-lime/10"
            : "border-panel-frame/30 bg-luster/20"
        }`}
        onDrop={(e) => onDropZone(e)}
        onDragOver={onDragOver}
      >
        {dragActive && uploadAllowed ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-app bg-lime/15">
            <p className="text-depths text-sm font-bold">Upuść pliki tutaj</p>
          </div>
        ) : null}

        <div className="space-y-1.5 p-3">
          {!selectedFolderId ? (
            <>
              {mode === "employees" &&
              visibleRootFolders.length === 0 &&
              visibleRootFiles.length === 0 &&
              !filterQuery &&
              filterKind === "all" ? (
                <p className="text-muted py-8 text-center text-sm">
                  Brak nauczycieli — dodaj konto nauczyciela, a folder utworzy się automatycznie.
                </p>
              ) : null}
              {visibleRootFolders.length === 0 &&
              visibleRootFiles.length === 0 &&
              (filterQuery || filterKind !== "all") ? (
                <p className="text-muted py-8 text-center text-sm">Brak wyników dla wybranego filtra.</p>
              ) : null}
              {visibleRootFiles.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  pending={pending}
                  onOpen={() => void openSignedInNewTab(file)}
                  onDelete={() => {
                    if (!confirm(`Usunąć plik „${file.name}”?`)) return;
                    run(() => deleteDocumentFile(file.id), "Plik usunięty");
                  }}
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
                  onToggleExpand={() => toggleExpanded(folder.id)}
                  expanded={Boolean(expandedIds[folder.id])}
                  onDelete={() => {
                    if (!confirm(`Usunąć folder „${folder.name}” wraz z zawartością?`)) return;
                    run(() => deleteFolder(folder.id), "Folder usunięty");
                  }}
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
                  onToggleExpand={() => toggleExpanded(folder.id)}
                  expanded={Boolean(expandedIds[folder.id])}
                  onDelete={() => {
                    if (!confirm(`Usunąć folder „${folder.name}”?`)) return;
                    run(() => deleteFolder(folder.id), "Folder usunięty");
                  }}
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
                <p className="text-muted py-8 text-center text-sm">
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
                  onDelete={() => {
                    if (!confirm(`Usunąć plik „${file.name}”?`)) return;
                    run(() => deleteDocumentFile(file.id), "Plik usunięty");
                  }}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function FolderRow({
  folder,
  selected,
  dropHighlight,
  pending,
  allowDelete,
  fileCount,
  subfolderCount,
  expanded,
  onOpen,
  onToggleExpand,
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
  expanded: boolean;
  onOpen: () => void;
  onToggleExpand: () => void;
  onDelete: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const total = fileCount + subfolderCount;
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-app border px-3 py-2.5 transition ${
        dropHighlight
          ? "border-[#000C4A] bg-lime/20 ring-2 ring-lime/40"
          : selected
            ? "border-[#000C4A]/50 bg-luster/60"
            : "border-panel-frame/25 bg-snow hover:bg-luster/40"
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          onClick={onToggleExpand}
          className="text-muted shrink-0 text-xs font-bold"
          aria-label={expanded ? "Zwiń" : "Rozwiń"}
        >
          {expanded ? "▾" : "▸"}
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 truncate text-left text-sm font-semibold text-depths hover:underline"
        >
          📁 {folder.name}
        </button>
        {total > 0 ? (
          <span className="text-muted shrink-0 text-[10px] tabular-nums">
            {fileCount} pl. · {subfolderCount} fol.
          </span>
        ) : null}
      </div>
      {allowDelete ? (
        <button
          type="button"
          disabled={pending}
          onClick={onDelete}
          className="shrink-0 text-[10px] font-bold text-red-700 hover:underline disabled:opacity-50"
        >
          Usuń
        </button>
      ) : null}
    </div>
  );
}

function FileRow({
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
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-app border border-panel-frame/20 bg-snow px-3 py-2">
      <div className="min-w-0">
        <p className="text-depths truncate text-xs font-semibold">📄 {file.name}</p>
        <p className="text-muted text-[10px]">
          {formatBytes(file.size_bytes)}
          {file.mime_type ? ` · ${file.mime_type}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onOpen}
          className="text-[10px] font-bold text-[#000C4A] hover:underline"
        >
          Podgląd
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onDelete}
          className="text-[10px] font-bold text-red-700 hover:underline disabled:opacity-50"
        >
          Usuń
        </button>
      </div>
    </div>
  );
}
