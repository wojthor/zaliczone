"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconCalendar } from "@/components/icons";
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
  /** @deprecated nieużywane — zostawione dla kompatybilności */
  prevLabel?: string;
  /** @deprecated nieużywane — zostawione dla kompatybilności */
  nextLabel?: string;
  compact?: boolean;
};

export function WeekNavigator({
  weekMondayIso,
  onWeekMondayIsoChange,
  className,
  summary,
  compact = false,
}: WeekNavigatorProps) {
  const [displayIso, setDisplayIso] = useState(weekMondayIso);
  const [pickerValue, setPickerValue] = useState(weekMondayIso);
  const [pickerKey, setPickerKey] = useState(0);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayIso(weekMondayIso);
    setPickerValue(weekMondayIso);
  }, [weekMondayIso]);

  const shift = useCallback(
    (delta: number) => {
      const next = addWeeksToMondayIso(displayIso, delta);
      setDisplayIso(next);
      setPickerValue(next);
      onWeekMondayIsoChange(next);
    },
    [displayIso, onWeekMondayIsoChange],
  );

  const closeDatePicker = useCallback(() => {
    const input = dateInputRef.current;
    if (input) {
      input.blur();
    }
    setPickerKey((k) => k + 1);
  }, []);

  const pickDay = useCallback(
    (isoDate: string) => {
      const next = toMondayIso(new Date(`${isoDate}T12:00:00`));
      setPickerValue(isoDate);
      setDisplayIso(next);
      onWeekMondayIsoChange(next);
      closeDatePicker();
    },
    [onWeekMondayIsoChange, closeDatePicker],
  );

  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        /* fallback below */
      }
    }
    input.click();
  }

  const arrowBtnClass =
    "inline-flex shrink-0 items-center justify-center rounded-full bg-depths font-bold text-lime hover:opacity-90 touch-manipulation " +
    (compact ? "size-7 text-sm" : "size-8 text-base");

  const labelClass = compact
    ? "text-depths text-[0.7rem] font-extrabold tabular-nums tracking-tight whitespace-nowrap"
    : "text-depths text-xs font-extrabold tabular-nums tracking-tight whitespace-nowrap";

  const dateFrameClass = compact
    ? "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-app bg-mist py-1 px-2"
    : "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-app bg-mist py-1.5 px-2.5";

  const todayMondayIso = toMondayIso(new Date());
  const isCurrentWeek = displayIso === todayMondayIso;

  function goToday() {
    setDisplayIso(todayMondayIso);
    setPickerValue(todayMondayIso);
    onWeekMondayIsoChange(todayMondayIso);
  }

  return (
    <div className={`relative z-10 flex w-full min-w-0 max-w-full flex-col gap-1 ${className ?? ""}`}>
      <div className="flex w-full min-w-0 max-w-full items-center gap-1.5">
        <button
          type="button"
          onClick={() => shift(-1)}
          className={arrowBtnClass}
          aria-label="Poprzedni tydzień"
          title="Poprzedni tydzień"
        >
          ←
        </button>
        <div className={dateFrameClass}>
          <p className={labelClass}>{formatWeekRangeFromMondayIso(displayIso)}</p>
          <button
            type="button"
            onClick={openDatePicker}
            className="text-depths/70 hover:text-depths shrink-0 rounded-full p-0.5 transition hover:bg-luster touch-manipulation"
            aria-label="Wybierz tydzień przez konkretny dzień"
            title="Wybierz dzień — ustawimy cały tydzień"
          >
            <IconCalendar className={compact ? "size-3.5" : "size-4"} />
          </button>
          <input
            key={pickerKey}
            ref={dateInputRef}
            type="date"
            value={pickerValue}
            onChange={(e) => {
              if (e.target.value) pickDay(e.target.value);
            }}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
          />
          {!isCurrentWeek ? (
            <button
              type="button"
              onClick={goToday}
              className={
                compact
                  ? "text-depths shrink-0 rounded-ledger px-1.5 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-wide hover:bg-luster"
                  : "text-depths shrink-0 rounded-ledger px-2 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-wide hover:bg-luster"
              }
              title="Wróć do bieżącego tygodnia"
            >
              Dziś
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => shift(1)}
          className={arrowBtnClass}
          aria-label="Następny tydzień"
          title="Następny tydzień"
        >
          →
        </button>
      </div>
      {summary}
    </div>
  );
}
