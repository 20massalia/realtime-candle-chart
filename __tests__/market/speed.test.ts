import { describe, expect, it } from "vitest";
import { intervalMsForSpeed, SPEED_PRESETS } from "@/lib/market/speed";

describe("SPEED_PRESETS", () => {
  it("contains expected UI presets", () => {
    expect(SPEED_PRESETS).toEqual([0.5, 1, 2, 5]);
  });
});

describe("intervalMsForSpeed", () => {
  it("keeps base interval at 1x", () => {
    expect(intervalMsForSpeed(300, 1)).toBe(300);
  });

  it("slows down at 0.5x and speeds up at 2x/5x", () => {
    expect(intervalMsForSpeed(300, 0.5)).toBe(600);
    expect(intervalMsForSpeed(300, 2)).toBe(150);
    expect(intervalMsForSpeed(300, 5)).toBe(60);
  });

  it("falls back to 1x for invalid multipliers", () => {
    expect(intervalMsForSpeed(300, 0)).toBe(300);
    expect(intervalMsForSpeed(300, -1)).toBe(300);
    expect(intervalMsForSpeed(300, Number.NaN)).toBe(300);
  });
});
