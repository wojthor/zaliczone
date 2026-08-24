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
        title={
          p.maxed
            ? `Premia maksymalna: ${p.bonusPln} zł (${doneLabel} h)`
            : `Premia: ${doneLabel}/${p.threshold} godz. · cel +${p.segmentBonusPln} zł`
        }
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className={`section-label ${p.achieved ? "" : "!text-muted"}`}>Premia</span>
          <span className="text-xs font-extrabold tabular-nums text-depths">
            {doneLabel}/{p.threshold}h
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mist">
          <div
            className={`h-full rounded-full transition-all ${p.maxed ? "bg-lime" : "landing-navy"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  const title = p.maxed
    ? "Premia maksymalna!"
    : p.achieved
      ? "Kolejny próg premii"
      : "Premia miesięczna";

  return (
    <div className={`card-feature px-3 text-lime ${compact ? "p-3" : "p-4"} ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={`font-extrabold ${compact ? "text-xs" : "text-sm"}`}>{title}</p>
        <p className={`font-bold tabular-nums text-lime/80 ${compact ? "text-[0.65rem]" : "text-xs"}`}>
          {doneLabel} / {p.threshold} godz. ·{" "}
          <span>{p.maxed ? `łącznie ${p.bonusPln} zł` : `+${p.segmentBonusPln} zł`}</span>
        </p>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-lime transition-all" style={{ width: `${pct}%` }} />
      </div>
      {p.maxed ? (
        showCelebration ? (
          <p className="mt-1.5 text-xs text-lime/90">
            Łącznie {p.bonusPln} zł premii trafia do Twojej wypłaty.
          </p>
        ) : null
      ) : !p.achieved ? (
        <p className={`mt-1.5 text-lime/80 ${compact ? "text-[0.6rem]" : "text-xs"}`}>
          Do premii zostało <strong className="text-lime">{p.remaining}</strong> zatwierdzonych godzin.
        </p>
      ) : (
        <p className={`mt-1.5 text-lime/80 ${compact ? "text-[0.6rem]" : "text-xs"}`}>
          Masz już <strong className="text-lime">{p.bonusPln} zł</strong>
          {" · "}
          do kolejnej premii zostało <strong className="text-lime">{p.remaining}</strong> h.
        </p>
      )}
    </div>
  );
}
