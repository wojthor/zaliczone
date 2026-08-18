import { DokumentyClient } from "./dokumenty-client";
import { getAllTutorProfiles, getDocumentTree } from "@/lib/data/queries";

export default async function AdminDokumentyPage() {
  const [tree, tutors] = await Promise.all([getDocumentTree(), getAllTutorProfiles()]);
  return (
    <DokumentyClient
      tree={tree}
      tutors={tutors.map((t) => ({ id: t.id, name: t.full_name ?? "Nauczyciel" }))}
    />
  );
}
