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

  return (
    <div
      className={`relative z-10 flex flex-wrap items-center justify-between gap-2 rounded-app border border-panel-frame/25 bg-snow px-3 py-2 ${className ?? ""}`}
    >
      <button
        type="button"
        onClick={() => shift(-1)}
        className="rounded-full border border-panel-frame/40 px-3 py-1 text-xs font-bold text-depths hover:bg-luster touch-manipulation"
      >
        ← Poprzedni miesiąc
      </button>
      <div className="min-w-[8rem] flex-1 text-center">
        <p className="text-depths text-xs font-semibold capitalize tabular-nums">
          {formatMonthLongFromKey(displayKey)}
        </p>
        {summary}
      </div>
      <button
        type="button"
        onClick={() => shift(1)}
        className="rounded-full border border-panel-frame/40 px-3 py-1 text-xs font-bold text-depths hover:bg-luster touch-manipulation"
      >
        Następny miesiąc →
      </button>
    </div>
  );
}
