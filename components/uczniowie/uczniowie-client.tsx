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
            {activeSubjects.map((subject) => (
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
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => openEdit(student)}
                className="rounded-full border border-panel-frame/50 px-3 py-1 text-xs font-bold text-depths"
              >
                Edytuj
              </button>
              <button
                type="button"
                onClick={() => removeStudent(student.id, student.name)}
                className="rounded-full border border-red-300 px-3 py-1 text-xs font-bold text-red-700"
              >
                Usuń
              </button>
            </div>
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
            <h2 className="text-depths text-lg font-semibold tracking-tight">
              {editId ? "Edytuj ucznia" : "Dodaj ucznia"}
            </h2>
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
                className="inline-flex items-center gap-2 rounded-full bg-[#000C4A] px-4 py-2 text-sm font-semibold text-lime disabled:opacity-60"
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
