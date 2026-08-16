import type { Candle, CandleInterval } from "@/lib/api/candles";
import { parseCandleListResponse } from "@/lib/api/candles";

export type CandleStreamEvent = {
  type: "update" | "roll";
  symbol: string;
  interval: string;
  candle: Candle;
  completed?: Candle | null;
};

export const DEFAULT_CANDLE_WS_URL = "ws://localhost:8080/ws/v1/candles";

export function buildCandleWebSocketUrl(options: {
  baseUrl?: string;
  symbol: string;
  interval: CandleInterval;
}): string {
  const url = new URL(options.baseUrl ?? DEFAULT_CANDLE_WS_URL);
  url.searchParams.set("symbol", options.symbol);
  url.searchParams.set("interval", options.interval);
  return url.toString();
}

export function parseCandleStreamEvent(data: unknown): CandleStreamEvent {
  if (typeof data !== "object" || data === null) {
    throw new Error("Candle stream event must be an object");
  }
  const record = data as Record<string, unknown>;
  if (record.type !== "update" && record.type !== "roll") {
    throw new Error("Candle stream event.type must be update or roll");
  }
  if (typeof record.symbol !== "string" || typeof record.interval !== "string") {
    throw new Error("Candle stream event is missing symbol or interval");
  }
  if (record.type === "roll") {
    if (record.completed == null) {
      throw new Error("Candle stream event.completed is required when type is roll");
    }
    const wrapped = parseCandleListResponse({
      symbol: record.symbol,
      interval: record.interval,
      candles: [record.candle, record.completed],
    });
    const candle = wrapped.candles[0];
    const completed = wrapped.candles[1];
    if (candle === undefined || completed === undefined) {
      throw new Error("Candle stream event.completed is required when type is roll");
    }
    return {
      type: "roll",
      symbol: record.symbol,
      interval: record.interval,
      candle,
      completed,
    };
  }
  const wrapped = parseCandleListResponse({
    symbol: record.symbol,
    interval: record.interval,
    candles: [record.candle],
  });
  const candle = wrapped.candles[0];
  if (candle === undefined) {
    throw new Error("Candle stream event.candle is required");
  }
  return {
    type: "update",
    symbol: record.symbol,
    interval: record.interval,
    candle,
  };
}

export function drainStreamQueue(
  queue: CandleStreamEvent[],
  onEvent: (event: CandleStreamEvent) => void,
): void {
  while (queue.length > 0) {
    const event = queue.shift();
    if (event !== undefined) {
      onEvent(event);
    }
  }
}

export function retainLatestEvent(
  queue: readonly CandleStreamEvent[],
): CandleStreamEvent[] {
  const last = queue[queue.length - 1];
  if (last === undefined) {
    return [];
  }
  return [last];
}

export function boundStreamQueue(
  queue: readonly CandleStreamEvent[],
  flags: { hidden: boolean; paused: boolean },
): CandleStreamEvent[] {
  if (flags.hidden || flags.paused) {
    return retainLatestEvent(queue);
  }
  return [...queue];
}

export function nextReconnectDelayMs(attempt: number): number {
  const safeAttempt = Number.isFinite(attempt) && attempt > 0 ? attempt : 0;
  return Math.min(8_000, 500 * 2 ** Math.min(safeAttempt, 4));
}
