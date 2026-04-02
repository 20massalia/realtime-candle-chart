import type { AggregateState, Candle, Tick } from "./types";

export type AggregateEffect =
  | { type: "update"; candle: Candle }
  | { type: "roll"; completed: Candle; candle: Candle };

/** Minute open time in Unix seconds from tick milliseconds. */
export function minuteStartSecFromTickMs(tsMs: number): number {
  return Math.floor(tsMs / 60_000) * 60;
}

export function createAggregateState(): AggregateState {
  return { minuteStartSec: null, candle: null };
}

/**
 * Applies one tick to running 1m OHLC. Emits chart effects (update current bar or roll to new minute).
 */
export function applyTick(
  state: AggregateState,
  tick: Tick,
): { state: AggregateState; effects: readonly AggregateEffect[] } {
  const m = minuteStartSecFromTickMs(tick.ts);

  if (state.minuteStartSec === null || state.candle === null) {
    const candle: Candle = {
      time: m,
      open: tick.price,
      high: tick.price,
      low: tick.price,
      close: tick.price,
    };
    return {
      state: { minuteStartSec: m, candle },
      effects: [{ type: "update", candle }],
    };
  }

  if (m === state.minuteStartSec) {
    const candle: Candle = {
      time: m,
      open: state.candle.open,
      high: Math.max(state.candle.high, tick.price),
      low: Math.min(state.candle.low, tick.price),
      close: tick.price,
    };
    return {
      state: { minuteStartSec: m, candle },
      effects: [{ type: "update", candle }],
    };
  }

  const completed = state.candle;
  const candle: Candle = {
    time: m,
    open: tick.price,
    high: tick.price,
    low: tick.price,
    close: tick.price,
  };
  return {
    state: { minuteStartSec: m, candle },
    effects: [{ type: "roll", completed, candle }],
  };
}
