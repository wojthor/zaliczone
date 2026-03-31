"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AddTutorModal } from "@/components/admin/add-tutor-modal";
import { ADMIN_TUTORS, type AdminTutor, type AdminTutorStatus } from "@/lib/admin-demo";

const STATUS_OPTIONS: { id: AdminTutorStatus; label: string }[] = [
  { id: "aktywny", label: "Aktywny" },
  { id: "wstrzymany", label: "Wstrzymany" },
  { id: "zablokowany", label: "Zablokowany" },
  { id: "zakonczony", label: "Zakończony" },
];

export default function AdminTutorsPage() {
  const [tutors, setTutors] = useState<AdminTutor[]>(() => [...ADMIN_TUTORS]);
  const [statusByTutor, setStatusByTutor] = useState<Record<string, AdminTutorStatus>>({});
  const [addOpen, setAddOpen] = useState(false);

  const takenEmails = useMemo(() => tutors.map((t) => t.email), [tutors]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-depths text-2xl font-semibold tracking-tight">Nauczyciele</h1>
          <p className="text-muted mt-1 text-sm">Lista zespołu z szybkim podglądem i zmianą statusu.</p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="shrink-0 rounded-full bg-[#000C4A] px-4 py-2 text-xs font-bold text-lime"
        >
          Dodaj nauczyciela
        </button>
      </div>

      <AddTutorModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        takenEmails={takenEmails}
        onAdded={(t) => setTutors((prev) => [t, ...prev])}
      />

      <ul className="space-y-2">
        {tutors.map((t) => (
          <li key={t.id} className="rounded-app border border-panel-frame/35 bg-snow p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-depths text-sm font-bold">{t.name}</p>
                <p className="text-muted text-xs">{t.phone} · {t.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={statusByTutor[t.id] ?? t.status}
                  onChange={(e) => setStatusByTutor((prev) => ({ ...prev, [t.id]: e.target.value as AdminTutorStatus }))}
                  className="rounded-full border border-panel-frame/35 bg-white px-2.5 py-1 text-xs font-semibold text-depths"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Link href={`/admin/nauczyciele/${t.id}`} className="rounded-full bg-[#000C4A] px-3 py-1 text-xs font-bold text-lime">
                  Szczegóły
                </Link>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {t.subjects.map((s) => (
                <span key={s} className="rounded-full border border-panel-frame/40 bg-luster px-2 py-0.5 text-[0.65rem] font-semibold text-depths">
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-2 grid gap-2 text-xs text-depths/85 sm:grid-cols-4">
              <p>
                <span className="text-muted">Godziny: </span>
                <span className="font-bold">{t.lessonsDoneMonth}</span>
              </p>
              <p>
                <span className="text-muted">Studenci: </span>
                <span className="font-bold">{t.students}</span>
              </p>
              <p>
                <span className="text-muted">Opłacone: </span>
                <span className="font-bold text-green-700">{t.paidPln} zł</span>
              </p>
              <p>
                <span className="text-muted">Oczekujące: </span>
                <span className="font-bold text-aster">{t.pendingPln} zł</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
