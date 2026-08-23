"use client";

import { useMemo, useState } from "react";
import { SUBJECTS } from "@/lib/subjects";
import {
  formatTutorOffering,
  parseTutorOfferings,
  type TutorOffering,
} from "@/lib/tutor-offerings";

/**
 * Wybór uprawnień nauczyciela: najpierw przedmiot, potem poziom z cennika.
 * Wynik to lista napisów „Przedmiot · Poziom” (profiles.active_subjects).
 */
export function SubjectLevelMultiSelect({
  selected,
  levels,
  onChange,
  className,
}: {
  selected: string[];
  /** Etykiety poziomów z price_tiers (kolejność z cennika). */
  levels: string[];
  onChange: (offerings: string[]) => void;
  className?: string;
}) {
  const [subject, setSubject] = useState<string>(SUBJECTS[0] ?? "");
  const [level, setLevel] = useState<string>(levels[0] ?? "");

  const offerings = useMemo(() => parseTutorOfferings(selected), [selected]);

  const canAdd = Boolean(subject && level) && !offerings.some((o) => o.subject === subject && o.level === level);

  function add() {
    if (!canAdd) return;
    onChange([...selected.filter(Boolean), formatTutorOffering(subject, level)]);
  }

  function remove(o: TutorOffering) {
    const key = formatTutorOffering(o.subject, o.level);
    onChange(selected.filter((item) => item !== key && !(o.level === "" && item === o.subject)));
  }

  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <label className="grid gap-1">
          <span className="dash-sans text-[0.65rem] font-bold uppercase tracking-wide text-muted">
            Przedmiot
          </span>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="dash-sans rounded-app border border-panel-frame/40 bg-snow px-3 py-2 text-sm font-semibold text-depths"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="dash-sans text-[0.65rem] font-bold uppercase tracking-wide text-muted">
            Poziom (cennik)
          </span>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            disabled={levels.length === 0}
            className="dash-sans rounded-app border border-panel-frame/40 bg-snow px-3 py-2 text-sm font-semibold text-depths disabled:opacity-50"
          >
            {levels.length === 0 ? (
              <option value="">Brak poziomów w cenniku</option>
            ) : (
              levels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))
            )}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={add}
            disabled={!canAdd}
            className="dash-sans w-full rounded-full border border-[#000C4A] bg-[#000C4A] px-4 py-2 text-xs font-bold text-lime disabled:opacity-40 sm:w-auto"
          >
            + Dodaj
          </button>
        </div>
      </div>

      {offerings.length === 0 ? (
        <p className="dash-sans text-muted text-xs">
          Dodaj przynajmniej jedną parę przedmiot + poziom. Nauczyciel będzie mógł ustawiać
          uczniom tylko te poziomy.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {offerings.map((o) => {
            const label = o.level ? formatTutorOffering(o.subject, o.level) : o.subject;
            return (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => remove(o)}
                  title="Usuń"
                  className="dash-sans inline-flex items-center gap-1.5 rounded-ledger border border-[#000C4A] bg-[#000C4A] px-2.5 py-1.5 text-xs font-semibold text-lime"
                >
                  {label}
                  <span aria-hidden className="opacity-70">
                    ×
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
