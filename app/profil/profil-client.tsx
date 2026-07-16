"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { getSignedDownloadUrl } from "@/lib/actions/documents";
import { insertSubjectRequest } from "@/lib/data/mutations";
import { Spinner, useToast } from "@/components/ui/toast";
import type { DocumentTreeResult, Profile, SubjectRequest } from "@/lib/types/database";

const SUBJECT_SUGGESTIONS = [
  "Informatyka",
  "Geografia",
  "Hiszpański",
  "WOS",
  "Chemia organiczna",
] as const;

function formatBytes(n: number | null): string {
  if (n == null || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProfilClient({
  profile,
  email,
  subjectRequests,
  adminDocuments,
}: {
  profile: Profile;
  email: string;
  subjectRequests: SubjectRequest[];
  adminDocuments: DocumentTreeResult;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState("");

  const activeSubjects = useMemo(() => profile.active_subjects ?? [], [profile.active_subjects]);
  const pendingRequests = useMemo(
    () => subjectRequests.filter((r) => r.status === "PENDING"),
    [subjectRequests],
  );
  const rejectedRequests = useMemo(
    () => subjectRequests.filter((r) => r.status === "REJECTED"),
    [subjectRequests],
  );
  const pendingSubjects = useMemo(() => pendingRequests.map((r) => r.subject), [pendingRequests]);

  const availableSuggestions = useMemo(
    () =>
      SUBJECT_SUGGESTIONS.filter(
        (subject) => !activeSubjects.includes(subject) && !pendingSubjects.includes(subject),
      ),
    [activeSubjects, pendingSubjects],
  );

  function submitSubject() {
    if (!selectedSubject) return;
    startTransition(async () => {
      await insertSubjectRequest(selectedSubject);
      setSelectedSubject("");
      router.refresh();
    });
  }

  async function openAdminFile(fileId: string, storagePath: string, _preview: boolean) {
    setDownloadingId(fileId);
    try {
      const url = await getSignedDownloadUrl(storagePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error("Nie udało się otworzyć pliku", e instanceof Error ? e.message : "Nieznany błąd");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <PageShell title="Profil">
      <p className="text-muted mb-6 text-sm font-medium">
        Dane korepetytora, aktywne przedmioty oraz zgłoszenia do akceptacji administratora.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-app bg-snow/95 p-4 shadow-sm">
          <h2 className="text-depths text-base font-semibold tracking-tight">Dane kontaktowe</h2>
          <dl className="text-depths mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-muted text-xs font-semibold uppercase tracking-wide">Imię i nazwisko</dt>
              <dd className="mt-0.5 font-semibold">{profile.full_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs font-semibold uppercase tracking-wide">E-mail</dt>
              <dd className="mt-0.5 font-medium">{email}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs font-semibold uppercase tracking-wide">Telefon</dt>
              <dd className="mt-0.5 font-medium">
                {profile.phone ? (
                  <a href={`tel:${profile.phone}`} className="text-depths hover:underline">
                    {profile.phone}
                  </a>
                ) : (
                  "— (uzupełnia administrator)"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted text-xs font-semibold uppercase tracking-wide">Ogłoszenie OLX</dt>
              <dd className="mt-0.5 font-medium">
                {profile.olx_url ? (
                  <a
                    href={profile.olx_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-depths break-all hover:underline"
                  >
                    Zobacz ogłoszenie →
                  </a>
                ) : (
                  "— (uzupełnia administrator)"
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-app bg-jodhpur/80 p-4 shadow-sm">
          <h2 className="text-depths text-base font-semibold tracking-tight">Przedmioty</h2>
          <div className="mt-4">
            <p className="text-muted text-xs font-semibold uppercase tracking-wide">Aktywne</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeSubjects.length > 0 ? (
                activeSubjects.map((subject) => (
                  <span key={subject} className="rounded-full bg-[#000C4A] px-3 py-1.5 text-xs font-semibold text-lime">
                    {subject}
                  </span>
                ))
              ) : (
                <p className="text-muted text-sm">Brak aktywnych przedmiotów.</p>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-2">
            <label className="grid gap-1">
              <span className="text-muted text-xs font-semibold uppercase tracking-wide">Zgłoś nowy przedmiot</span>
              <select
                className="text-depths w-full rounded-app bg-snow px-3 py-2 text-sm font-medium"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="">Wybierz</option>
                {availableSuggestions.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={submitSubject}
              disabled={!selectedSubject || pending}
              className="w-fit rounded-full bg-[#000C4A] px-4 py-2 text-sm font-semibold text-lime disabled:opacity-50"
            >
              Zgłoś do akceptacji
            </button>
          </div>

          <div className="mt-4">
            <p className="text-muted text-xs font-semibold uppercase tracking-wide">Oczekujące</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pendingRequests.length > 0 ? (
                pendingRequests.map((r) => (
                  <span
                    key={r.id}
                    className="rounded-full border border-amber-400/60 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950"
                  >
                    {r.subject} · oczekuje
                  </span>
                ))
              ) : (
                <p className="text-muted text-sm">Brak zgłoszeń oczekujących.</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-muted text-xs font-semibold uppercase tracking-wide">Odrzucone</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {rejectedRequests.length > 0 ? (
                rejectedRequests.map((r) => (
                  <span
                    key={r.id}
                    className="rounded-full border border-red-400/50 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-900"
                  >
                    {r.subject} · odrzucono
                  </span>
                ))
              ) : (
                <p className="text-muted text-sm">Brak odrzuconych zgłoszeń.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-app border-2 border-panel-frame bg-luster/50 p-4">
        <h2 className="text-depths text-base font-semibold tracking-tight">Dokumenty</h2>
        <p className="text-muted mt-1 text-sm">
          Pliki, które administrator wgrał dla Ciebie (np. podpisane ewidencje).
        </p>

        {!adminDocuments.available ? (
          <p className="text-muted mt-3 rounded-app border border-amber-500/40 bg-amber-50 px-3 py-2 text-xs">
            {adminDocuments.errorMessage ?? "Dysk dokumentów niedostępny."}
          </p>
        ) : adminDocuments.files.length === 0 ? (
          <p className="text-muted mt-3 text-sm">Brak dokumentów od administratora.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {adminDocuments.files.map((file) => (
              <li
                key={file.id}
                className="flex flex-col gap-3 rounded-app border border-panel-frame/30 bg-snow px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-depths">{file.name}</p>
                  <p className="text-muted mt-0.5 text-xs">
                    {formatBytes(file.size_bytes)}
                    {file.mime_type ? ` · ${file.mime_type}` : ""}
                    {" · "}
                    {new Date(file.created_at).toLocaleDateString("pl-PL")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={downloadingId === file.id}
                    onClick={() => void openAdminFile(file.id, file.storage_path, true)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-panel-frame/40 bg-jodhpur px-3 py-1.5 text-xs font-bold text-depths disabled:opacity-50"
                  >
                    {downloadingId === file.id ? <Spinner className="h-3 w-3" /> : null}
                    Podgląd
                  </button>
                  <button
                    type="button"
                    disabled={downloadingId === file.id}
                    onClick={() => void openAdminFile(file.id, file.storage_path, false)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-panel-frame/40 bg-[#000C4A] px-3 py-1.5 text-xs font-bold text-lime disabled:opacity-50"
                  >
                    Pobierz
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
