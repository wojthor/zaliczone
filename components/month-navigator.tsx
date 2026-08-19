"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

function addMonthsToKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y!, (m! - 1) + delta, 1, 12, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLongFromKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y!, m! - 1, 15);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

export function useMonthKey(initial?: string): [string, (next: string) => void] {
  const [monthKey, setMonthKey] = useState(initial ?? currentMonthKey());
  return [monthKey, setMonthKey];
}

type MonthNavigatorProps = {
  monthKey: string;
  onMonthKeyChange: (next: string) => void;
  className?: string;
  summary?: ReactNode;
};

export function MonthNavigator({ monthKey, onMonthKeyChange, className, summary }: MonthNavigatorProps) {
  const [displayKey, setDisplayKey] = useState(monthKey);

  useEffect(() => {
    setDisplayKey(monthKey);
  }, [monthKey]);

  const shift = useCallback(
    (delta: number) => {
      const next = addMonthsToKey(displayKey, delta);
      setDisplayKey(next);
      onMonthKeyChange(next);
    },
    [displayKey, onMonthKeyChange],
  );

  const todayKey = currentMonthKey();
  const isCurrentMonth = displayKey === todayKey;
  const arrowBtnClass =
    "landing-navy shrink-0 rounded-full px-3 py-1 text-xs font-bold text-lime hover:opacity-90 touch-manipulation";

  return (
    <div className={`relative z-10 flex w-full min-w-0 max-w-full flex-col gap-1 ${className ?? ""}`}>
      <div className="flex w-full min-w-0 max-w-full items-center gap-1.5">
      <button
        type="button"
        onClick={() => shift(-1)}
        className={arrowBtnClass}
      >
        ←
      </button>
      <div className="landing-navy flex min-w-0 flex-1 items-center justify-center gap-2 rounded-app px-2.5 py-1.5">
        <p className="min-w-0 flex-1 text-center text-xs font-extrabold capitalize tabular-nums text-lime">
          {formatMonthLongFromKey(displayKey)}
        </p>
        {!isCurrentMonth ? (
          <button
            type="button"
            onClick={() => {
              setDisplayKey(todayKey);
              onMonthKeyChange(todayKey);
            }}
            className="shrink-0 rounded-ledger px-2 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wide text-lime/80 hover:bg-white/10 hover:text-lime"
          >
            Dziś
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => shift(1)}
        className={arrowBtnClass}
      >
        →
      </button>
      </div>
      {summary}
    </div>
  );
}
