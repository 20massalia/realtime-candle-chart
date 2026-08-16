import {
  DEFAULT_CANDLE_SYMBOL,
  parseCandleIngestResponse,
  parseErrorResponse,
  BackendError,
  type Candle as ApiCandle,
  type CandleIngestRequest,
} from "@/lib/api/candles";
import type { AggregateEffect } from "@/lib/market/aggregate";
import type { Candle as MarketCandle } from "@/lib/market/types";

export const FALLBACK_GBM_PRICE = 75_000;
export const CHART_SYMBOL = DEFAULT_CANDLE_SYMBOL;
export const CHART_INTERVAL = "1m" as const;

export function toChartCandles(candles: readonly ApiCandle[]): MarketCandle[] {
  return candles.map((bar) => ({
    time: Math.floor(Date.parse(bar.bucketStart) / 1000),
    open: Number(bar.open),
    high: Number(bar.high),
    low: Number(bar.low),
    close: Number(bar.close),
  }));
}

export function gbmStartPrice(history: readonly MarketCandle[]): number {
  const last = history[history.length - 1];
  return last === undefined ? FALLBACK_GBM_PRICE : last.close;
}

export function persistableCompleted(effect: AggregateEffect): MarketCandle | null {
  return effect.type === "roll" ? effect.completed : null;
}

export function canAppendAfterHistory(
  lastHistoryTime: number | null,
  barTime: number,
): boolean {
  if (lastHistoryTime === null) {
    return true;
  }
  return barTime > lastHistoryTime;
}

function toDecimalString(value: number): string {
  return value.toFixed(8);
}

export function completedToIngestRequest(
  completed: MarketCandle,
  symbol: string = CHART_SYMBOL,
): CandleIngestRequest {
  return {
    symbol,
    interval: CHART_INTERVAL,
    candles: [
      {
        bucketStart: new Date(completed.time * 1000).toISOString(),
        open: toDecimalString(completed.open),
        high: toDecimalString(completed.high),
        low: toDecimalString(completed.low),
        close: toDecimalString(completed.close),
        volume: null,
      },
    ],
  };
}

export async function postCompletedBar(
  completed: MarketCandle,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchImpl("/api/candles", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(completedToIngestRequest(completed)),
    cache: "no-store",
  });
  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new BackendError(
      `candles ingest failed: ${res.status}`,
      res.status,
      parseErrorResponse(payload),
    );
  }
  parseCandleIngestResponse(payload);
}
