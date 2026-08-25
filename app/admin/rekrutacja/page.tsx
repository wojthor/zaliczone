import { getCandidates } from "@/lib/data/queries";
import { RekrutacjaClient } from "./rekrutacja-client";

export default async function AdminRekrutacjaPage() {
  const candidates = await getCandidates();
  return <RekrutacjaClient initialCandidates={candidates} />;
}
