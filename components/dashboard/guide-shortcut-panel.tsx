import { PanelHeader } from "@/components/panel-header";
import { COMPANY } from "@/lib/company";
import { DATES } from "@/lib/dates";

type StepTone = "lime" | "navy";

function CycleStep({
  tone,
  eyebrow,
  title,
  isLast,
}: {
  tone: StepTone;
  eyebrow: string;
  title: string;
  isLast?: boolean;
}) {
  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 gap-3">
      {isLast ? null : (
        <span className="absolute top-4 bottom-0 left-[0.4375rem] w-px bg-panel-frame/70" aria-hidden />
      )}
      <span
        className={`relative z-10 mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ring-4 ${
          tone === "lime" ? "bg-lime ring-lime/20" : "bg-depths ring-depths/12"
        }`}
        aria-hidden
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center py-1">
        <p className="text-[0.65rem] font-extrabold uppercase leading-tight tracking-[0.08em] text-muted">
          {eyebrow}
        </p>
        <p className="mt-1 text-[0.95rem] font-extrabold leading-snug tracking-tight text-depths">
          {title}
        </p>
      </div>
    </div>
  );
}

/**
 * Skrót do zakładki „Przewodnik” - stałe terminy cyklu (bez statusu zaległości).
 */
export function GuideShortcutPanel() {
  return (
    <section className="tutor-panel-surface flex h-full min-h-0 min-w-0 flex-col overflow-hidden px-3 py-2.5 text-depths">
      <PanelHeader title="Przewodnik" compact titleHref="/przewodnik" />
      <div className="flex min-h-0 flex-1 flex-col px-1">
        <div className="flex min-h-0 flex-1 flex-col justify-evenly py-1">
          <CycleStep
            tone="lime"
            eyebrow="Ewidencja"
            title={`do ${DATES.ewidencja.deadlineDayOfNextMonth}. dnia miesiąca`}
          />
          <CycleStep
            tone="navy"
            eyebrow="Wypłata"
            title={`do ${DATES.payout.deadlineDayOfNextMonth}. dnia miesiąca`}
            isLast
          />
        </div>
        <div className="mt-2 shrink-0 border-t border-mist pt-2">
          <p className="text-[0.6rem] font-extrabold uppercase leading-tight tracking-[0.06em] text-muted">
            Dane firmy
          </p>
          <p className="mt-0.5 truncate text-xs font-extrabold leading-snug text-depths">
            {COMPANY.name}
          </p>
          <p className="truncate text-[0.68rem] leading-snug text-muted">{COMPANY.address}</p>
          <dl className="mt-1.5 space-y-1.5">
            <div>
              <dt className="text-[0.55rem] font-extrabold uppercase tracking-[0.08em] text-muted">
                Telefon (BLIK)
              </dt>
              <dd className="mt-0.5 font-mono text-sm font-extrabold tracking-wide text-depths">
                {COMPANY.phone}
              </dd>
            </div>
            <div>
              <dt className="text-[0.55rem] font-extrabold uppercase tracking-[0.08em] text-muted">
                Numer konta
              </dt>
              <dd className="mt-0.5 font-mono text-[0.78rem] font-extrabold leading-snug tracking-wide text-depths">
                {COMPANY.bankAccount}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
