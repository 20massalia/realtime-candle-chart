import type { AggregateEffect } from "@/lib/market/aggregate";
import type { Candle as MarketCandle } from "@/lib/market/types";
import type { CandleStreamEvent } from "@/lib/api/candles-stream";
import { toChartCandles } from "@/lib/chart/db-sync";

export function streamEventToEffects(
  event: CandleStreamEvent,
): readonly AggregateEffect[] {
  const candle = toChartCandles([event.candle])[0];
  if (candle === undefined) {
    return [];
  }
  if (event.type === "roll") {
    if (event.completed == null) {
      return [{ type: "update", candle }];
    }
    const completed = toChartCandles([event.completed])[0];
    if (completed === undefined) {
      return [{ type: "update", candle }];
    }
    return [{ type: "roll", completed, candle }];
  }
  return [{ type: "update", candle }];
}

export function barsForEffect(effect: AggregateEffect): readonly MarketCandle[] {
  if (effect.type === "roll") {
    return [effect.completed, effect.candle];
  }
  return [effect.candle];
}
