import { describe, expect, it } from "vitest";
import { hasThreeUnpaidInARow } from "./unpaid-streak";

function lesson(status: "UNPAID" | "VERIFIED" | "PLANNED" | "PENDING_VERIFICATION", date: string, start = "10:00") {
  return { status, date, start_time: start };
}

describe("hasThreeUnpaidInARow", () => {
  it("jest prawdziwe gdy ostatnie 3 rozliczone lekcje to UNPAID", () => {
    expect(
      hasThreeUnpaidInARow([
        lesson("VERIFIED", "2026-03-01"),
        lesson("UNPAID", "2026-03-08"),
        lesson("UNPAID", "2026-03-15"),
        lesson("UNPAID", "2026-03-22"),
      ]),
    ).toBe(true);
  });

  it("ignoruje zaplanowane i oczekujące - liczą się tylko UNPAID i VERIFIED", () => {
    expect(
      hasThreeUnpaidInARow([
        lesson("UNPAID", "2026-03-01"),
        lesson("PLANNED", "2026-03-08"),
        lesson("UNPAID", "2026-03-15"),
        lesson("PENDING_VERIFICATION", "2026-03-18"),
        lesson("UNPAID", "2026-03-22"),
      ]),
    ).toBe(true);
  });

  it("jest fałszywe gdy w ostatnich trzech rozliczonych jest VERIFIED", () => {
    expect(
      hasThreeUnpaidInARow([
        lesson("UNPAID", "2026-03-01"),
        lesson("UNPAID", "2026-03-08"),
        lesson("VERIFIED", "2026-03-15"),
      ]),
    ).toBe(false);
  });

  it("jest fałszywe gdy jest mniej niż 3 rozliczone lekcje", () => {
    expect(hasThreeUnpaidInARow([lesson("UNPAID", "2026-03-01"), lesson("UNPAID", "2026-03-08")])).toBe(false);
  });

  it("bierze ostatnie trzy według daty i godziny, nie kolejności w tablicy", () => {
    expect(
      hasThreeUnpaidInARow([
        lesson("UNPAID", "2026-03-22", "12:00"),
        lesson("UNPAID", "2026-03-22", "09:00"),
        lesson("VERIFIED", "2026-03-01"),
        lesson("UNPAID", "2026-03-15"),
      ]),
    ).toBe(true);
  });
});
