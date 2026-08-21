import { PanelHeader } from "@/components/panel-header";
import { COMPANY } from "@/lib/company";
import { guideDeadlines } from "@/lib/dates";

type StepTone = "lime" | "navy";

function CycleStep({
  tone,
  eyebrow,
  title,
  note,
  pill,
  isLast,
}: {
  tone: StepTone;
  eyebrow: string;
  title: string;
  note: string;
  pill?: { label: string; warn?: boolean };
  isLast?: boolean;
}) {
  return (
    <div className="relative flex min-w-0 gap-3 pb-3 last:pb-0">
      {isLast ? null : (
        <span className="absolute top-3 bottom-0 left-1.25 w-px bg-panel-frame/70" aria-hidden />
      )}
      <span
        className={`relative z-10 mt-1 flex h-2.75 w-2.75 shrink-0 items-center justify-center rounded-full ring-4 ${
          tone === "lime" ? "bg-lime ring-lime/20" : "bg-depths ring-depths/12"
        }`}
        aria-hidden
      />
      <div className="min-w-0 flex-1 pb-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[0.6rem] font-extrabold uppercase leading-tight tracking-[0.06em] text-muted">
            {eyebrow}
          </p>
          {pill ? (
            <span
              className={`shrink-0 rounded-full px-1.5 py-[0.1rem] text-[0.55rem] font-extrabold uppercase tracking-[0.04em] ${
                pill.warn ? "bg-claret/10 text-claret" : "bg-lime/20 text-depths"
              }`}
            >
              {pill.label}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs font-extrabold leading-snug text-depths">{title}</p>
        <p className="text-[0.68rem] leading-snug text-muted">{note}</p>
      </div>
    </div>
  );
}

/**
 * Skrót do zakładki „Przewodnik” - cykl miesięczny jako mini-oś czasu z realnymi datami
 * bieżącego cyklu (guideDeadlines()), bo ewidencja i wypłata naprawdę następują jedna
 * po drugiej co miesiąc - a nie tylko generyczne "do X. dnia" powtarzane bez zmian.
 */
export function GuideShortcutPanel() {
  const { previousMonthLabel, ewidencjaDeadlineLabel, ewidencjaOverdue, payoutAvailableLabel } =
    guideDeadlines();

  return (
    <section className="tutor-panel-surface flex h-full min-h-0 min-w-0 flex-col overflow-hidden px-3 py-2.5 text-depths">
      <PanelHeader title="Przewodnik" compact titleHref="/przewodnik" />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-1">
        <CycleStep
          tone="lime"
          eyebrow="Ewidencja"
          title={`za ${previousMonthLabel}`}
          note={`termin: ${ewidencjaDeadlineLabel}`}
          pill={{ label: ewidencjaOverdue ? "Zaległe" : "Na czas", warn: ewidencjaOverdue }}
        />
        <CycleStep
          tone="navy"
          eyebrow="Wypłata"
          title={`za ${previousMonthLabel}`}
          note={`termin: ${payoutAvailableLabel}`}
          isLast
        />
        <div className="mt-auto border-t border-mist pt-2.5">
          <p className="text-[0.6rem] font-extrabold uppercase leading-tight tracking-[0.06em] text-muted">
            Dane firmy
          </p>
          <p className="mt-0.5 truncate text-xs font-extrabold leading-snug text-depths">
            {COMPANY.name}
          </p>
          <p className="truncate text-[0.68rem] leading-snug text-muted">{COMPANY.address}</p>
        </div>
      </div>
    </section>
  );
}
