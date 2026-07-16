"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  addWeeksToMondayIso,
  formatWeekRangeFromMondayIso,
  toMondayIso,
} from "@/lib/date/week-utils";

export function useWeekMondayIso(initialOffsetWeeks = 0): [string, (next: string) => void] {
  const [weekMondayIso, setWeekMondayIso] = useState(() =>
    addWeeksToMondayIso(toMondayIso(new Date()), initialOffsetWeeks),
  );
  return [weekMondayIso, setWeekMondayIso];
}

type WeekNavigatorProps = {
  weekMondayIso: string;
  onWeekMondayIsoChange: (next: string) => void;
  className?: string;
  summary?: ReactNode;
  prevLabel?: string;
  nextLabel?: string;
  compact?: boolean;
};

export function WeekNavigator({
  weekMondayIso,
  onWeekMondayIsoChange,
  className,
  summary,
  prevLabel = "← Poprzedni tydzień",
  nextLabel = "Następny tydzień →",
  compact = false,
}: WeekNavigatorProps) {
  const [displayIso, setDisplayIso] = useState(weekMondayIso);

  useEffect(() => {
    setDisplayIso(weekMondayIso);
  }, [weekMondayIso]);

  const shift = useCallback(
    (delta: number) => {
      const next = addWeeksToMondayIso(displayIso, delta);
      setDisplayIso(next);
      onWeekMondayIsoChange(next);
    },
    [displayIso, onWeekMondayIsoChange],
  );

  const btnClass = compact
    ? "rounded-full border border-panel-frame/40 bg-white px-2.5 py-1 text-[0.65rem] font-bold text-depths hover:bg-jodhpur touch-manipulation"
    : "rounded-full border border-panel-frame/40 bg-white px-3 py-1 text-xs font-bold text-depths hover:bg-luster touch-manipulation";

  const labelClass = compact
    ? "text-depths text-center text-[0.7rem] font-semibold tabular-nums"
    : "text-depths text-center text-xs font-semibold tabular-nums";

  return (
    <div
      className={`relative z-10 flex flex-wrap items-center justify-between gap-2 rounded-app border border-panel-frame/30 bg-jodhpur/30 px-3 py-2.5 ${className ?? ""}`}
    >
      <button type="button" onClick={() => shift(-1)} className={btnClass}>
        {compact ? "← Poprzedni" : prevLabel}
      </button>
      <div className="min-w-[8rem] flex-1 text-center">
        <p className={labelClass}>{formatWeekRangeFromMondayIso(displayIso)}</p>
        {summary}
      </div>
      <button type="button" onClick={() => shift(1)} className={btnClass}>
        {compact ? "Następny →" : nextLabel}
      </button>
    </div>
  );
}
