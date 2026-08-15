import { describe, expect, it } from "vitest";
import { obliczZaliczkePIT, obliczSkladkeZdrowotna, obliczLimitNDG, obliczLimitVAT } from "./podatki";
import { NDG_QUARTERLY_LIMIT, SKLADKA_ZDROWOTNA_MINIMUM, VAT_ANNUAL_LIMIT } from "./podatki-config";

describe("obliczZaliczkePIT", () => {
  /**
   * Dochody: 2000, 8000, 4000
   * M0: max(0, 2000*0.12 − 300*1) = 0 → zaliczka 0
   * M1: max(0, 10000*0.12 − 300*2) = 600 → zaliczka 600 − 0 = 600
   * M2: max(0, 14000*0.12 − 300*3) = 780 → zaliczka 780 − 600 = 180
   */
  const dochody = [2000, 8000, 4000];

  it("zwraca 0 w pierwszym miesiącu gdy dochód poniżej progu po kwocie zmniejszającej", () => {
    expect(obliczZaliczkePIT(dochody, 0)).toBe(0);
  });

  it("w kolejnym miesiącu liczy różnicę względem już zapłaconej zaliczki, nie cały podatek narastający", () => {
    expect(obliczZaliczkePIT(dochody, 1)).toBe(600);
    expect(obliczZaliczkePIT(dochody, 2)).toBe(180);
  });

  it("suma zaliczek równa się podatkowi narastająco na koniec okresu", () => {
    const z0 = obliczZaliczkePIT(dochody, 0);
    const z1 = obliczZaliczkePIT(dochody, 1);
    const z2 = obliczZaliczkePIT(dochody, 2);
    expect(z0 + z1 + z2).toBe(780);
  });

  it("zwraca 0 dla nieprawidłowego indeksu", () => {
    expect(obliczZaliczkePIT(dochody, -1)).toBe(0);
    expect(obliczZaliczkePIT(dochody, 99)).toBe(0);
  });
});

describe("obliczSkladkeZdrowotna", () => {
  it("nie schodzi poniżej minimum ustawowego", () => {
    expect(obliczSkladkeZdrowotna(1000)).toBe(SKLADKA_ZDROWOTNA_MINIMUM);
  });

  it("bierze 9% gdy powyżej minimum", () => {
    expect(obliczSkladkeZdrowotna(10_000)).toBe(900);
  });
});

describe("obliczLimitNDG / VAT", () => {
  it("liczy procent limitu NDG", () => {
    const r = obliczLimitNDG([5000, 5000]);
    expect(r.suma).toBe(10_000);
    expect(r.przekroczono).toBe(false);
    expect(r.procent).toBeCloseTo((10_000 / NDG_QUARTERLY_LIMIT) * 100, 1);
  });

  it("oznacza przekroczenie VAT", () => {
    const r = obliczLimitVAT([VAT_ANNUAL_LIMIT + 1]);
    expect(r.przekroczono).toBe(true);
  });
});
