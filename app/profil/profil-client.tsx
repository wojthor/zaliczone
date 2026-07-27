"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { getSignedDownloadUrl } from "@/lib/actions/documents";
import { setAcceptingStudents } from "@/lib/actions/profile";
import { insertSubjectRequest } from "@/lib/data/mutations";
import { Spinner, useToast } from "@/components/ui/toast";
import { SUBJECTS } from "@/lib/subjects";
import type { DocumentTreeResult, Profile, SubjectRequest } from "@/lib/types/database";

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
  const [acceptingStudents, setAcceptingStudentsLocal] = useState(
    profile.accepting_students !== false,
  );

  useEffect(() => {
    setAcceptingStudentsLocal(profile.accepting_students !== false);
  }, [profile.accepting_students]);

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
      SUBJECTS.filter(
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

  function toggleAcceptingStudents() {
    const next = !acceptingStudents;
    setAcceptingStudentsLocal(next);
    startTransition(async () => {
      try {
        await setAcceptingStudents(next);
        toast.success(
          next ? "Dostępność włączona" : "Dostępność wyłączona",
          next ? "Admin widzi, że przyjmujesz nowych uczniów." : "Admin widzi, że nie przyjmujesz nowych uczniów.",
        );
        router.refresh();
      } catch (e) {
        setAcceptingStudentsLocal(!next);
        toast.error(
          "Nie udało się zapisać dostępności",
          e instanceof Error ? e.message : "Nieznany błąd",
        );
      }
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
        <section className="card-quiet p-4">
          <h2 className="section-label">Dane kontaktowe</h2>
          <dl className="text-depths mt-4 space-y-3 text-sm">
            <div>
              <dt className="section-label !text-muted">Imię i nazwisko</dt>
              <dd className="mt-0.5 font-semibold">{profile.full_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="section-label !text-muted">E-mail</dt>
              <dd className="mt-0.5 font-medium">{email}</dd>
            </div>
            <div>
              <dt className="section-label !text-muted">Telefon</dt>
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
              <dt className="section-label !text-muted">Ogłoszenie OLX</dt>
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
            <div className="border-t-2 border-paper pt-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="section-label !text-muted">Dostępność</p>
                  <p className="text-depths mt-0.5 text-sm font-medium">
                    {acceptingStudents ? "Przyjmuję nowych uczniów" : "Nie przyjmuję nowych uczniów"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={acceptingStudents}
                  aria-label="Dostępność — przyjmowanie nowych uczniów"
                  disabled={pending}
                  onClick={toggleAcceptingStudents}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                    acceptingStudents ? "bg-depths" : "bg-steel"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-snow transition-transform ${
                      acceptingStudents ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <p className="text-muted mt-1.5 text-[0.7rem] leading-snug">
                Widoczne dla administratora na liście nauczycieli.
              </p>
            </div>
          </dl>
        </section>

        <section className="rounded-app bg-snow p-4">
          <h2 className="section-label">Przedmioty</h2>
          <div className="mt-4">
            <p className="section-label !text-muted">Aktywne</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeSubjects.length > 0 ? (
                activeSubjects.map((subject) => (
                  <span key={subject} className="badge-done">
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
              <span className="section-label !text-muted">Zgłoś nowy przedmiot</span>
              <select
                className="text-depths w-full rounded-app border border-mist bg-snow px-3 py-2 text-sm font-medium"
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
              className="btn-block w-fit bg-depths px-4 py-2 text-sm text-lime disabled:opacity-50"
            >
              Zgłoś do akceptacji
            </button>
          </div>

          <div className="mt-4">
            <p className="section-label !text-muted">Oczekujące</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pendingRequests.length > 0 ? (
                pendingRequests.map((r) => (
                  <span key={r.id} className="badge-action">
                    {r.subject} · oczekuje
                  </span>
                ))
              ) : (
                <p className="text-muted text-sm">Brak zgłoszeń oczekujących.</p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <p className="section-label !text-muted">Odrzucone</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {rejectedRequests.length > 0 ? (
                rejectedRequests.map((r) => (
                  <span key={r.id} className="rounded-ledger bg-mist px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-steel">
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

      <section className="card-quiet mt-6 p-4">
        <h2 className="section-label">Dokumenty</h2>
        <p className="text-muted mt-1 text-sm">
          Pliki, które administrator wgrał dla Ciebie (np. podpisane ewidencje).
        </p>

        {!adminDocuments.available ? (
          <p className="mt-3 rounded-app bg-mist px-3 py-2 text-xs text-depths">
            {adminDocuments.errorMessage ?? "Dysk dokumentów niedostępny."}
          </p>
        ) : adminDocuments.files.length === 0 ? (
          <p className="text-muted mt-3 text-sm">Brak dokumentów od administratora.</p>
        ) : (
          <ul className="mt-3 flex flex-col">
            {adminDocuments.files.map((file) => (
              <li
                key={file.id}
                className="flex flex-col gap-3 border-b-2 border-paper py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
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
                    className="inline-flex items-center justify-center gap-2 rounded-ledger border border-mist bg-snow px-3 py-1.5 text-xs font-bold text-depths disabled:opacity-50"
                  >
                    {downloadingId === file.id ? <Spinner className="h-3 w-3" /> : null}
                    Podgląd
                  </button>
                  <button
                    type="button"
                    disabled={downloadingId === file.id}
                    onClick={() => void openAdminFile(file.id, file.storage_path, false)}
                    className="btn-block inline-flex items-center justify-center gap-2 bg-depths px-3 py-1.5 text-xs text-lime disabled:opacity-50"
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
