"use client";

import { SUBJECTS } from "@/lib/subjects";

/**
 * Multi-select przedmiotów jako siatka checkboxów-plakietek - zamiast wpisywania
 * nazw przedmiotów po przecinku. Używane w formularzu tworzenia i edycji nauczyciela.
 */
export function SubjectMultiSelect({
  selected,
  onChange,
  className,
}: {
  selected: string[];
  onChange: (subjects: string[]) => void;
  className?: string;
}) {
  function toggle(subject: string) {
    onChange(selected.includes(subject) ? selected.filter((s) => s !== subject) : [...selected, subject]);
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {SUBJECTS.map((subject) => {
        const active = selected.includes(subject);
        return (
          <label
            key={subject}
            className={`dash-sans inline-flex cursor-pointer items-center gap-1.5 rounded-ledger border px-2.5 py-1.5 text-xs font-semibold transition ${
              active
                ? "border-[#000C4A] bg-[#000C4A] text-lime"
                : "border-panel-frame/40 bg-snow text-depths hover:bg-luster/40"
            }`}
          >
            <input type="checkbox" checked={active} onChange={() => toggle(subject)} className="sr-only" />
            {subject}
          </label>
        );
      })}
    </div>
  );
}
