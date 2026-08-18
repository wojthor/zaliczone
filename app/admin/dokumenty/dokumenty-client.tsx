"use client";

import { useMemo, useState, useTransition } from "react";
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

type TutorOpt = { id: string; name: string };

function formatSize(n: number | null): string {
  if (n == null || n <= 0) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function DokumentyClient({
  tree,
  tutors,
}: {
  tree: DocumentTreeResult;
  tutors: TutorOpt[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [scope, setScope] = useState<"COMPANY" | "TUTOR">("COMPANY");
  const [tutorId, setTutorId] = useState(tutors[0]?.id ?? "");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState("");

  const folders = useMemo(() => {
    return tree.folders.filter((f) =>
      scope === "COMPANY" ? f.scope === "COMPANY" : f.scope === "TUTOR" && f.tutor_id === tutorId,
    );
  }, [tree.folders, scope, tutorId]);

  const currentFolder = folderId ? folders.find((f) => f.id === folderId) ?? null : null;
  const childFolders = folders.filter((f) => (folderId ? f.parent_id === folderId : f.parent_id === null));
  const files = tree.files.filter((file) => {
    const inScope =
      scope === "COMPANY" ? file.scope === "COMPANY" : file.scope === "TUTOR" && file.tutor_id === tutorId;
    if (!inScope) return false;
    return folderId ? file.folder_id === folderId : file.folder_id === null;
  });

  function run(action: () => Promise<void>, ok: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(ok);
        router.refresh();
      } catch (e) {
        toast.error("Nie udało się", e instanceof Error ? e.message : "Spróbuj jeszcze raz.");
      }
    });
  }

  function handleCreateFolder() {
    const name = newFolder.trim();
    if (!name) return;
    run(async () => {
      await createFolder({
        name,
        parentId: folderId,
        scope,
        tutorId: scope === "TUTOR" ? tutorId : null,
      });
      setNewFolder("");
    }, "Folder utworzony");
  }

  function handleUpload(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("scope", scope);
    if (folderId) fd.set("folderId", folderId);
    if (scope === "TUTOR") fd.set("tutorId", tutorId);
    run(() => uploadDocumentFile(fd).then(() => undefined), "Plik wgrany");
  }

  async function handleDownload(file: DocumentFile) {
    try {
      const url = await getSignedDownloadUrl(file.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error("Nie udało się otworzyć pliku", e instanceof Error ? e.message : "Spróbuj jeszcze raz.");
    }
  }

  if (!tree.available) {
    return <p className="text-muted text-sm">{tree.errorMessage ?? "Dysk dokumentów nie jest gotowy."}</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="dash-sans text-depths text-2xl font-bold tracking-tight">Dokumenty</h1>
        <p className="dash-sans text-muted mt-1 text-sm">
          Foldery i pliki firmy albo konkretnego nauczyciela. To, co wrzucisz nauczycielowi, zobaczy w Profilu.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="inline-flex rounded-app border border-panel-frame/40 bg-snow p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setScope("COMPANY");
              setFolderId(null);
            }}
            className={`rounded-ledger px-3 py-1.5 ${scope === "COMPANY" ? "bg-[#000C4A] text-lime" : "text-muted"}`}
          >
            Firma
          </button>
          <button
            type="button"
            onClick={() => {
              setScope("TUTOR");
              setFolderId(null);
            }}
            className={`rounded-ledger px-3 py-1.5 ${scope === "TUTOR" ? "bg-[#000C4A] text-lime" : "text-muted"}`}
          >
            Nauczyciel
          </button>
        </div>
        {scope === "TUTOR" ? (
          <select
            value={tutorId}
            onChange={(e) => {
              setTutorId(e.target.value);
              setFolderId(null);
            }}
            className="rounded-app border border-panel-frame/40 px-3 py-2 text-sm"
          >
            {tutors.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          className="font-semibold text-[#000C4A] underline"
          onClick={() => setFolderId(null)}
        >
          Katalog główny
        </button>
        {currentFolder ? <span className="text-muted">/ {currentFolder.name}</span> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={newFolder}
          onChange={(e) => setNewFolder(e.target.value)}
          placeholder="Nazwa folderu"
          className="rounded-app border border-panel-frame/40 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={pending || !newFolder.trim()}
          onClick={handleCreateFolder}
          className="rounded-full bg-[#000C4A] px-4 py-2 text-xs font-bold text-lime disabled:opacity-60"
        >
          Nowy folder
        </button>
        <label className="rounded-full border border-mist bg-snow px-4 py-2 text-xs font-bold text-depths">
          {pending ? <Spinner className="mr-1 inline h-3 w-3" /> : null}
          Wgraj plik
          <input
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <ul className="divide-y divide-mist rounded-app border border-panel-frame/40 bg-snow">
        {childFolders.map((folder) => (
          <FolderRow
            key={folder.id}
            folder={folder}
            disabled={pending}
            onOpen={() => setFolderId(folder.id)}
            onDelete={() => run(() => deleteFolder(folder.id), "Folder usunięty")}
          />
        ))}
        {files.map((file) => (
          <FileRow
            key={file.id}
            file={file}
            disabled={pending}
            onOpen={() => void handleDownload(file)}
            onDelete={() => run(() => deleteDocumentFile(file.id), "Plik usunięty")}
          />
        ))}
        {childFolders.length === 0 && files.length === 0 ? (
          <li className="text-muted px-4 py-6 text-center text-sm">Pusty folder.</li>
        ) : null}
      </ul>
    </div>
  );
}

function FolderRow({
  folder,
  disabled,
  onOpen,
  onDelete,
}: {
  folder: DocumentFolder;
  disabled: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <button type="button" onClick={onOpen} className="text-left text-sm font-semibold text-depths">
        {folder.name}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        className="text-xs font-semibold text-muted hover:text-depths disabled:opacity-50"
      >
        Usuń
      </button>
    </li>
  );
}

function FileRow({
  file,
  disabled,
  onOpen,
  onDelete,
}: {
  file: DocumentFile;
  disabled: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <button type="button" onClick={onOpen} className="min-w-0 text-left">
        <p className="truncate text-sm font-semibold text-depths">{file.name}</p>
        <p className="text-muted text-[11px]">{formatSize(file.size_bytes)}</p>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onDelete}
        className="text-xs font-semibold text-muted hover:text-depths disabled:opacity-50"
      >
        Usuń
      </button>
    </li>
  );
}
