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
    // Remount natywnego pickera — wymusza zamknięcie kalendarzyka po wyborze dnia
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

  const arrowBtnClass = compact
    ? "inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-panel-frame/40 bg-white text-sm font-bold text-depths hover:bg-jodhpur touch-manipulation"
    : "inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-panel-frame/40 bg-white text-base font-bold text-depths hover:bg-luster touch-manipulation";

  const labelClass = compact
    ? "text-depths text-center text-[0.7rem] font-semibold tabular-nums"
    : "text-depths text-center text-xs font-semibold tabular-nums";

  const dateFrameClass = compact
    ? "flex items-center gap-1 rounded-app border border-panel-frame/40 bg-white py-1 pl-2 pr-1"
    : "flex items-center gap-1 rounded-app border border-panel-frame/40 bg-white py-1.5 pl-2.5 pr-1.5";

  return (
    <div className={`relative z-10 flex flex-col items-center gap-1 px-1 py-1 ${className ?? ""}`}>
      <div className="flex items-center gap-1">
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
            className="text-depths/70 hover:text-depths rounded-full p-1 transition hover:bg-luster touch-manipulation"
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
