import Link from "next/link";
import { PanelHeader } from "@/components/panel-header";
import { IconGuide } from "@/components/icons";
import { guideDeadlines } from "@/lib/dates";

/**
 * Skrót do zakładki „Przewodnik” — zajmuje miejsce po usuniętym module powiadomień in-app
 * (cała komunikacja idzie teraz przez e-mail). Pokazuje same terminy „do kiedy”, nie tylko
 * link — najważniejsze daty widać bez wchodzenia w przewodnik.
 */
export function GuideShortcutPanel() {
  const { previousMonthLabel, ewidencjaDeadlineLabel, ewidencjaOverdue, payoutAvailableLabel } =
    guideDeadlines();

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-app border-2 border-panel-frame bg-jodhpur p-2.5">
      <PanelHeader title="Przewodnik" compact />
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden rounded-app bg-snow/95 p-2.5">
        <div className="min-w-0">
          <p className="text-muted text-[0.62rem] font-semibold uppercase tracking-wide">
            Ewidencja za {previousMonthLabel}
          </p>
          <p className={`mt-0.5 text-xs font-bold ${ewidencjaOverdue ? "text-claret" : "text-depths"}`}>
            do {ewidencjaDeadlineLabel}
          </p>
        </div>
        <div className="min-w-0 border-t border-panel-frame/20 pt-1.5">
          <p className="text-muted text-[0.62rem] font-semibold uppercase tracking-wide">
            Wypłata za {previousMonthLabel}
          </p>
          <p className="text-depths mt-0.5 text-xs font-bold">od {payoutAvailableLabel}</p>
        </div>
        <Link
          href="/przewodnik"
          className="mt-auto flex items-center justify-center gap-1.5 rounded-full bg-[#000C4A] px-3 py-1.5 text-[0.7rem] font-bold text-lime transition hover:opacity-90"
        >
          <IconGuide className="h-3.5 w-3.5" />
          Otwórz przewodnik
        </Link>
      </div>
    </section>
  );
}
