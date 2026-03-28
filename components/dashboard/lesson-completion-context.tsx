"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

/** Klucz ISO lokalnej daty: `YYYY-MM-DD` */
export function dateKeyFromYMD(year: number, month0: number, day: number): string {
  const mm = String(month0 + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function storageKey(dateKey: string, lessonId: string): string {
  return `${dateKey}#${lessonId}`;
}

/** Poniedziałek tygodnia zawierającego `ref` (lokalny kalendarz, południe — mniej problemów ze strefą). */
export function mondayOfWeekContaining(ref: Date): Date {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const d = ref.getDate();
  const noon = new Date(y, m, d, 12, 0, 0, 0);
  const offset = (noon.getDay() + 6) % 7;
  noon.setDate(noon.getDate() - offset);
  return noon;
}

type LessonCompletionContextValue = {
  isLessonDoneOnDate: (lessonId: string, dateKey: string) => boolean;
  setLessonDoneOnDate: (lessonId: string, dateKey: string, value: boolean) => void;
};

const LessonCompletionContext = createContext<LessonCompletionContextValue | null>(null);

export function LessonCompletionProvider({ children }: { children: ReactNode }) {
  const [done, setDone] = useState<Record<string, boolean>>({});

  const isLessonDoneOnDate = useCallback(
    (lessonId: string, dateKey: string) => !!done[storageKey(dateKey, lessonId)],
    [done],
  );

  const setLessonDoneOnDate = useCallback((lessonId: string, dateKey: string, value: boolean) => {
    const k = storageKey(dateKey, lessonId);
    setDone((prev) => ({ ...prev, [k]: value }));
  }, []);

  const value = useMemo(
    () => ({ isLessonDoneOnDate, setLessonDoneOnDate }),
    [isLessonDoneOnDate, setLessonDoneOnDate],
  );

  return <LessonCompletionContext.Provider value={value}>{children}</LessonCompletionContext.Provider>;
}

export function useLessonCompletion(): LessonCompletionContextValue {
  const ctx = useContext(LessonCompletionContext);
  if (!ctx) {
    throw new Error("useLessonCompletion must be used within LessonCompletionProvider");
  }
  return ctx;
}
