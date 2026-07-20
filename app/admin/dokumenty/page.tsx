import { DokumentyClient } from "./dokumenty-client";
import { syncMissingTutorRootFolders } from "@/lib/actions/documents";
import { getDocumentTree } from "@/lib/data/queries";

export default async function AdminDokumentyPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; tutor?: string }>;
}) {
  await syncMissingTutorRootFolders();
  const documentTree = await getDocumentTree();
  const params = await searchParams;
  const initialTab = params.tab === "company" ? "company" : "employees";
  const initialTutorId = params.tutor?.trim() || null;

  return (
    <DokumentyClient
      documentTree={documentTree}
      initialTab={initialTab}
      initialTutorId={initialTutorId}
    />
  );
}
