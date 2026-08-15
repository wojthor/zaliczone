"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { Spinner, useToast } from "@/components/ui/toast";
import { insertStudent, updateStudent, deleteStudent } from "@/lib/data/mutations";
import type { StudentUi } from "@/lib/types/database";
import type { PriceTier } from "@/lib/types/messages";

type SortMode = "newest" | "oldest" | "az" | "za";

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

type CennikRow = {
  label: string;
  forClientPln: number;
  yourSharePln: number;
};

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

function tiersToCennik(priceTiers: PriceTier[]): CennikRow[] {
  return priceTiers.map((tier) => ({
    label: tier.label,
    forClientPln: Number(tier.client_rate_pln),
    yourSharePln: Number(tier.worker_rate_pln),
  }));
}

export function UczniowieClient({
  initialStudents,
  activeSubjects,
  priceTiers,
}: {
  initialStudents: StudentUi[];
  activeSubjects: string[];
  priceTiers: PriceTier[];
}) {
  const router = useRouter();
  const toast = useToast();
  const cennik = useMemo(() => tiersToCennik(priceTiers), [priceTiers]);
  const [items, setItems] = useState<StudentUi[]>(initialStudents);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NewStudentDraft>(() => emptyDraft());
  const [saving, setSaving] = useState(false);

  const draftRate = useMemo(
    () => cennik.find((row) => row.label === draft.classLabel)?.forClientPln ?? null,
    [cennik, draft.classLabel],
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

  function openAdd() {
    setEditId(null);
    setDraft(emptyDraft());
    setModalOpen(true);
  }

  function openEdit(student: StudentUi) {
    setEditId(student.id);
    setDraft({
      name: student.name,
      selectedSubjects: student.subjectsLine.split(",").map((s) => s.trim()).filter(Boolean),
      classLabel: student.classLabel,
      schoolClass: student.schoolClass,
      phone: student.phone === "—" ? "" : student.phone,
      email: student.email === "—" ? "" : student.email,
      nextLesson: student.nextLesson,
      notes: student.notes === "—" ? "" : student.notes,
    });
    setModalOpen(true);
  }

  async function saveStudent() {
    if (!draft.name.trim() || !draft.classLabel || draft.selectedSubjects.length === 0 || saving) return;
    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        subjects: draft.selectedSubjects,
        classLevel: draft.classLabel,
        ratePln: draftRate ?? 0,
      };
      if (editId) {
        await updateStudent(editId, payload);
        setItems((prev) =>
          prev.map((s) =>
            s.id === editId
              ? {
                  ...s,
                  name: payload.name,
                  subjectsLine: payload.subjects.join(", "),
                  classLabel: payload.classLevel,
                  ratePerHourPln: payload.ratePln,
                }
              : s,
          ),
        );
        toast.success("Zapisano ucznia", payload.name);
      } else {
        const row = await insertStudent(payload);
        setItems((prev) => [
          {
            id: row.id,
            name: row.name,
            initials: row.name.trim().split(/\s+/).map((p: string) => p[0]).join("").slice(0, 2).toUpperCase(),
            subjectsLine: row.subjects.join(", "),
            phone: draft.phone.trim() || "—",
            email: draft.email.trim() || "—",
            guardian: "Rodzic / opiekun",
            classLabel: row.class_level,
            schoolClass: draft.schoolClass.trim() || "—",
            notes: draft.notes.trim() || "—",
            ratePerHourPln: Number(row.rate_pln),
            nextLesson: draft.nextLesson.trim() || "Brak zaplanowanej lekcji",
            createdAtTs: Date.now(),
          },
          ...prev,
        ]);
        toast.success("Dodano ucznia", row.name);
      }
      setDraft(emptyDraft());
      setEditId(null);
      setModalOpen(false);
      router.refresh();
    } catch {
      toast.error("Nie udało się zapisać ucznia");
    } finally {
      setSaving(false);
    }
  }

  async function removeStudent(id: string, name: string) {
    if (!confirm(`Usunąć ucznia ${name}? Powiązane lekcje również zostaną usunięte.`)) return;
    try {
      await deleteStudent(id);
      setItems((prev) => prev.filter((s) => s.id !== id));
      toast.success("Usunięto ucznia", name);
      router.refresh();
    } catch {
      toast.error("Nie udało się usunąć ucznia");
    }
  }

  return (
    <PageShell title="Uczniowie">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <p className="text-muted max-w-2xl text-sm font-medium">
          Karty uczniów z poziomem, klasą, przedmiotami, stawką i możliwością dodawania nowych rekordów.
        </p>
        <button
          type="button"
          onClick={openAdd}
          className="rounded-full bg-[#000C4A] px-4 py-2 text-sm font-semibold text-lime"
        >
          + Dodaj ucznia
        </button>
      </div>

      <section className="mb-5 soft-panel p-4">
        <p className="section-label mb-3">Filtry</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-muted text-xs font-semibold">Sortowanie</span>
            <select
              className="text-depths rounded-full border border-panel-frame/50 bg-snow px-4 py-2 text-sm font-medium"
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
            <span className="text-muted text-xs font-semibold">Filtr przedmiotu</span>
            <select
              className="text-depths rounded-full border border-panel-frame/50 bg-snow px-4 py-2 text-sm font-medium"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
            >
              <option value="">Wszystkie</option>
              {activeSubjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <p className="section-label">Lista uczniów</p>
          <span className="text-muted text-xs font-semibold tabular-nums">{filtered.length}</span>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {filtered.map((student) => (
            <li
              key={student.id}
              className="soft-panel p-4"
            >
              <div className="flex items-start gap-3">
                <span className="avatar-initials h-12 w-12 shrink-0 text-sm">
                  {student.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-depths text-lg font-extrabold leading-tight tracking-tight">
                    {student.name}
                  </h2>
                  <p className="mt-1.5 flex flex-wrap gap-1.5">
                    {student.subjectsLine ? (
                      student.subjectsLine.split(",").map((subject) => (
                        <span
                          key={subject}
                          className="rounded-full bg-lime px-2.5 py-0.5 text-[0.65rem] font-semibold text-depths"
                        >
                          {subject.trim()}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted text-sm">Brak przedmiotów</span>
                    )}
                  </p>
                  <p className="text-muted mt-2 text-xs font-semibold">
                    {student.classLabel} · {student.schoolClass}
                  </p>
                </div>
              </div>

              <dl className="mt-4 space-y-2 border-t border-panel-frame/50 pt-3 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted font-medium">Telefon</dt>
                  <dd className="text-right font-semibold tabular-nums text-depths">{student.phone}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted font-medium">E-mail</dt>
                  <dd className="min-w-0 truncate text-right font-medium text-depths">{student.email}</dd>
                </div>
                <div>
                  <dt className="text-muted font-medium">{student.guardian}</dt>
                </div>
              </dl>

              <dl className="mt-3 space-y-2 border-t border-panel-frame/50 pt-3 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted font-medium">Stawka</dt>
                  <dd className="font-extrabold tabular-nums text-depths">
                    {student.ratePerHourPln} zł / h
                  </dd>
                </div>
                <div>
                  <dt className="section-label !text-muted mb-0.5">Następna lekcja</dt>
                  <dd className="text-depths font-semibold">{student.nextLesson}</dd>
                </div>
                <div>
                  <dt className="section-label !text-muted mb-0.5">Notatki</dt>
                  <dd className="text-muted text-xs leading-snug">{student.notes}</dd>
                </div>
              </dl>

              <div className="mt-4 flex gap-2 border-t border-panel-frame/50 pt-3">
                <button
                  type="button"
                  onClick={() => openEdit(student)}
                  className="rounded-full bg-[#000C4A] px-3.5 py-1.5 text-xs font-semibold text-lime"
                >
                  Edytuj
                </button>
                <button
                  type="button"
                  onClick={() => removeStudent(student.id, student.name)}
                  className="rounded-full border border-panel-frame/50 bg-snow px-3.5 py-1.5 text-xs font-semibold text-steel"
                >
                  Usuń
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[#000C4A]/50"
            aria-label="Zamknij"
            onClick={() => setModalOpen(false)}
          />
          <div className="confirm-dialog-in relative z-10 flex max-h-[min(92dvh,40rem)] w-full max-w-[min(42rem,100%)] flex-col overflow-hidden rounded-t-app bg-snow shadow-2xl sm:max-w-[min(42rem,94vw)] sm:rounded-app">
            <span className="mx-auto mt-2 mb-1 block h-1 w-10 shrink-0 rounded-full bg-panel-frame/40 sm:hidden" />
            <div className="shrink-0 px-5 pt-3 sm:px-6 sm:pt-6">
              <h2 className="text-depths text-lg font-semibold tracking-tight">
                {editId ? "Edytuj ucznia" : "Dodaj ucznia"}
              </h2>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
            <div className="grid gap-3">
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
                {activeSubjects.length === 0 ? (
                  <p className="text-muted rounded-app bg-luster/60 px-3 py-2 text-sm">
                    Brak aktywnych przedmiotów — poproś o dodanie w Profilu
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {activeSubjects.map((subject) => {
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
                )}
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
                    {cennik.map((row) => (
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
                  <span className="text-depths/80 text-xs font-semibold">Następna lekcja (notatka)</span>
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
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-panel-frame/30 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-5">
              <button
                type="button"
                className="rounded-full bg-luster px-4 py-2.5 text-sm font-semibold text-depths touch-manipulation"
                onClick={() => setModalOpen(false)}
              >
                Anuluj
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-[#000C4A] px-4 py-2.5 text-sm font-semibold text-lime disabled:opacity-60 touch-manipulation"
                onClick={saveStudent}
                disabled={saving || activeSubjects.length === 0}
              >
                {saving ? <Spinner /> : null}
                {saving ? "Zapisywanie…" : editId ? "Zapisz" : "Dodaj"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
