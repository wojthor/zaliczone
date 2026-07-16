import { DokumentyClient } from "./dokumenty-client";
import { syncMissingTutorRootFolders } from "@/lib/actions/documents";
import { getDocumentTree } from "@/lib/data/queries";

export default async function AdminDokumentyPage() {
  await syncMissingTutorRootFolders();
  const documentTree = await getDocumentTree();

  return <DokumentyClient documentTree={documentTree} />;
}
