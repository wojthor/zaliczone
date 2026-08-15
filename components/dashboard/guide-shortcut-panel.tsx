import Link from "next/link";
import { PanelHeader } from "@/components/panel-header";
import { IconGuide } from "@/components/icons";
import { DATES } from "@/lib/dates";

/**
 * Skrót do zakładki „Przewodnik” — ogólne terminy z lib/dates.ts.
 */
export function GuideShortcutPanel() {
  return (
    <section className="card-feature-alt flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-2.5">
      <PanelHeader title="Przewodnik" compact onDark />
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
        <div className="min-w-0">
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.05em] text-soft-lime/70">
            Ewidencja
          </p>
          <p className="mt-0.5 text-xs font-extrabold text-soft-lime">
            do {DATES.ewidencja.deadlineDayOfNextMonth}. dnia miesiąca
          </p>
        </div>
        <div className="min-w-0 border-t border-white/15 pt-1.5">
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.05em] text-soft-lime/70">
            Wypłata
          </p>
          <p className="mt-0.5 text-xs font-extrabold text-soft-lime">
            do {DATES.payout.deadlineDayOfNextMonth}. dnia miesiąca
          </p>
        </div>
        <Link
          href="/przewodnik"
          className="mt-auto flex items-center justify-center gap-1.5 rounded-full bg-lime px-3 py-2 text-[0.7rem] font-extrabold uppercase tracking-wide text-depths transition hover:brightness-105"
        >
          <IconGuide className="h-3.5 w-3.5" />
          Otwórz przewodnik
        </Link>
      </div>
    </section>
  );
}
