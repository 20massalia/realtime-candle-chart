/**
 * Tick: wall-clock sample from the mock feed. `ts` is Unix milliseconds.
 */
export type Tick = {
  ts: number;
  price: number;
};

/**
 * One-minute OHLC. `time` is the bar's open time as Unix seconds (Lightweight Charts UTCTimestamp).
 */
export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type GbmState = {
  price: number;
};

export type AggregateState = {
  minuteStartSec: number | null;
  candle: Candle | null;
};
