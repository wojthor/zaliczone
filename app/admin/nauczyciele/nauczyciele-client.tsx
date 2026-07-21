"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createTutorAccount } from "@/lib/actions/admin";
import { BonusProgressBar } from "@/components/bonus-progress-bar";
import { SubjectMultiSelect } from "@/components/admin/subject-multi-select";
import type { AdminTutorSummary } from "@/lib/types/database";

const PASSWORD_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomPassword(length = 12): string {
  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => PASSWORD_CHARS[n % PASSWORD_CHARS.length]).join("");
}

function formatContractRange(start: string | null, end: string | null): string {
  if (!start && !end) return "umowa: —";
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return iso;
    return `${d}.${m}.${y}`;
  };
  if (start && end) return `umowa: ${fmt(start)} – ${fmt(end)}`;
  if (start) return `umowa od ${fmt(start)}`;
  return `umowa do ${fmt(end!)}`;
}

export function NauczycieleClient({ initialTutors }: { initialTutors: AdminTutorSummary[] }) {
  const router = useRouter();
  const tutors = initialTutors;
  const [modalOpen, setModalOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<{ name: string; email: string; subjects: string[] }>({
    name: "",
    email: "",
    subjects: [],
  });
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState("");

  function openAdd() {
    setForm({ name: "", email: "", subjects: [] });
    setCreds(null);
    setError("");
    setModalOpen(true);
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    const name = form.name.trim();
    if (!email || !name) return;

    const password = randomPassword(12);
    const subjects = form.subjects;

    startTransition(async () => {
      try {
        await createTutorAccount({ email, fullName: name, tempPassword: password, activeSubjects: subjects });
        setCreds({ email, password });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nie udało się dodać nauczyciela.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="dash-sans text-depths text-2xl font-bold tracking-tight">Nauczyciele</h1>
          <p className="dash-sans text-muted mt-1 text-sm">
            Kadra i postęp do premii w bieżącym miesiącu. Edycja — w profilu.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="dash-sans btn-block bg-[#000C4A] px-4 py-2 text-sm font-bold text-lime"
        >
          + Dodaj nauczyciela
        </button>
      </div>

      <ul className="space-y-2">
        {tutors.length === 0 ? (
          <li className="dash-sans text-muted rounded-app border border-panel-frame/35 bg-snow p-4 text-sm">
            Brak nauczycieli. Dodaj pierwszego lub uruchom{" "}
            <code className="dash-mono text-xs">pnpm seed:battle</code>.
          </li>
        ) : (
          tutors.map((t) => (
            <li key={t.id} className="rounded-app border border-panel-frame/35 bg-snow p-3.5 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 sm:w-[38%] sm:max-w-md sm:flex-none">
                  <p className="dash-sans text-depths text-sm font-bold tracking-tight">{t.name}</p>
                  <p className="dash-sans text-muted mt-1 truncate text-xs">
                    <span>{t.phone ?? "brak tel."}</span>
                    <span className="mx-1.5 opacity-40">·</span>
                    <span>{t.email || "brak e-mail"}</span>
                    <span className="mx-1.5 opacity-40">·</span>
                    <span>{formatContractRange(t.contractStart, t.contractEnd)}</span>
                  </p>
                  <p className="dash-sans text-depths mt-1.5 truncate text-xs font-medium">
                    {t.subjects.length === 0 ? (
                      <span className="text-muted font-normal">Brak przedmiotów</span>
                    ) : (
                      t.subjects.join(" · ")
                    )}
                  </p>
                </div>

                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-4 sm:gap-5">
                  <div className="flex items-center gap-4 text-center">
                    <Stat value={String(t.students)} label="uczniów" />
                    <Stat value={String(t.lessonsDoneMonth)} label="lekcji" />
                    <Stat value={String(t.hoursDoneMonth)} label="godz." />
                  </div>
                  <BonusProgressBar hoursDone={t.hoursDoneMonth} minimal />
                </div>

                <Link
                  href={`/admin/nauczyciele/${t.id}`}
                  className="dash-sans inline-flex shrink-0 items-center gap-1.5 self-start rounded-app border border-panel-frame/50 bg-transparent px-2.5 py-1.5 text-[0.7rem] font-semibold text-depths transition hover:border-[#000C4A]/40 hover:bg-luster/40 sm:self-center"
                >
                  Wejdź w profil
                  <span aria-hidden className="text-sm leading-none">
                    →
                  </span>
                </Link>
              </div>
            </li>
          ))
        )}
      </ul>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[#000C4A]/50"
            aria-label="Zamknij"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-app border border-panel-frame/70 bg-snow p-6 shadow-lg">
            {creds ? (
              <div className="add-tutor-success-pop">
                <h2 className="dash-sans text-depths text-lg font-bold">Konto utworzone</h2>
                <p className="dash-sans text-muted mt-1 text-xs">
                  E-mail powitalny został wysłany (jeśli skonfigurowano Resend).
                </p>
                <div className="mt-4 space-y-2 rounded-app bg-luster p-4 text-sm">
                  <p className="dash-sans">
                    <span className="text-muted">E-mail:</span> <strong className="dash-mono">{creds.email}</strong>
                  </p>
                  <p className="dash-sans">
                    <span className="text-muted">Hasło:</span>{" "}
                    <strong className="dash-mono">{creds.password}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="dash-sans mt-4 w-full btn-block bg-[#000C4A] py-2 text-xs font-bold text-lime"
                >
                  Zamknij
                </button>
              </div>
            ) : (
              <form onSubmit={handleAdd}>
                <h2 className="dash-sans text-depths text-lg font-bold">Dodaj nauczyciela</h2>
                <div className="mt-4 space-y-3">
                  <label className="grid gap-1">
                    <span className="dash-sans text-xs font-semibold text-depths/80">Imię i nazwisko</span>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="dash-sans rounded-app border border-panel-frame/40 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="dash-sans text-xs font-semibold text-depths/80">E-mail</span>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="dash-sans rounded-app border border-panel-frame/40 px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="grid gap-1.5">
                    <span className="dash-sans text-xs font-semibold text-depths/80">Przedmioty</span>
                    <SubjectMultiSelect
                      selected={form.subjects}
                      onChange={(subjects) => setForm((f) => ({ ...f, subjects }))}
                    />
                  </div>
                  {error ? <p className="dash-sans text-xs font-semibold text-claret">{error}</p> : null}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="dash-sans rounded-full border px-4 py-2 text-xs font-bold"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="dash-sans btn-block bg-[#000C4A] px-4 py-2 text-xs font-bold text-lime disabled:opacity-60"
                  >
                    {pending ? "Tworzenie…" : "Utwórz konto"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-11">
      <p className="dash-mono text-depths text-base font-black leading-none">{value}</p>
      <p className="dash-sans text-muted mt-0.5 text-[9px] font-semibold uppercase tracking-wide">{label}</p>
    </div>
  );
}
