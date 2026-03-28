import { PageShell } from "@/components/page-shell";
import { DEMO_STUDENTS } from "@/lib/demo-data";

export default function UczniowiePage() {
  return (
    <PageShell title="Uczniowie">
      <p className="text-muted mb-6 text-sm font-medium">
        Karty uczniów: kontakt, przedmioty, stawka i bieżące terminy.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {DEMO_STUDENTS.map((s) => (
          <li
            key={s.id}
            className="rounded-app border-2 border-panel-frame/55 bg-snow/95 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#000C4A] text-sm font-bold text-lime">
                {s.initials}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-depths text-lg font-semibold leading-tight">{s.name}</h2>
                <p className="text-muted mt-1 text-sm font-medium">{s.subjectsLine}</p>
                <p className="text-depths/80 mt-2 text-xs font-semibold">{s.classLabel}</p>
              </div>
            </div>
            <dl className="text-depths/90 mt-4 space-y-2 pt-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted font-medium">Telefon</dt>
                <dd className="text-right font-semibold tabular-nums">{s.phone}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted font-medium">E-mail</dt>
                <dd className="min-w-0 truncate text-right font-medium">{s.email}</dd>
              </div>
              <div>
                <dt className="text-muted font-medium">{s.guardian}</dt>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted font-medium">Stawka</dt>
                <dd className="font-bold tabular-nums">{s.ratePerHourPln} zł / h</dd>
              </div>
              <div>
                <dt className="text-muted text-xs font-medium">Następna lekcja</dt>
                <dd className="text-depths mt-0.5 font-semibold">{s.nextLesson}</dd>
              </div>
              <div>
                <dt className="text-muted text-xs font-medium">Notatki</dt>
                <dd className="text-depths/85 mt-0.5 text-xs leading-snug">{s.notes}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
