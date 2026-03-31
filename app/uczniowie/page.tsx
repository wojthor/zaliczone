"use client";

import { useMemo, useState } from "react";
import { PageShell } from "@/components/page-shell";
import {
  DEMO_ACTIVE_SUBJECTS,
  DEMO_CENNIK,
  DEMO_STUDENTS,
  type DemoStudent,
} from "@/lib/demo-data";

type SortMode = "newest" | "oldest" | "az" | "za";

type StudentUi = DemoStudent & { createdAtTs: number };

type NewStudentDraft = {
  name: string;
  selectedSubjects: string[];
  classLabel: string;
  schoolClass: string;
  phone: string;
  email: string;
  nextLesson: string;
  notes: string;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NN";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function emptyDraft(): NewStudentDraft {
  return {
    name: "",
    selectedSubjects: [],
    classLabel: "",
    schoolClass: "",
    phone: "",
    email: "",
    nextLesson: "",
    notes: "",
  };
}

export default function UczniowiePage() {
  const [items, setItems] = useState<StudentUi[]>(() =>
    DEMO_STUDENTS.map((student, index) => ({ ...student, createdAtTs: 1_000 + index })),
  );
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<NewStudentDraft>(() => emptyDraft());

  const draftRate = useMemo(
    () => DEMO_CENNIK.find((row) => row.label === draft.classLabel)?.forClientPln ?? null,
    [draft.classLabel],
  );

  const filtered = useMemo(() => {
    let result = [...items];
    if (subjectFilter) {
      result = result.filter((student) =>
        student.subjectsLine
          .split(",")
          .map((subject) => subject.trim())
          .includes(subjectFilter),
      );
    }
    result.sort((a, b) => {
      if (sortMode === "newest") return b.createdAtTs - a.createdAtTs;
      if (sortMode === "oldest") return a.createdAtTs - b.createdAtTs;
      if (sortMode === "az") return a.name.localeCompare(b.name, "pl");
      return b.name.localeCompare(a.name, "pl");
    });
    return result;
  }, [items, sortMode, subjectFilter]);

  function toggleSubject(subject: string) {
    setDraft((prev) => ({
      ...prev,
      selectedSubjects: (prev.selectedSubjects ?? []).includes(subject)
        ? (prev.selectedSubjects ?? []).filter((item) => item !== subject)
        : [...(prev.selectedSubjects ?? []), subject],
    }));
  }

  function addStudent() {
    if (!draft.name.trim() || !draft.classLabel || draft.selectedSubjects.length === 0) return;
    const next: StudentUi = {
      id: `student-${Date.now()}`,
      name: draft.name.trim(),
      initials: initialsFromName(draft.name),
      subjectsLine: draft.selectedSubjects.join(", "),
      phone: draft.phone.trim() || "—",
      email: draft.email.trim() || "—",
      guardian: "Rodzic / opiekun (demo)",
      classLabel: draft.classLabel,
      schoolClass: draft.schoolClass.trim() || "Nie podano",
      notes: draft.notes.trim() || "—",
      ratePerHourPln: draftRate ?? 0,
      nextLesson: draft.nextLesson.trim() || "Brak zaplanowanej lekcji",
      createdAtTs: Date.now(),
    };
    setItems((prev) => [next, ...prev]);
    setDraft(emptyDraft());
    setModalOpen(false);
  }

  return (
    <PageShell title="Uczniowie">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <p className="text-muted max-w-2xl text-sm font-medium">
          Karty uczniów z poziomem, klasą, przedmiotami, stawką i możliwością dodawania nowych rekordów do lokalnej listy.
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-full bg-[#000C4A] px-4 py-2 text-sm font-semibold text-lime"
        >
          + Dodaj ucznia
        </button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-depths/80 text-xs font-semibold">Sortowanie</span>
          <select
            className="text-depths rounded-app border-2 border-panel-frame bg-luster px-3 py-2 text-sm font-medium"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
          >
            <option value="newest">Od najnowszych</option>
            <option value="oldest">Od najstarszych</option>
            <option value="az">Alfabetycznie A-Z</option>
            <option value="za">Alfabetycznie Z-A</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-depths/80 text-xs font-semibold">Filtr przedmiotu</span>
          <select
            className="text-depths rounded-app border-2 border-panel-frame bg-luster px-3 py-2 text-sm font-medium"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="">Wszystkie</option>
            {DEMO_ACTIVE_SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {filtered.map((student) => (
          <li key={student.id} className="rounded-app border-2 border-panel-frame/55 bg-snow/95 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#000C4A] text-sm font-bold text-luster">
                {student.initials}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-depths text-lg font-semibold leading-tight">{student.name}</h2>
                <p className="mt-1 flex flex-wrap gap-1.5">
                  {student.subjectsLine ? (
                    student.subjectsLine.split(",").map((subject) => (
                      <span key={subject} className="rounded-full bg-luster px-2.5 py-1 text-xs font-medium text-depths">
                        {subject.trim()}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted text-sm">Brak przedmiotów</span>
                  )}
                </p>
                <p className="text-depths/80 mt-2 text-xs font-semibold">
                  {student.classLabel} · {student.schoolClass}
                </p>
              </div>
            </div>
            <dl className="text-depths/90 mt-4 space-y-2 pt-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted font-medium">Telefon</dt>
                <dd className="text-right font-semibold tabular-nums">{student.phone}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted font-medium">E-mail</dt>
                <dd className="min-w-0 truncate text-right font-medium">{student.email}</dd>
              </div>
              <div>
                <dt className="text-muted font-medium">{student.guardian}</dt>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted font-medium">Stawka</dt>
                <dd className="font-bold tabular-nums">{student.ratePerHourPln} zł / h</dd>
              </div>
              <div>
                <dt className="text-muted text-xs font-medium">Następna lekcja</dt>
                <dd className="text-depths mt-0.5 font-semibold">{student.nextLesson}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs font-medium">Notatki</dt>
                <dd className="text-depths/85 mt-0.5 text-xs leading-snug">{student.notes}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[#000C4A]/50"
            aria-label="Zamknij"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-[min(42rem,94vw)] rounded-app border-2 border-panel-frame bg-snow p-5 sm:p-6">
            <h2 className="text-depths text-lg font-semibold tracking-tight">Dodaj ucznia</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1">
                <span className="text-depths/80 text-xs font-semibold">Imię i nazwisko</span>
                <input
                  className="text-depths rounded-app bg-luster px-3 py-2 text-sm"
                  value={draft.name}
                  onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                />
              </label>

              <div className="grid gap-1">
                <span className="text-depths/80 text-xs font-semibold">Przedmioty</span>
                <div className="flex flex-wrap gap-2">
                  {DEMO_ACTIVE_SUBJECTS.map((subject) => {
                    const active = (draft.selectedSubjects ?? []).includes(subject);
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleSubject(subject)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          active ? "bg-[#000C4A] text-lime" : "bg-luster text-depths"
                        }`}
                      >
                        {subject}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-depths/80 text-xs font-semibold">Poziom</span>
                  <select
                    className="text-depths rounded-app bg-luster px-3 py-2 text-sm"
                    value={draft.classLabel}
                    onChange={(e) => setDraft((prev) => ({ ...prev, classLabel: e.target.value }))}
                  >
                    <option value="">Wybierz</option>
                    {DEMO_CENNIK.map((row) => (
                      <option key={row.label} value={row.label}>
                        {row.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-depths/80 text-xs font-semibold">Stawka (zł / h)</span>
                  <div className="rounded-app bg-luster px-3 py-2 text-sm font-semibold text-depths">
                    {draftRate ? `${draftRate} zł / h` : "Wybierz poziom"}
                  </div>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-depths/80 text-xs font-semibold">Klasa (opcjonalnie)</span>
                  <input
                    className="text-depths rounded-app bg-luster px-3 py-2 text-sm"
                    value={draft.schoolClass}
                    onChange={(e) => setDraft((prev) => ({ ...prev, schoolClass: e.target.value }))}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-depths/80 text-xs font-semibold">Następna lekcja</span>
                  <input
                    className="text-depths rounded-app bg-luster px-3 py-2 text-sm"
                    value={draft.nextLesson}
                    onChange={(e) => setDraft((prev) => ({ ...prev, nextLesson: e.target.value }))}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-depths/80 text-xs font-semibold">Telefon</span>
                  <input
                    className="text-depths rounded-app bg-luster px-3 py-2 text-sm"
                    value={draft.phone}
                    onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-depths/80 text-xs font-semibold">E-mail</span>
                  <input
                    className="text-depths rounded-app bg-luster px-3 py-2 text-sm"
                    value={draft.email}
                    onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </label>
              </div>

              <label className="grid gap-1">
                <span className="text-depths/80 text-xs font-semibold">Notatki</span>
                <textarea
                  className="text-depths min-h-24 rounded-app bg-luster px-3 py-2 text-sm"
                  value={draft.notes}
                  onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full bg-luster px-4 py-2 text-sm font-semibold text-depths"
                onClick={() => setModalOpen(false)}
              >
                Anuluj
              </button>
              <button
                type="button"
                className="rounded-full bg-[#000C4A] px-4 py-2 text-sm font-semibold text-lime"
                onClick={addStudent}
              >
                Dodaj
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
