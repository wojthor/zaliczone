import { PanelHeader } from "@/components/panel-header";
import { SeeMoreLink } from "@/components/see-more-link";
import type { StudentUi } from "@/lib/types/database";

export function StudentsPanel({ students }: { students: StudentUi[] }) {
  const count = students.length;

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-app bg-snow p-2.5">
      <PanelHeader
        title={`Baza uczniów · ${count}`}
        compact
        action={<SeeMoreLink href="/uczniowie" compact />}
      />
      <ul className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
        {count === 0 ? (
          <li className="text-muted flex flex-1 items-center justify-center text-xs">Brak uczniów w bazie.</li>
        ) : (
          students.slice(0, 4).map((s) => (
            <li
              key={s.id}
              className="flex min-h-13 flex-1 basis-0 items-center gap-3 border-b-2 border-paper px-1 py-2 last:border-0"
            >
              <div className="avatar-initials h-10 w-10 shrink-0 text-xs" aria-hidden>
                {s.initials}
              </div>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-0.5">
                <p className="text-depths text-sm font-extrabold leading-tight tracking-tight">{s.name}</p>
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
