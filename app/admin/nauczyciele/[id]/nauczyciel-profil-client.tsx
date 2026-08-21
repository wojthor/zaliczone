"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  archiveTutorAccount,
  clearTutorPhoto,
  updateTutorProfile,
  uploadTutorPhoto,
} from "@/lib/actions/admin";
import { unblockStudent } from "@/lib/actions/alerts";
import { BonusProgressBar } from "@/components/bonus-progress-bar";
import { SubjectMultiSelect } from "@/components/admin/subject-multi-select";
import { TutorPhotoField } from "@/components/admin/tutor-photo-field";
import { TutorPitPanel } from "@/components/admin/tutor-pit-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TUTOR_SHARE, bonusProgress } from "@/lib/dates";
import type { AdminTutorSummary, FinanceLineUi } from "@/lib/types/database";
import type { TutorPitYearSummary } from "@/lib/types/pit";
import type { AdminStudentRow } from "@/lib/types/messages";

function formatDdMmYyyy(iso: string | null): string {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

function formatPln(n: number): string {
  return `${n.toLocaleString("pl-PL", { maximumFractionDigits: 0 })} zł`;
}

function minutesFromLabel(label: string): number {
  const match = label.match(/(\d+)\s*min/);
  return match ? Number(match[1]) : 60;
}

export function NauczycielProfilClient({
  tutor,
  students,
  pending,
  unpaid,
  verified,
  pitYearSummary,
}: {
  tutor: AdminTutorSummary;
  students: AdminStudentRow[];
  pending: FinanceLineUi[];
  unpaid: FinanceLineUi[];
  verified: FinanceLineUi[];
  pitYearSummary: TutorPitYearSummary;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [pitOpen, setPitOpen] = useState(false);
  const [form, setForm] = useState<{
    fullName: string;
    phone: string;
    bank: string;
    olx: string;
    subjects: string[];
    contractStart: string;
    contractEnd: string;
  }>({
    fullName: tutor.name,
    phone: tutor.phone ?? "",
    bank: tutor.bankAccount ?? "",
    olx: tutor.olxUrl ?? "",
    subjects: [...tutor.subjects],
    contractStart: tutor.contractStart ?? "",
    contractEnd: tutor.contractEnd ?? "",
  });
  const [feedback, setFeedback] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const monthStats = useMemo(() => {
    const revenue = verified.reduce((s, l) => s + l.amountPln, 0);
    const hours =
      Math.round(
        (verified.reduce((s, l) => s + minutesFromLabel(l.label), 0) / 60) * 10,
      ) / 10;
    const share = Math.round(revenue * TUTOR_SHARE * 100) / 100;
    const bonus = bonusProgress(hours);
    const payout = Math.round((share + (bonus.achieved ? bonus.bonusPln : 0)) * 100) / 100;
    return {
      lessons: verified.length,
      hours,
      revenue,
      payout,
      bonusAchieved: bonus.achieved,
      bonusPln: bonus.bonusPln,
    };
  }, [verified]);

  function save() {
    startTransition(async () => {
      try {
        await updateTutorProfile(tutor.id, {
          fullName: form.fullName.trim() || tutor.name,
          activeSubjects: form.subjects,
          phone: form.phone || null,
          bankAccount: form.bank || null,
          olxUrl: form.olx || null,
          contractStart: form.contractStart || null,
          contractEnd: form.contractEnd || null,
        });
        if (photoFile) {
          const fd = new FormData();
          fd.set("photo", photoFile);
          await uploadTutorPhoto(tutor.id, fd);
          setPhotoFile(null);
        }
        setEditing(false);
        setFeedback("Zapisano.");
        router.refresh();
      } catch (e) {
        setFeedback(e instanceof Error ? e.message : "Nie udało się zapisać.");
      }
    });
  }

  function unlockStudent(studentId: string) {
    startTransition(async () => {
      try {
        await unblockStudent(studentId);
        setFeedback("Uczeń odblokowany.");
        router.refresh();
      } catch (e) {
        setFeedback(e instanceof Error ? e.message : "Nie udało się odblokować ucznia.");
      }
    });
  }

  function savePhoto(file: File) {
    setPhotoBusy(true);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("photo", file);
        await uploadTutorPhoto(tutor.id, fd);
        setPhotoFile(null);
        setFeedback("Zdjęcie zapisane.");
        router.refresh();
      } catch (e) {
        setFeedback(e instanceof Error ? e.message : "Nie udało się zapisać zdjęcia.");
      } finally {
        setPhotoBusy(false);
      }
    });
  }

  function removePhoto() {
    setPhotoBusy(true);
    startTransition(async () => {
      try {
        await clearTutorPhoto(tutor.id);
        setPhotoFile(null);
        setFeedback("Zdjęcie usunięte.");
        router.refresh();
      } catch (e) {
        setFeedback(e instanceof Error ? e.message : "Nie udało się usunąć zdjęcia.");
      } finally {
        setPhotoBusy(false);
      }
    });
  }

  async function handleArchiveConfirmed() {
    await archiveTutorAccount(tutor.id);
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const isFormer = Boolean(tutor.contractEnd && tutor.contractEnd <= todayIso);
  const initials =
    tutor.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/admin/nauczyciele" className="dash-sans text-muted text-xs font-semibold hover:underline">
            ← Nauczyciele
          </Link>
          <div className="mt-2 flex items-start gap-3">
            <TutorPhotoField
              inline
              initials={initials}
              currentUrl={tutor.photoUrl}
              file={photoFile}
              onFileChange={(f) => {
                setPhotoFile(f);
                if (f) savePhoto(f);
              }}
              onClearSaved={tutor.photoUrl ? removePhoto : undefined}
              clearing={photoBusy}
              disabled={busy || photoBusy}
            />
            <div className="min-w-0">
              <h1 className="dash-sans text-depths text-2xl font-bold tracking-tight sm:text-3xl">
                {tutor.name}
              </h1>
              <span className="mt-1.5 block h-1 w-10 rounded-full bg-lime" aria-hidden />
              <p className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={
                isFormer
                  ? "rounded-ledger bg-mist px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-steel"
                  : tutor.acceptingStudents
                    ? "badge-action"
                    : "rounded-ledger bg-mist px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-steel"
              }
            >
              {isFormer ? "Były pracownik" : tutor.acceptingStudents ? "Przyjmuje uczniów" : "Nie chce nowych uczniów"}
            </span>
          </p>
          <p className="dash-sans text-muted mt-2 text-sm">
            <span>{tutor.phone ?? "brak tel."}</span>
            <span className="mx-1.5 opacity-40">·</span>
            <span>
              {tutor.email ? (
                <a href={`mailto:${tutor.email}`} className="font-medium text-[#000C4A] hover:underline">
                  {tutor.email}
                </a>
              ) : (
                "brak e-mail"
              )}
            </span>
            <span className="mx-1.5 opacity-40">·</span>
            <span>
              umowa: {formatDdMmYyyy(tutor.contractStart)} – {formatDdMmYyyy(tutor.contractEnd)}
            </span>
          </p>
          <p className="dash-sans text-depths mt-1.5 text-sm">
            <span className="text-muted">Nr rachunku:</span>{" "}
            <span className="dash-mono font-medium">{tutor.bankAccount ?? "-"}</span>
          </p>
          <p className="dash-sans text-depths mt-1 text-sm">
            <span className="text-muted">OLX:</span>{" "}
            {tutor.olxUrl ? (
              <a
                href={tutor.olxUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#000C4A] break-all hover:underline"
              >
                {tutor.olxUrl}
              </a>
            ) : (
              "-"
            )}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tutor.subjects.length === 0 ? (
              <span className="dash-sans text-muted text-sm">Brak przedmiotów</span>
            ) : (
              tutor.subjects.map((s, i) => (
                <span
                  key={`${tutor.id}-${s}-${i}`}
                  className="dash-sans rounded-ledger border border-mist bg-paper px-2.5 py-0.5 text-[0.7rem] font-semibold text-depths"
                >
                  {s}
                </span>
              ))
            )}
          </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setPitOpen(true)}
              className="dash-sans rounded-full border border-panel-frame/40 bg-transparent px-4 py-2 text-xs font-bold text-depths hover:bg-paper"
            >
              Dane do PIT
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing((v) => !v);
                setFeedback("");
              }}
              className="dash-sans rounded-full border border-panel-frame/40 bg-transparent px-4 py-2 text-xs font-bold text-depths"
            >
              {editing ? "Anuluj edycję" : "Edytuj"}
            </button>
            {!isFormer ? (
              <button
                type="button"
                onClick={() => setConfirmArchiveOpen(true)}
                disabled={busy}
                className="dash-sans rounded-full border border-panel-frame/40 bg-transparent px-4 py-2 text-xs font-bold text-depths disabled:opacity-60"
              >
                Zakończ współpracę
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {feedback ? <p className="dash-sans text-xs font-semibold text-[#000C4A]">{feedback}</p> : null}

      {editing ? (
        <section className="card-quiet p-4">
          <h2 className="section-label">Edycja profilu</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 sm:col-span-2">
              <span className="dash-sans text-xs font-semibold text-depths/80">Imię i nazwisko</span>
              <input
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                className="dash-sans rounded-app border border-panel-frame/40 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1">
              <span className="dash-sans text-xs font-semibold text-depths/80">Telefon</span>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="dash-mono rounded-app border border-panel-frame/40 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1">
              <span className="dash-sans text-xs font-semibold text-depths/80">Numer konta</span>
              <input
                value={form.bank}
                onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))}
                className="dash-mono rounded-app border border-panel-frame/40 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1 sm:col-span-2">
              <span className="dash-sans text-xs font-semibold text-depths/80">Link OLX</span>
              <input
                value={form.olx}
                onChange={(e) => setForm((f) => ({ ...f, olx: e.target.value }))}
                className="dash-sans rounded-app border border-panel-frame/40 px-3 py-2 text-sm"
                placeholder="https://..."
              />
            </label>
            <label className="grid gap-1">
              <span className="dash-sans text-xs font-semibold text-depths/80">Umowa od</span>
              <input
                type="date"
                value={form.contractStart}
                onChange={(e) => setForm((f) => ({ ...f, contractStart: e.target.value }))}
                className="dash-mono rounded-app border border-panel-frame/40 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1">
              <span className="dash-sans text-xs font-semibold text-depths/80">Umowa do</span>
              <input
                type="date"
                value={form.contractEnd}
                onChange={(e) => setForm((f) => ({ ...f, contractEnd: e.target.value }))}
                className="dash-mono rounded-app border border-panel-frame/40 px-3 py-2 text-sm"
              />
            </label>
            <div className="grid gap-1.5 sm:col-span-2">
              <span className="dash-sans text-xs font-semibold text-depths/80">Przedmioty</span>
              <SubjectMultiSelect
                selected={form.subjects}
                onChange={(subjects) => setForm((f) => ({ ...f, subjects }))}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="dash-sans mt-4 btn-block landing-navy px-4 py-2 text-xs font-bold text-lime disabled:opacity-60"
          >
            {busy ? "Zapisywanie…" : "Zapisz"}
          </button>
        </section>
      ) : null}

      {/* Dwa obszary: finanse | uczniowie */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="admin-card p-4">
          <h2 className="section-label">Bieżący miesiąc</h2>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
            <Metric label="Lekcje" value={String(monthStats.lessons)} />
            <Metric label="Godziny" value={String(monthStats.hours)} />
            <Metric label="Przychód (klient)" value={formatPln(monthStats.revenue)} />
            <div>
              <p className="section-label !text-muted">Jego wypłata</p>
              <p className="dash-mono text-depths mt-0.5 text-2xl font-black">
                {formatPln(monthStats.payout)}
              </p>
              <p className="dash-sans text-muted mt-0.5 text-[10px]">
                {monthStats.bonusAchieved
                  ? `70% + premia ${monthStats.bonusPln} zł`
                  : "70% ze stawki klienta"}
              </p>
            </div>
          </div>
          <BonusProgressBar hoursDone={monthStats.hours} minimal className="mt-4 w-full max-w-none" />
        </div>

        <div className="admin-card p-4">
          <div className="flex items-baseline justify-between gap-2 border-b-2 border-paper pb-2">
            <h2 className="section-label">Uczniowie</h2>
            <span className="dash-mono text-muted text-sm font-medium">{students.length}</span>
          </div>
          <ul className="mt-3 max-h-56 space-y-0 overflow-y-auto pr-1 scrollbar-panel">
            {students.length === 0 ? (
              <li className="dash-sans text-muted text-sm">Brak przypisanych uczniów.</li>
            ) : (
              students.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-paper py-2 text-sm last:border-0"
                >
                  <div className="min-w-0">
                    <p className="dash-sans flex flex-wrap items-center gap-1.5 font-semibold text-depths">
                      <span>{s.name}</span>
                      {s.blocked ? (
                        <span className="rounded-ledger bg-[#E23B3B]/10 px-2 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wide text-[#E23B3B]">
                          Zablokowany
                        </span>
                      ) : null}
                    </p>
                    <p className="dash-sans text-muted text-xs">
                      {s.class_level}
                      {s.subjects.length > 0 ? ` · ${s.subjects.join(", ")}` : ""}
                      {" · "}
                      <span className="dash-mono">{s.rate_pln} zł/h</span>
                    </p>
                  </div>
                  {s.blocked ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => unlockStudent(s.id)}
                      className="landing-navy rounded-full px-3 py-1 text-[0.65rem] font-semibold text-lime disabled:opacity-60"
                    >
                      Odblokuj
                    </button>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <LessonList title="Oczekujące na weryfikację" lines={pending} tone="toffee" />
        <LessonList title="Nieopłacone" lines={unpaid} tone="claret" />
        <LessonList title="Zatwierdzone" lines={verified} tone="moss" />
      </section>

      <ConfirmDialog
        open={confirmArchiveOpen}
        tone="neutral"
        title={`Zakończyć współpracę z ${tutor.name}?`}
        description="Ustawimy datę zakończenia umowy na dziś i zablokujemy logowanie. Profil, wypłaty i dane do PIT zostaną zachowane - będziesz mógł rozliczyć PIT na koniec roku."
        confirmLabel="Zakończ współpracę"
        successMessage="Współpraca zakończona."
        onConfirm={handleArchiveConfirmed}
        onSuccess={() => router.refresh()}
        onCancel={() => setConfirmArchiveOpen(false)}
      />

      <TutorPitPanel
        open={pitOpen}
        onClose={() => setPitOpen(false)}
        tutor={tutor}
        yearSummary={pitYearSummary}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="section-label !text-muted">{label}</p>
      <p className="dash-mono text-depths mt-0.5 text-2xl font-black">{value}</p>
      {hint ? <p className="dash-sans text-muted mt-0.5 text-[10px]">{hint}</p> : null}
    </div>
  );
}

function LessonList({
  title,
  lines,
  tone,
}: {
  title: string;
  lines: FinanceLineUi[];
  tone: "toffee" | "claret" | "moss";
}) {
  const bg = tone === "toffee" ? "bg-soft-lime/40" : tone === "claret" ? "bg-mist" : "bg-paper";
  const amount = "text-depths";

  return (
    <article className="admin-card p-4">
      <div className="flex items-baseline justify-between gap-2 border-b-2 border-paper pb-2">
        <h3 className="section-label">{title}</h3>
        <span className="dash-mono text-muted text-sm font-medium">{lines.length}</span>
      </div>
      <ul className="mt-2 max-h-52 space-y-1.5 overflow-y-auto scrollbar-panel">
        {lines.length === 0 ? (
          <li className="dash-sans text-muted text-sm">Brak pozycji.</li>
        ) : (
          lines.map((l) => (
            <li key={l.id} className={`dash-sans rounded-app ${bg} px-3 py-2 text-sm`}>
              {l.studentName} · {l.label} · <span className="dash-mono">{l.date}</span> ·{" "}
              <span className={`dash-mono font-bold ${amount}`}>{l.amountPln} zł</span>
            </li>
          ))
        )}
      </ul>
    </article>
  );
}
