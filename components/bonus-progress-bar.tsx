"use client";

import { bonusProgress } from "@/lib/dates";

export function BonusProgressBar({
  hoursDone,
  compact = false,
  minimal = false,
  showCelebration = false,
  className = "",
}: {
  hoursDone: number;
  compact?: boolean;
  /** Jedna wąska linia: X/Y + pasek (do kafelka listy). */
  minimal?: boolean;
  showCelebration?: boolean;
  className?: string;
}) {
  const p = bonusProgress(hoursDone);
  const pct = Math.round(p.ratio * 100);
  const doneLabel = Number.isInteger(p.done) ? String(p.done) : p.done.toFixed(1);

  if (minimal) {
    return (
      <div
        className={`min-w-[7.5rem] max-w-sm ${className}`}
        title={`Premia: ${doneLabel}/${p.threshold} godz. (zatwierdzone)`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className={`section-label ${p.achieved ? "" : "!text-muted"}`}>Premia</span>
          <span className="text-xs font-extrabold tabular-nums text-depths">
            {doneLabel}/{p.threshold}h
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-ledger bg-mist">
          <div
            className={`h-full rounded-ledger transition-all ${p.achieved ? "bg-lime" : "bg-depths"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-app ${
        p.achieved ? "card-feature px-2.5 text-lime" : "bg-snow text-depths"
      } ${compact ? "p-2.5" : "p-3.5"}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={`font-extrabold ${compact ? "text-xs" : "text-sm"}`}>
          {p.achieved ? "Premia osiągnięta!" : "Premia miesięczna"}
        </p>
        <p
          className={`font-bold tabular-nums ${compact ? "text-[0.65rem]" : "text-xs"} ${
            p.achieved ? "text-lime" : "text-muted"
          }`}
        >
          {doneLabel} / {p.threshold} godz. ·{" "}
          <span className={p.achieved ? "mark-highlight-on-dark" : undefined}>+{p.bonusPln} zł</span>
        </p>
      </div>
      <div className={`mt-2 h-2.5 overflow-hidden rounded-ledger ${p.achieved ? "bg-white/20" : "bg-mist"}`}>
        <div
          className={`h-full rounded-ledger transition-all ${p.achieved ? "bg-lime" : "bg-depths"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!p.achieved ? (
        <p className={`mt-1.5 ${compact ? "text-[0.6rem]" : "text-xs"} text-muted`}>
          Do premii zostało <strong>{p.remaining}</strong> zatwierdzonych godzin.
        </p>
      ) : showCelebration ? (
        <p className="mt-1.5 text-xs text-lime/90">Dodatek {p.bonusPln} zł trafia do Twojej wypłaty.</p>
      ) : null}
    </div>
  );
}
