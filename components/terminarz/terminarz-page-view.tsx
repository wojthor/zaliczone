"use client";

import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { LessonCompletionProvider } from "@/components/dashboard/lesson-completion-context";
import { MonthlyCalendar } from "@/components/dashboard/monthly-calendar";
import { WeeklySchedule } from "@/components/dashboard/weekly-schedule";
import {
  DASHBOARD_LESSONS,
  DAY_LABELS_SHORT,
  dayLabel,
  type Lesson,
} from "@/components/dashboard/lesson-data";

const EMPTY_FORM: Omit<Lesson, "id"> = {
  dayIndex: 0,
  start: "15:00",
  end: "16:00",
  subject: "",
  initials: "",
  classLabel: "",
  studentName: "",
};

function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "";
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase();
  return (p[0]![0] + p[p.length - 1]![0]).toUpperCase();
}

function LessonModal(props: {
  title: string;
  draft: Omit<Lesson, "id">;
  setDraft: Dispatch<SetStateAction<Omit<Lesson, "id">>>;
  onClose: () => void;
  onSave: () => void;
}) {
  const { title, draft, setDraft, onClose, onSave } = props;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-[#000C4A]/50" aria-label="Zamknij" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-app border-2 border-panel-frame bg-snow p-5" role="dialog"
        aria-modal="true"
        aria-labelledby="lesson-modal-title"
      >
        <h2 id="lesson-modal-title" className="text-depths text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1">
            <span className="text-depths/80 text-xs font-semibold">Dzień tygodnia</span>
            <select
              className="text-depths rounded-lg bg-luster px-3 py-2 text-sm"
              value={draft.dayIndex}
              onChange={(e) => setDraft({ ...draft, dayIndex: Number(e.target.value) })}
            >
              {DAY_LABELS_SHORT.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-depths/80 text-xs font-semibold">Od (HH:mm)</span>
              <input
                className="text-depths rounded-lg bg-luster px-3 py-2 text-sm tabular-nums"
                value={draft.start}
                onChange={(e) => setDraft({ ...draft, start: e.target.value })}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-depths/80 text-xs font-semibold">Do (HH:mm)</span>
              <input
                className="text-depths rounded-lg bg-luster px-3 py-2 text-sm tabular-nums"
                value={draft.end}
                onChange={(e) => setDraft({ ...draft, end: e.target.value })}
              />
            </label>
          </div>
          <label className="grid gap-1">
            <span className="text-depths/80 text-xs font-semibold">Przedmiot</span>
            <input
              className="text-depths rounded-lg bg-luster px-3 py-2 text-sm"
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-depths/80 text-xs font-semibold">Uczeń (imię i nazwisko)</span>
            <input
              className="text-depths rounded-lg bg-luster px-3 py-2 text-sm"
              value={draft.studentName}
              onChange={(e) => {
                const studentName = e.target.value;
                setDraft((d) => ({
                  ...d,
                  studentName,
                  initials: d.initials === "" ? initialsFromName(studentName) : d.initials,
                }));
              }}
              onBlur={() =>
                setDraft((d) => ({
                  ...d,
                  initials: d.initials || initialsFromName(d.studentName) || "",
                }))
              }
            />
          </label>
          <label className="grid gap-1">
            <span className="text-depths/80 text-xs font-semibold">Inicjały (np. TK)</span>
            <input
              className="text-depths rounded-lg bg-luster px-3 py-2 text-sm uppercase"
              maxLength={3}
              value={draft.initials}
              onChange={(e) => setDraft({ ...draft, initials: e.target.value.toUpperCase() })}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-depths/80 text-xs font-semibold">Klasa / opis</span>
            <input
              className="text-depths rounded-lg bg-luster px-3 py-2 text-sm"
              value={draft.classLabel}
              onChange={(e) => setDraft({ ...draft, classLabel: e.target.value })}
            />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="text-depths rounded-full bg-luster px-4 py-2 text-sm font-semibold"
            onClick={onClose}
          >
            Anuluj
          </button>
          <button
            type="button"
            className="rounded-full bg-[#000C4A] px-4 py-2 text-sm font-semibold text-lime"
            onClick={onSave}
          >
            Zapisz
          </button>
        </div>
      </div>
    </div>
  );
}

function TerminarzInner() {
  const [lessons, setLessons] = useState<Lesson[]>(() => DASHBOARD_LESSONS.map((l) => ({ ...l })));
  const [modal, setModal] = useState<
    | { type: "closed" }
    | { type: "add" }
    | { type: "edit"; id: string }
  >({ type: "closed" });
  const [draft, setDraft] = useState<Omit<Lesson, "id">>(EMPTY_FORM);

  const sorted = useMemo(
    () => [...lessons].sort((a, b) => a.dayIndex - b.dayIndex || a.start.localeCompare(b.start)),
    [lessons],
  );

  function openAdd() {
    setDraft({ ...EMPTY_FORM });
    setModal({ type: "add" });
  }

  function openEdit(l: Lesson) {
    const { id: _id, ...rest } = l;
    setDraft(rest);
    setModal({ type: "edit", id: l.id });
  }

  function closeModal() {
    setModal({ type: "closed" });
  }

  function saveModal() {
    if (!draft.subject.trim() || !draft.studentName.trim()) {
      return;
    }
    const initials = (draft.initials || initialsFromName(draft.studentName)).slice(0, 3).toUpperCase();
    if (modal.type === "add") {
      const id = `l-${Date.now()}`;
      setLessons((prev) => [...prev, { ...draft, id, initials: initials || "?" }]);
    } else if (modal.type === "edit") {
      const id = modal.id;
      setLessons((prev) =>
        prev.map((x) => (x.id === id ? { ...draft, id, initials: initials || x.initials } : x)),
      );
    }
    closeModal();
  }

  function removeLesson(id: string) {
    if (!confirm("Usunąć tę lekcję z listy?")) return;
    setLessons((prev) => prev.filter((l) => l.id !== id));
  }

  const modalTitle = modal.type === "add" ? "Nowa lekcja" : modal.type === "edit" ? "Edytuj lekcję" : "";

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted text-sm font-medium">
        Tygodniowy widok, kalendarz miesiąca oraz lista lekcji — dodawaj, edytuj i usuwaj wpisy (dane demonstracyjne).
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex min-h-[min(240px,42svh)] flex-col lg:col-span-2 lg:min-h-[min(520px,58vh)]">
          <WeeklySchedule lessons={lessons} hideHeader />
        </div>
        <div className="flex min-h-[min(220px,38svh)] flex-col lg:min-h-[min(340px,50vh)]">
          <MonthlyCalendar lessons={lessons} hideHeader />
        </div>
      </div>

      <section className="rounded-app border-2 border-panel-frame bg-luster/50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-depths text-base font-semibold tracking-tight">Lista lekcji</h2>
          <button
            type="button"
            className="shrink-0 rounded-full bg-[#000C4A] px-4 py-2 text-sm font-semibold text-lime"
            onClick={openAdd}
          >
            + Dodaj lekcję
          </button>
        </div>
        <ul className="mt-4 flex flex-col gap-3">
          {sorted.map((l) => (
            <li
              key={l.id}
              className="text-depths flex flex-col gap-3 rounded-app bg-jodhpur px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {dayLabel(l.dayIndex)} · {l.start}–{l.end}
                </p>
                <p className="text-muted text-sm">
                  {l.subject} · {l.studentName} · {l.classLabel}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className="rounded-full bg-jodhpur px-3 py-1.5 text-xs font-semibold"
                  onClick={() => openEdit(l)}
                >
                  Edytuj
                </button>
                <button
                  type="button"
                  className="text-depths rounded-full bg-snow px-3 py-1.5 text-xs font-semibold"
                  onClick={() => removeLesson(l.id)}
                >
                  Usuń
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {modal.type !== "closed" ? (
        <LessonModal
          title={modalTitle}
          draft={draft}
          setDraft={setDraft}
          onClose={closeModal}
          onSave={saveModal}
        />
      ) : null}
    </div>
  );
}

export function TerminarzPageView() {
  return (
    <LessonCompletionProvider>
      <TerminarzInner />
    </LessonCompletionProvider>
  );
}
