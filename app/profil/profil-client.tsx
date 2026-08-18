"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { DriveFilesPanel } from "@/components/drive/drive-files-panel";
import { setAcceptingStudents } from "@/lib/actions/profile";
import { insertSubjectRequest } from "@/lib/actions/students";
import { Spinner, useToast } from "@/components/ui/toast";
import { SUBJECTS } from "@/lib/subjects";
import type { TutorDriveFilesResult } from "@/lib/google-drive/types";
import type { Profile, SubjectRequest } from "@/lib/types/database";

export function ProfilClient({
  profile,
  email,
  subjectRequests,
  driveDocuments,
}: {
  profile: Profile;
  email: string;
  subjectRequests: SubjectRequest[];
  driveDocuments: TutorDriveFilesResult;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [subjectBusy, setSubjectBusy] = useState(false);
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
    const subject = selectedSubject;
    startTransition(async () => {
      setSubjectBusy(true);
      try {
        await insertSubjectRequest(subject);
        toast.success("Wysłano wniosek", `${subject} czeka na akceptację koordynatora.`);
        setSelectedSubject("");
        router.refresh();
      } catch (e) {
        toast.error(
          "Nie udało się zgłosić przedmiotu",
          e instanceof Error ? e.message : "Spróbuj jeszcze raz.",
        );
      } finally {
        setSubjectBusy(false);
      }
    });
  }

  function toggleAcceptingStudents() {
    const next = !acceptingStudents;
    setAcceptingStudentsLocal(next);
    startTransition(async () => {
      try {
        await setAcceptingStudents(next);
        toast.success(
          next ? "Przyjmujesz nowych uczniów" : "Nie przyjmujesz już nowych uczniów",
          next
            ? "Koordynator wie, że możesz brać nowych."
            : "Zostajesz na stronie. Koordynator zdejmie ogłoszenie z OLX.",
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

  return (
    <PageShell title="Profil">
      <p className="text-muted mb-6 text-sm font-medium">
        Dane korepetytora, aktywne przedmioty oraz zgłoszenia do akceptacji koordynatora.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="soft-panel p-4 sm:p-5">
          <h2 className="section-label">Dane kontaktowe</h2>
          <dl className="text-depths mt-4 space-y-3 text-sm">
            <div>
              <dt className="section-label !text-muted">Imię i nazwisko</dt>
              <dd className="mt-0.5 font-semibold">{profile.full_name ?? "-"}</dd>
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
                  "- (uzupełnia koordynator)"
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
                  "- (uzupełnia koordynator)"
                )}
              </dd>
            </div>
            <div className="border-t border-panel-frame/50 pt-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="section-label !text-muted">Dostępność</p>
                  <p className="text-depths mt-0.5 text-sm font-medium">
                    {acceptingStudents
                      ? "Przyjmuję nowych uczniów"
                      : "Nie przyjmuję już nowych uczniów"}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={acceptingStudents}
                  aria-label={
                    acceptingStudents
                      ? "Przyjmuję nowych uczniów"
                      : "Nie przyjmuję już nowych uczniów"
                  }
                  disabled={pending}
                  onClick={toggleAcceptingStudents}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                    acceptingStudents ? "bg-lime" : "bg-steel"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-snow shadow-sm transition-transform ${
                      acceptingStudents ? "translate-x-5 bg-[#000C4A]" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <p className="text-muted mt-1.5 text-[0.7rem] leading-snug">
                {acceptingStudents
                  ? "Wyłącz, gdy nie chcesz już nowych uczniów."
                  : "Zostajesz na stronie. Koordynator zdejmie ogłoszenie z OLX."}
              </p>
            </div>
          </dl>
        </section>

        <section className="soft-panel p-4 sm:p-5">
          <h2 className="section-label">Przedmioty</h2>
          <div className="mt-4">
            <p className="section-label !text-muted">Aktywne</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {activeSubjects.length > 0 ? (
                activeSubjects.map((subject) => (
                  <span
                    key={subject}
                    className="rounded-full bg-lime px-3 py-1 text-xs font-semibold text-depths"
                  >
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
                className="text-depths w-full rounded-full border border-panel-frame/50 bg-snow px-4 py-2 text-sm font-medium"
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
              className="inline-flex w-fit items-center gap-2 rounded-full bg-[#000C4A] px-4 py-2 text-sm font-semibold text-lime disabled:opacity-50"
            >
              {subjectBusy ? <Spinner className="h-3.5 w-3.5" /> : null}
              Zgłoś do akceptacji
            </button>
          </div>

          <div className="mt-4">
            <p className="section-label !text-muted">Oczekujące</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pendingRequests.length > 0 ? (
                pendingRequests.map((r) => (
                  <span
                    key={r.id}
                    className="rounded-full border border-[#000C4A]/20 bg-mist px-3 py-1 text-xs font-semibold text-depths"
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
            <p className="section-label !text-muted">Odrzucone</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {rejectedRequests.length > 0 ? (
                rejectedRequests.map((r) => (
                  <span
                    key={r.id}
                    className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-steel"
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

      <div className="mt-6">
        <DriveFilesPanel drive={driveDocuments} />
      </div>
    </PageShell>
  );
}
