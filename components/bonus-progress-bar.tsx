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
          <span
            className={`text-[10px] font-bold uppercase tracking-wide ${
              p.achieved ? "text-green-800" : "text-muted"
            }`}
          >
            Premia
          </span>
          <span
            className={`text-xs font-semibold tabular-nums ${
              p.achieved ? "text-green-800" : "text-depths"
            }`}
          >
            {doneLabel}/{p.threshold}h
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-luster">
          <div
            className={`h-full rounded-full transition-all ${p.achieved ? "bg-green-700" : "bg-[#000C4A]"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-app border-2 ${
        p.achieved ? "border-lime bg-[#000C4A] text-lime" : "border-panel-frame/40 bg-snow text-depths"
      } ${compact ? "p-2.5" : "p-3.5"}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={`font-bold ${compact ? "text-xs" : "text-sm"}`}>
          {p.achieved ? "🎉 Premia osiągnięta!" : "Premia miesięczna"}
        </p>
        <p
          className={`font-semibold tabular-nums ${compact ? "text-[0.65rem]" : "text-xs"} ${
            p.achieved ? "text-lime" : "text-muted"
          }`}
        >
          {doneLabel} / {p.threshold} godz. · +{p.bonusPln} zł
        </p>
      </div>
      <div className={`mt-2 h-2.5 overflow-hidden rounded-full ${p.achieved ? "bg-white/20" : "bg-luster"}`}>
        <div
          className={`h-full rounded-full transition-all ${p.achieved ? "bg-lime" : "bg-[#000C4A]"}`}
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
