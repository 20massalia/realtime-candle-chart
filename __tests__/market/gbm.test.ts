import { describe, it, expect } from "vitest";
import { createGbmState, stepGbm } from "@/lib/market/gbm";

const ZERO_DRIFT = { mu: 0, sigma: 0 } as const;
const TYPICAL = { mu: 0, sigma: 0.1 } as const;

// ─── createGbmState ──────────────────────────────────────────────────────────

describe("createGbmState", () => {
  it("stores the initial price exactly", () => {
    expect(createGbmState(1000).price).toBe(1000);
    expect(createGbmState(0.001).price).toBe(0.001);
  });

  it("uses the Samsung Electronics mock baseline (₩75,000) as a realistic positive mid price", () => {
    const s = createGbmState(75_000);
    expect(s.price).toBe(75_000);
    expect(Number.isFinite(s.price)).toBe(true);
    expect(s.price).toBeGreaterThan(1000);
  });
});

// ─── stepGbm ─────────────────────────────────────────────────────────────────

describe("stepGbm — output shape", () => {
  it("returns a tick with the exact timestamp passed in", () => {
    const { tick } = stepGbm(createGbmState(100), 99_999, 1, TYPICAL);
    expect(tick.ts).toBe(99_999);
  });

  it("state.price equals tick.price after the step", () => {
    const { state, tick } = stepGbm(createGbmState(100), 0, 1, TYPICAL);
    expect(state.price).toBe(tick.price);
  });
});

describe("stepGbm — price constraints", () => {
  it("price is always strictly positive over many steps", () => {
    let state = createGbmState(100);
    for (let i = 0; i < 500; i++) {
      const result = stepGbm(state, i * 1_000, 1, TYPICAL);
      expect(result.tick.price).toBeGreaterThan(0);
      state = result.state;
    }
  });

  it("price remains positive starting from a very small initial price", () => {
    let state = createGbmState(1e-6);
    for (let i = 0; i < 100; i++) {
      const result = stepGbm(state, i * 1_000, 1, TYPICAL);
      expect(result.tick.price).toBeGreaterThan(0);
      state = result.state;
    }
  });
});

describe("stepGbm — deterministic cases (sigma = 0)", () => {
  it("zero mu and zero sigma: price stays constant", () => {
    const { tick } = stepGbm(createGbmState(100), 0, 1, ZERO_DRIFT);
    // drift = (0 - 0.5*0*0)*1 = 0, diffusion = 0 → exp(0) = 1
    expect(tick.price).toBeCloseTo(100, 10);
  });

  it("positive mu with zero sigma: price grows by e^(mu*dt)", () => {
    const mu = 1;
    const dt = 2;
    const { tick } = stepGbm(createGbmState(100), 0, dt, { mu, sigma: 0 });
    // drift = (1 - 0) * 2 = 2 → price = 100 * e^2
    expect(tick.price).toBeCloseTo(100 * Math.exp(mu * dt), 8);
  });

  it("negative mu with zero sigma: price decays deterministically", () => {
    const mu = -0.5;
    const dt = 1;
    const { tick } = stepGbm(createGbmState(200), 0, dt, { mu, sigma: 0 });
    expect(tick.price).toBeCloseTo(200 * Math.exp(mu * dt), 8);
  });
});

describe("stepGbm — dt edge cases", () => {
  it("does not throw with dtSeconds = 0 (clamped to 1e-9)", () => {
    expect(() => stepGbm(createGbmState(100), 0, 0, TYPICAL)).not.toThrow();
  });

  it("does not throw with negative dtSeconds (also clamped)", () => {
    expect(() => stepGbm(createGbmState(100), 0, -5, TYPICAL)).not.toThrow();
  });

  it("price remains positive even with clamped near-zero dt", () => {
    const { tick } = stepGbm(createGbmState(100), 0, 0, TYPICAL);
    expect(tick.price).toBeGreaterThan(0);
  });
});
