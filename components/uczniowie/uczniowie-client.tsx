"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { Spinner, useToast } from "@/components/ui/toast";
import { insertStudent, updateStudent, deleteStudent } from "@/lib/actions/students";
import { AlertsBanner } from "@/components/alerts/alerts-banner";
import { LessonStatusBadge } from "@/components/lesson/lesson-status-badge";
import type { Lesson } from "@/components/dashboard/lesson-data";
import type { AppAlert, StudentUi } from "@/lib/types/database";
import type { PriceTier } from "@/lib/types/messages";
import { levelsAllowedForSubjects, subjectsFromOfferings } from "@/lib/tutor-offerings";

function formatLessonDatePl(dateIso: string | undefined): string {
  if (!dateIso) return "Bez daty";
  const d = new Date(`${dateIso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "Bez daty";
  return new Intl.DateTimeFormat("pl-PL", { weekday: "short", day: "numeric", month: "long" }).format(d);
}

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
  alerts = [],
  lessons = [],
}: {
  initialStudents: StudentUi[];
  activeSubjects: string[];
  priceTiers: PriceTier[];
  alerts?: AppAlert[];
  lessons?: Lesson[];
}) {
  const router = useRouter();
  const toast = useToast();
  const cennik = useMemo(() => tiersToCennik(priceTiers), [priceTiers]);
  const subjectOptions = useMemo(() => subjectsFromOfferings(activeSubjects), [activeSubjects]);
  const [items, setItems] = useState<StudentUi[]>(initialStudents);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<NewStudentDraft>(() => emptyDraft());
  const [saving, setSaving] = useState(false);
  const [lessonsModalStudent, setLessonsModalStudent] = useState<StudentUi | null>(null);

  const lessonsByStudent = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    for (const lesson of lessons) {
      if (!lesson.studentId) continue;
      const list = map.get(lesson.studentId);
      if (list) list.push(lesson);
      else map.set(lesson.studentId, [lesson]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || b.start.localeCompare(a.start));
    }
    return map;
  }, [lessons]);

  const lessonsModalItems = lessonsModalStudent
    ? (lessonsByStudent.get(lessonsModalStudent.id) ?? [])
    : [];

  const allowedLevels = useMemo(() => {
    const allowed = new Set(
      levelsAllowedForSubjects(activeSubjects, draft.selectedSubjects ?? []),
    );
    return cennik.map((row) => row.label).filter((label) => allowed.has(label));
  }, [activeSubjects, cennik, draft.selectedSubjects]);

  useEffect(() => {
    if (draft.classLabel && !allowedLevels.includes(draft.classLabel)) {
      setDraft((prev) => ({ ...prev, classLabel: "" }));
    }
  }, [allowedLevels, draft.classLabel]);

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
      phone: student.phone === "-" ? "" : student.phone,
      email: student.email === "-" ? "" : student.email,
      nextLesson: student.nextLesson,
      notes: student.notes === "-" ? "" : student.notes,
    });
    setModalOpen(true);
  }

  /** Deep-link z globalnego wyszukiwania (?student=<id>) - otwiera edycję konkretnego ucznia. */
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("student");
    if (!id) return;
    const found = items.find((s) => s.id === id);
    if (found) openEdit(found);
    router.replace("/uczniowie", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveStudent() {
    if (!draft.name.trim() || !draft.classLabel || draft.selectedSubjects.length === 0 || saving) return;
    setSaving(true);
    try {
      const ratePln =
        cennik.find((row) => row.label === draft.classLabel)?.forClientPln ?? 0;
      const payload = {
        name: draft.name.trim(),
        subjects: draft.selectedSubjects,
        classLevel: draft.classLabel,
        ratePln,
        schoolClass: draft.schoolClass,
        phone: draft.phone,
        email: draft.email,
        notes: draft.notes,
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
                  schoolClass: draft.schoolClass.trim() || "-",
                  phone: draft.phone.trim() || "-",
                  email: draft.email.trim() || "-",
                  notes: draft.notes.trim() || "-",
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
            phone: draft.phone.trim() || "-",
            email: draft.email.trim() || "-",
            guardian: "Rodzic / opiekun",
            classLabel: row.class_level,
            schoolClass: draft.schoolClass.trim() || "-",
            notes: draft.notes.trim() || "-",
            ratePerHourPln: Number(row.rate_pln),
            nextLesson: draft.nextLesson.trim() || "Brak zaplanowanej lekcji",
            createdAtTs: Date.now(),
            blocked: false,
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
    if (!confirm(`Na pewno usunąć ${name}? Razem z nim znikną też jego lekcje.`)) return;
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
      {alerts.length > 0 ? (
        <div className="mb-4">
          <AlertsBanner alerts={alerts} role="TUTOR" />
        </div>
      ) : null}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <p className="text-muted max-w-2xl text-sm font-medium">
          Karty uczniów z poziomem, klasą, przedmiotami, stawką i możliwością dodawania nowych rekordów.
        </p>
        <button
          type="button"
          onClick={openAdd}
          className="landing-navy rounded-full px-4 py-2 text-sm font-semibold text-lime"
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
              {subjectOptions.map((subject) => (
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
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((student) => (
            <li
              key={student.id}
              className={`tutor-panel-surface flex aspect-square min-h-0 flex-col justify-between gap-2 overflow-hidden p-3 ${
                student.blocked
                  ? "ring-2 ring-[#E23B3B]/50"
                  : "ring-1 ring-depths/8"
              }`}
            >
              <div className="flex min-h-0 items-start gap-2.5">
                <span className="avatar-initials h-11 w-11 shrink-0 text-sm">
                  {student.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-depths line-clamp-2 text-[0.95rem] font-extrabold leading-snug tracking-tight">
                    {student.name}
                  </h2>
                  {student.blocked ? (
                    <p className="mt-0.5 text-[0.6rem] font-extrabold uppercase tracking-wide text-[#E23B3B]">
                      Zablokowany
                    </p>
                  ) : null}
                  <p className="text-muted mt-1 text-xs font-semibold leading-snug">
                    {student.classLabel} · {student.schoolClass}
                  </p>
                </div>
              </div>

              <p className="flex flex-wrap gap-1">
                {student.subjectsLine ? (
                  student.subjectsLine.split(",").map((subject) => (
                    <span
                      key={subject}
                      className="rounded-full bg-lime px-2 py-0.5 text-[0.6rem] font-semibold text-depths"
                    >
                      {subject.trim()}
                    </span>
                  ))
                ) : (
                  <span className="text-muted text-xs">Brak przedmiotów</span>
                )}
              </p>

              <dl className="grid flex-1 content-evenly gap-1 text-xs">
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted shrink-0">Lekcja</dt>
                  <dd className="min-w-0 text-right font-semibold leading-snug text-depths">
                    {student.nextLesson}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted shrink-0">Tel.</dt>
                  <dd className="text-right font-semibold tabular-nums text-depths">{student.phone}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted shrink-0">E-mail</dt>
                  <dd className="min-w-0 truncate text-right font-medium text-depths">{student.email}</dd>
                </div>
                {student.notes && student.notes !== "-" ? (
                  <div className="flex items-start justify-between gap-2">
                    <dt className="text-muted shrink-0">Notatki</dt>
                    <dd className="min-w-0 line-clamp-3 text-right font-medium leading-snug text-depths">
                      {student.notes}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <div className="shrink-0">
                {student.blocked ? (
                  <button
                    type="button"
                    onClick={() => removeStudent(student.id, student.name)}
                    className="rounded-full border border-[#E23B3B]/35 bg-[#E23B3B]/8 px-3 py-1.5 text-xs font-semibold text-[#B42318] transition hover:bg-[#E23B3B]/12"
                  >
                    Usuń
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(student)}
                      className="landing-navy rounded-full px-3 py-1.5 text-xs font-semibold text-lime"
                    >
                      Edytuj
                    </button>
                    <button
                      type="button"
                      onClick={() => setLessonsModalStudent(student)}
                      className="rounded-full border border-panel-frame/45 bg-snow px-3 py-1.5 text-xs font-semibold text-depths transition hover:bg-mist"
                    >
                      Lekcje
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStudent(student.id, student.name)}
                      className="rounded-full border border-depths/14 bg-depths/8 px-3 py-1.5 text-xs font-semibold text-depths/72 transition hover:bg-depths/12 hover:text-depths"
                    >
                      Usuń
                    </button>
                  </div>
                )}
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
          <div className="confirm-dialog-in relative z-10 flex max-h-[min(92dvh,40rem)] w-full max-w-[min(42rem,100%)] flex-col overflow-hidden rounded-t-app bg-snow sm:max-w-[min(42rem,94vw)] sm:rounded-app">
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
                {subjectOptions.length === 0 ? (
                  <p className="text-muted rounded-app bg-luster/60 px-3 py-2 text-sm">
                    Brak aktywnych przedmiotów - poproś o dodanie w Profilu
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {subjectOptions.map((subject) => {
                      const active = (draft.selectedSubjects ?? []).includes(subject);
                      return (
                        <button
                          key={subject}
                          type="button"
                          onClick={() => toggleSubject(subject)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            active ? "landing-navy text-lime" : "bg-luster text-depths"
                          }`}
                        >
                          {subject}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <label className="grid gap-1">
                <span className="text-depths/80 text-xs font-semibold">Poziom</span>
                <select
                  className="text-depths rounded-app bg-luster px-3 py-2 text-sm"
                  value={draft.classLabel}
                  onChange={(e) => setDraft((prev) => ({ ...prev, classLabel: e.target.value }))}
                  disabled={(draft.selectedSubjects ?? []).length === 0}
                >
                  <option value="">
                    {(draft.selectedSubjects ?? []).length === 0
                      ? "Najpierw wybierz przedmiot"
                      : allowedLevels.length === 0
                        ? "Brak uprawnień do poziomu"
                        : "Wybierz"}
                  </option>
                  {allowedLevels.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

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
                className="landing-navy inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-lime disabled:opacity-60 touch-manipulation"
                onClick={saveStudent}
                disabled={saving || subjectOptions.length === 0}
              >
                {saving ? <Spinner /> : null}
                {saving ? "Zapisywanie…" : editId ? "Zapisz" : "Dodaj"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {lessonsModalStudent ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[#000C4A]/50"
            aria-label="Zamknij"
            onClick={() => setLessonsModalStudent(null)}
          />
          <div className="confirm-dialog-in relative z-10 flex max-h-[min(92dvh,40rem)] w-full max-w-[min(38rem,100%)] flex-col overflow-hidden rounded-t-app bg-snow sm:max-w-[min(38rem,94vw)] sm:rounded-app">
            <span className="mx-auto mt-2 mb-1 block h-1 w-10 shrink-0 rounded-full bg-panel-frame/40 sm:hidden" />
            <div className="shrink-0 px-5 pt-3 sm:px-6 sm:pt-6">
              <h2 className="text-depths text-lg font-semibold tracking-tight">
                Lekcje - {lessonsModalStudent.name}
              </h2>
              <p className="text-muted mt-0.5 text-xs font-semibold">
                {lessonsModalItems.length}{" "}
                {lessonsModalItems.length === 1 ? "lekcja" : "lekcji"} w historii
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
              {lessonsModalItems.length === 0 ? (
                <p className="text-muted py-6 text-center text-sm">
                  Brak zapisanych lekcji z tym uczniem.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {lessonsModalItems.map((lesson) => (
                    <li
                      key={lesson.id}
                      className="soft-panel flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-depths">{lesson.subject}</p>
                        <p className="text-muted text-xs">
                          {formatLessonDatePl(lesson.date)} · {lesson.start}–{lesson.end}
                        </p>
                      </div>
                      <LessonStatusBadge status={lesson.status} isCompleted={lesson.isCompleted} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex shrink-0 justify-end border-t border-panel-frame/30 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-5">
              <button
                type="button"
                className="rounded-full bg-luster px-4 py-2.5 text-sm font-semibold text-depths touch-manipulation"
                onClick={() => setLessonsModalStudent(null)}
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
