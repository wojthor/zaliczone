"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  archiveTutorAccount,
  deleteTutorAccount,
  updateTutorProfile,
} from "@/lib/actions/admin";
import { BonusProgressBar } from "@/components/bonus-progress-bar";
import { SubjectMultiSelect } from "@/components/admin/subject-multi-select";
import { IconFolder } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TUTOR_SHARE, bonusProgress } from "@/lib/dates";
import type { AdminTutorSummary, FinanceLineUi } from "@/lib/types/database";
import type { AdminStudentRow } from "@/lib/types/messages";

function formatDdMmYyyy(iso: string | null): string {
  if (!iso) return "—";
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
}: {
  tutor: AdminTutorSummary;
  students: AdminStudentRow[];
  pending: FinanceLineUi[];
  unpaid: FinanceLineUi[];
  verified: FinanceLineUi[];
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
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
        setEditing(false);
        setFeedback("Zapisano.");
        router.refresh();
      } catch (e) {
        setFeedback(e instanceof Error ? e.message : "Nie udało się zapisać.");
      }
    });
  }

  async function handleArchiveConfirmed() {
    await archiveTutorAccount(tutor.id);
  }

  async function handleDeleteConfirmed() {
    await deleteTutorAccount(tutor.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/admin/nauczyciele" className="dash-sans text-muted text-xs font-semibold hover:underline">
            ← Nauczyciele
          </Link>
          <h1 className="dash-sans text-depths mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            {tutor.name}
          </h1>
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
            <span className="dash-mono font-medium">{tutor.bankAccount ?? "—"}</span>
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
              "—"
            )}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tutor.subjects.length === 0 ? (
              <span className="dash-sans text-muted text-sm">Brak przedmiotów</span>
            ) : (
              tutor.subjects.map((s, i) => (
                <span
                  key={`${tutor.id}-${s}-${i}`}
                  className="dash-sans rounded-full border border-panel-frame/40 bg-luster/50 px-2.5 py-0.5 text-[0.7rem] font-semibold text-depths"
                >
                  {s}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2 sm:justify-end">
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
            <button
              type="button"
              onClick={() => setConfirmArchiveOpen(true)}
              disabled={busy}
              className="dash-sans rounded-full border border-panel-frame/40 bg-transparent px-4 py-2 text-xs font-bold text-depths disabled:opacity-60"
            >
              Archiwizuj
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={busy}
              className="dash-sans rounded-full border border-claret/40 bg-transparent px-4 py-2 text-xs font-bold text-claret disabled:opacity-60"
            >
              Usuń konto
            </button>
          </div>
          <Link
            href={`/admin/dokumenty?tab=employees&tutor=${tutor.id}`}
            className="flex aspect-square w-26 flex-col items-center justify-center gap-2 rounded-app border border-panel-frame/35 bg-snow text-center transition hover:border-[#000C4A]/40 hover:bg-luster/40"
            title={`Dokumenty → Pracownicy → ${tutor.name}`}
          >
            <IconFolder className="h-9 w-9 text-[#000C4A]" />
            <span className="dash-sans text-depths text-xs font-bold leading-none">Dokumenty</span>
          </Link>
        </div>
      </div>

      {feedback ? <p className="dash-sans text-xs font-semibold text-[#000C4A]">{feedback}</p> : null}

      {editing ? (
        <section className="rounded-app border border-panel-frame/35 bg-snow p-4">
          <h2 className="dash-sans text-depths text-sm font-semibold">Edycja profilu</h2>
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
            className="dash-sans mt-4 btn-block bg-[#000C4A] px-4 py-2 text-xs font-bold text-lime disabled:opacity-60"
          >
            {busy ? "Zapisywanie…" : "Zapisz"}
          </button>
        </section>
      ) : null}

      {/* Dwa obszary: finanse | uczniowie */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-app border border-panel-frame/35 bg-snow p-4">
          <h2 className="dash-sans text-depths text-sm font-semibold">Bieżący miesiąc</h2>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
            <Metric label="Lekcje" value={String(monthStats.lessons)} />
            <Metric label="Godziny" value={String(monthStats.hours)} />
            <Metric label="Przychód (klient)" value={formatPln(monthStats.revenue)} />
            <Metric
              label="Jego wypłata"
              value={formatPln(monthStats.payout)}
              hint={
                monthStats.bonusAchieved
                  ? `70% + premia ${monthStats.bonusPln} zł`
                  : "70% ze stawki klienta"
              }
            />
          </div>
          <BonusProgressBar hoursDone={monthStats.hours} minimal className="mt-4 w-full max-w-none" />
        </div>

        <div className="rounded-app border border-panel-frame/35 bg-snow p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="dash-sans text-depths text-sm font-semibold">Uczniowie</h2>
            <span className="dash-mono text-muted text-sm font-medium">{students.length}</span>
          </div>
          <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-1 scrollbar-panel">
            {students.length === 0 ? (
              <li className="dash-sans text-muted text-sm">Brak przypisanych uczniów.</li>
            ) : (
              students.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-panel-frame/20 py-2 text-sm last:border-0"
                >
                  <span className="dash-sans font-semibold text-depths">{s.name}</span>
                  <span className="dash-sans text-muted text-xs">
                    {s.class_level}
                    {s.subjects.length > 0 ? ` · ${s.subjects.join(", ")}` : ""}
                    {" · "}
                    <span className="dash-mono">{s.rate_pln} zł/h</span>
                  </span>
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
        title={`Zarchiwizować nauczyciela ${tutor.name}?`}
        description="Ustawimy datę zakończenia umowy na dziś. Profil zostanie zachowany i będzie można go dalej edytować."
        confirmLabel="Archiwizuj"
        successMessage="Zarchiwizowano."
        onConfirm={handleArchiveConfirmed}
        onSuccess={() => router.refresh()}
        onCancel={() => setConfirmArchiveOpen(false)}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        tone="danger"
        title={`Usunąć konto ${tutor.name}?`}
        description="Tej operacji nie można cofnąć — konto, dostęp i powiązane dane logowania zostaną trwale usunięte."
        confirmLabel="Usuń konto"
        successMessage="Konto usunięte."
        onConfirm={handleDeleteConfirmed}
        onSuccess={() => router.replace("/admin/nauczyciele")}
        onCancel={() => setConfirmDeleteOpen(false)}
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
      <p className="dash-sans text-muted text-[10px] font-semibold uppercase tracking-wide">{label}</p>
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
  const bg = tone === "toffee" ? "bg-butter/25" : tone === "claret" ? "bg-claret/5" : "bg-lime/20";
  const amount = tone === "claret" ? "text-claret" : tone === "moss" ? "text-moss" : "text-depths";

  return (
    <article className="rounded-app border border-panel-frame/35 bg-snow p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="dash-sans text-depths font-semibold">{title}</h3>
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
