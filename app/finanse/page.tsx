import { PageShell } from "@/components/page-shell";
import { DEMO_FINANCE_LINES, DEMO_STUDENTS } from "@/lib/demo-data";

export default function FinansePage() {
  const total = DEMO_FINANCE_LINES.reduce((s, l) => s + l.amountPln, 0);
  const hoursMonth = 42;
  const studentsCount = DEMO_STUDENTS.length;

  return (
    <PageShell title="Finanse">
      <p className="text-muted mb-6 text-sm font-medium">
        Podsumowanie przychodów z lekcji, historia wpływów oraz skrót godzin i liczby uczniów.
      </p>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-app border-2 border-panel-frame bg-[#000C4A] p-4 text-luster">
          <p className="text-luster/75 text-xs font-semibold uppercase tracking-wide">Ten miesiąc</p>
          <p className="text-lime mt-1 text-2xl font-black tabular-nums">{total} zł</p>
          <p className="text-luster/65 mt-1 text-xs">z ostatnich {DEMO_FINANCE_LINES.length} lekcji (demo)</p>
        </div>
        <div className="rounded-app border-2 border-panel-frame bg-jodhpur p-4">
          <p className="text-muted text-xs font-semibold uppercase tracking-wide">Godziny</p>
          <p className="text-depths mt-1 text-2xl font-bold tabular-nums">{hoursMonth}</p>
          <p className="text-depths/70 mt-1 text-xs font-medium">w tym miesiącu (jak w panelu)</p>
        </div>
        <div className="rounded-app border-2 border-panel-frame bg-snow p-4">
          <p className="text-muted text-xs font-semibold uppercase tracking-wide">Uczniowie</p>
          <p className="text-depths mt-1 text-2xl font-bold tabular-nums">{studentsCount}</p>
          <p className="text-depths/70 mt-1 text-xs font-medium">aktywnych w bazie</p>
        </div>
      </div>

      <section className="rounded-app border-2 border-panel-frame bg-luster/60 p-4">
        <h2 className="text-depths text-base font-semibold tracking-tight">Saldo za lekcje</h2>
        <p className="text-muted mt-1 text-xs font-medium">Ostatnie wpływy (dane przykładowe)</p>
        <ul className="mt-4 flex flex-col gap-2 sm:rounded-app sm:border-2 sm:border-panel-frame sm:bg-snow/90 sm:py-2">
          {DEMO_FINANCE_LINES.map((line) => (
            <li
              key={line.id}
              className="text-depths flex flex-col gap-2 rounded-app border border-panel-frame/50 bg-jodhpur px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-1 sm:rounded-none sm:border-0 sm:border-b sm:border-panel-frame/40 sm:bg-transparent sm:px-3 sm:py-2 sm:last:border-b-0"
            >
              <div>
                <p className="font-semibold">{line.studentName}</p>
                <p className="text-muted text-sm">
                  {line.label} · {line.date}
                </p>
              </div>
              <p className="shrink-0 rounded-lg bg-[#000C4A] px-3 py-1.5 text-base font-bold tabular-nums text-lime sm:text-right">
                +{line.amountPln} zł
              </p>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
