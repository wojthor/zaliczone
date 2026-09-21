import { describe, expect, it } from "vitest";
import { DATES, bonusProgress, isEwidencjaPdfAvailable, maxBonusPln } from "./dates";

function canShowGenerateButton(hasVerifiedLessons: boolean, monthKey: string, today: Date) {
  return hasVerifiedLessons && isEwidencjaPdfAvailable(monthKey, today);
}

describe("bonusProgress", () => {
  it("liczy progi 50 / 60 / 70 h i łącznie do 300 zł", () => {
    expect(maxBonusPln()).toBe(300);
    expect(bonusProgress(0)).toMatchObject({
      threshold: 50,
      bonusPln: 0,
      achieved: false,
      maxed: false,
      ratio: 0,
    });
    expect(bonusProgress(25)).toMatchObject({
      threshold: 50,
      remaining: 25,
      bonusPln: 0,
      ratio: 0.5,
    });
    expect(bonusProgress(50)).toMatchObject({
      threshold: 60,
      bonusPln: 100,
      achieved: true,
      ratio: 0,
      remaining: 10,
    });
    expect(bonusProgress(55)).toMatchObject({
      threshold: 60,
      bonusPln: 100,
      ratio: 0.5,
      remaining: 5,
    });
    expect(bonusProgress(60)).toMatchObject({
      threshold: 70,
      bonusPln: 200,
      ratio: 0,
    });
    expect(bonusProgress(70)).toMatchObject({
      threshold: 70,
      bonusPln: 300,
      maxed: true,
      ratio: 1,
    });
    expect(bonusProgress(82).bonusPln).toBe(300);
  });

  it("ma trzy progi po 100 zł w konfiguracji", () => {
    expect(DATES.bonus.tiers).toEqual([
      { hoursThreshold: 50, bonusPln: 100 },
      { hoursThreshold: 60, bonusPln: 100 },
      { hoursThreshold: 70, bonusPln: 100 },
    ]);
  });
});

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
