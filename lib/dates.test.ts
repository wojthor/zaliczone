import { describe, expect, it } from "vitest";
import { DATES, isEwidencjaPdfAvailable } from "./dates";

function canShowGenerateButton(hasVerifiedLessons: boolean, monthKey: string, today: Date) {
  return hasVerifiedLessons && isEwidencjaPdfAvailable(monthKey, today);
}

describe("isEwidencjaPdfAvailable", () => {
  it("blokuje ewidencję za bieżący miesiąc w ostatnim dniu tego miesiąca", () => {
    expect(isEwidencjaPdfAvailable("2026-06", new Date(2026, 5, 30, 18, 0, 0))).toBe(false);
  });

  it("odblokowuje ewidencję za poprzedni miesiąc od 1. dnia kolejnego", () => {
    const unlock = new Date(2026, 6, DATES.ewidencja.unlockDayOfNextMonth, 0, 0, 0);
    expect(isEwidencjaPdfAvailable("2026-06", unlock)).toBe(true);
  });

  it("zostaje dostępna później w kolejnym miesiącu", () => {
    expect(isEwidencjaPdfAvailable("2026-06", new Date(2026, 6, 15))).toBe(true);
  });

  it("bez zatwierdzonych lekcji przycisk zostaje wyłączony niezależnie od daty", () => {
    expect(canShowGenerateButton(false, "2026-06", new Date(2026, 6, 1))).toBe(false);
    expect(canShowGenerateButton(true, "2026-06", new Date(2026, 6, 1))).toBe(true);
  });
});
