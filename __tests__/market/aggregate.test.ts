import { describe, it, expect } from "vitest";
import {
  minuteStartSecFromTickMs,
  createAggregateState,
  applyTick,
  type AggregateEffect,
} from "@/lib/market/aggregate";
import type { Candle } from "@/lib/market/types";

// Helpers
const MIN1_MS = 60_000; // tick at t=60s → minuteStartSec=60
const MIN2_MS = 120_000;

function updateEffect(e: readonly AggregateEffect[]) {
  const ef = e[0];
  if (ef.type !== "update") throw new Error("expected update effect");
  return ef;
}

function rollEffect(e: readonly AggregateEffect[]) {
  const ef = e[0];
  if (ef.type !== "roll") throw new Error("expected roll effect");
  return ef;
}

// ─── minuteStartSecFromTickMs ────────────────────────────────────────────────

describe("minuteStartSecFromTickMs", () => {
  it("returns 0 for epoch", () => {
    expect(minuteStartSecFromTickMs(0)).toBe(0);
  });

  it("floors to the minute boundary", () => {
    expect(minuteStartSecFromTickMs(59_999)).toBe(0);
    expect(minuteStartSecFromTickMs(60_000)).toBe(60);
    expect(minuteStartSecFromTickMs(90_000)).toBe(60);
    expect(minuteStartSecFromTickMs(119_999)).toBe(60);
    expect(minuteStartSecFromTickMs(120_000)).toBe(120);
  });

  it("handles large timestamps", () => {
    // 2024-01-01 00:00:00 UTC = 1704067200000 ms
    const ts = 1_704_067_200_000;
    expect(minuteStartSecFromTickMs(ts)).toBe(ts / 1000);
  });
});

// ─── createAggregateState ────────────────────────────────────────────────────

describe("createAggregateState", () => {
  it("returns null initial state", () => {
    const state = createAggregateState();
    expect(state.minuteStartSec).toBeNull();
    expect(state.candle).toBeNull();
  });
});

// ─── applyTick ───────────────────────────────────────────────────────────────

describe("applyTick — first tick", () => {
  it("emits an update effect with OHLC all equal to the first price", () => {
    const { effects } = applyTick(createAggregateState(), {
      ts: MIN1_MS,
      price: 100,
    });

    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe("update");

    const { candle }: { candle: Candle } = updateEffect(effects);
    expect(candle).toMatchObject({
      time: 60,
      open: 100,
      high: 100,
      low: 100,
      close: 100,
    });
  });

  it("sets minuteStartSec on state", () => {
    const { state } = applyTick(createAggregateState(), {
      ts: MIN1_MS,
      price: 100,
    });
    expect(state.minuteStartSec).toBe(60);
  });
});

describe("applyTick — same minute updates", () => {
  it("tracks high correctly when price rises", () => {
    let state = createAggregateState();
    ({ state } = applyTick(state, { ts: MIN1_MS, price: 100 }));
    const { effects } = applyTick(state, { ts: MIN1_MS + 1000, price: 110 });

    expect(effects[0].candle.high).toBe(110);
    expect(effects[0].candle.low).toBe(100);
    expect(effects[0].candle.close).toBe(110);
  });

  it("tracks low correctly when price falls", () => {
    let state = createAggregateState();
    ({ state } = applyTick(state, { ts: MIN1_MS, price: 100 }));
    const { effects } = applyTick(state, { ts: MIN1_MS + 1000, price: 90 });

    expect(effects[0].candle.high).toBe(100);
    expect(effects[0].candle.low).toBe(90);
    expect(effects[0].candle.close).toBe(90);
  });

  it("preserves open price across multiple ticks", () => {
    let state = createAggregateState();
    ({ state } = applyTick(state, { ts: MIN1_MS, price: 200 }));
    ({ state } = applyTick(state, { ts: MIN1_MS + 5_000, price: 300 }));
    const { effects } = applyTick(state, { ts: MIN1_MS + 10_000, price: 150 });

    expect(effects[0].candle.open).toBe(200);
  });

  it("high and low accumulate correctly over multiple ticks", () => {
    let state = createAggregateState();
    ({ state } = applyTick(state, { ts: MIN1_MS, price: 100 }));
    ({ state } = applyTick(state, { ts: MIN1_MS + 1_000, price: 150 }));
    ({ state } = applyTick(state, { ts: MIN1_MS + 2_000, price: 80 }));
    const { effects } = applyTick(state, { ts: MIN1_MS + 3_000, price: 120 });

    expect(effects[0].candle).toMatchObject({
      open: 100,
      high: 150,
      low: 80,
      close: 120,
    });
  });

  it("emits update (not roll) for same-minute ticks", () => {
    let state = createAggregateState();
    ({ state } = applyTick(state, { ts: MIN1_MS, price: 100 }));
    const { effects } = applyTick(state, { ts: MIN1_MS + 30_000, price: 105 });
    expect(effects[0].type).toBe("update");
  });
});

describe("applyTick — minute boundary roll", () => {
  it("emits a roll effect when a new minute starts", () => {
    let state = createAggregateState();
    ({ state } = applyTick(state, { ts: MIN1_MS, price: 100 }));
    const { effects } = applyTick(state, { ts: MIN2_MS, price: 200 });

    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe("roll");
  });

  it("completed candle in roll reflects previous minute's OHLC", () => {
    let state = createAggregateState();
    ({ state } = applyTick(state, { ts: MIN1_MS, price: 100 }));
    ({ state } = applyTick(state, { ts: MIN1_MS + 10_000, price: 150 }));
    ({ state } = applyTick(state, { ts: MIN1_MS + 20_000, price: 80 }));
    ({ state } = applyTick(state, { ts: MIN1_MS + 30_000, price: 120 }));

    const { effects } = applyTick(state, { ts: MIN2_MS, price: 200 });
    const { completed } = rollEffect(effects);

    expect(completed).toMatchObject({
      time: 60,
      open: 100,
      high: 150,
      low: 80,
      close: 120,
    });
  });

  it("new candle after roll has OHLC all equal to the trigger tick", () => {
    let state = createAggregateState();
    ({ state } = applyTick(state, { ts: MIN1_MS, price: 100 }));
    const { effects } = applyTick(state, { ts: MIN2_MS, price: 200 });
    const { candle } = rollEffect(effects);

    expect(candle).toMatchObject({
      time: 120,
      open: 200,
      high: 200,
      low: 200,
      close: 200,
    });
  });

  it("updates minuteStartSec to new minute after roll", () => {
    let state = createAggregateState();
    ({ state } = applyTick(state, { ts: MIN1_MS, price: 100 }));
    ({ state } = applyTick(state, { ts: MIN2_MS, price: 200 }));
    expect(state.minuteStartSec).toBe(120);
  });
});
