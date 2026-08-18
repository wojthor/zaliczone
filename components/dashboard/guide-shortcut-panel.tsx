import Link from "next/link";
import { PanelHeader } from "@/components/panel-header";
import { IconGuide } from "@/components/icons";
import { DATES } from "@/lib/dates";

/**
 * Skrót do zakładki „Przewodnik” - ogólne terminy z lib/dates.ts.
 */
export function GuideShortcutPanel() {
  return (
    <section className="soft-panel flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-2.5 text-depths">
      <PanelHeader title="Przewodnik" compact />
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
        <div className="min-w-0">
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.05em] text-muted">
            Ewidencja
          </p>
          <p className="mt-0.5 text-xs font-extrabold text-depths">
            od {DATES.ewidencja.unlockDayOfNextMonth}. dnia · do{" "}
            {DATES.ewidencja.deadlineDayOfNextMonth}. dnia
          </p>
        </div>
        <div className="min-w-0 border-t border-mist pt-1.5">
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.05em] text-muted">
            Wypłata
          </p>
          <p className="mt-0.5 text-xs font-extrabold text-depths">
            do {DATES.payout.deadlineDayOfNextMonth}. dnia miesiąca
          </p>
        </div>
        <Link
          href="/przewodnik"
          className="mt-auto flex items-center justify-center gap-1.5 rounded-full bg-[#000C4A] px-3 py-2 text-[0.7rem] font-extrabold uppercase tracking-wide text-lime transition hover:brightness-110"
        >
          <IconGuide className="h-3.5 w-3.5" />
          Otwórz przewodnik
        </Link>
      </div>
    </section>
  );
}
