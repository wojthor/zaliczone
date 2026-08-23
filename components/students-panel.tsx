import { PanelHeader } from "@/components/panel-header";
import type { StudentUi } from "@/lib/types/database";

export function StudentsPanel({ students }: { students: StudentUi[] }) {
  const count = students.length;

  return (
    <section className="tutor-panel-surface flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-3 text-depths">
      <PanelHeader
        title={`Baza uczniów · ${count}`}
        compact
        titleHref="/uczniowie"
      />
      <ul className="flex min-h-0 flex-1 flex-col justify-start gap-0 overflow-hidden">
        {count === 0 ? (
          <li className="text-muted flex flex-1 items-center justify-center text-xs">Brak uczniów w bazie.</li>
        ) : (
          students.slice(0, 4).map((s) => (
            <li
              key={s.id}
              className="flex min-h-13 shrink-0 items-center gap-3 border-b border-panel-frame/50 px-1 py-2 last:border-0"
            >
              <div className="avatar-initials h-10 w-10 shrink-0 text-xs" aria-hidden>
                {s.initials}
              </div>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-0.5">
                <p className="text-depths text-sm font-extrabold leading-tight tracking-tight">{s.name}</p>
                {s.blocked ? (
                  <p className="text-[0.6rem] font-extrabold uppercase tracking-wide text-[#E23B3B]">Zablokowany</p>
                ) : null}
                <p className="text-muted text-xs font-medium leading-snug">{s.subjectsLine}</p>
                <p className="text-steel text-[0.6875rem] font-medium leading-snug">{s.nextLesson}</p>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
