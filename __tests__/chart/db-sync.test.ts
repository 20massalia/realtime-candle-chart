import { describe, expect, it, vi } from "vitest";
import {
  canAppendAfterHistory,
  completedToIngestRequest,
  FALLBACK_GBM_PRICE,
  gbmStartPrice,
  persistableCompleted,
  postCompletedBar,
  toChartCandles,
} from "@/lib/chart/db-sync";
import { applyTick, createAggregateState } from "@/lib/market/aggregate";
import type { Candle as ApiCandle } from "@/lib/api/candles";

const seedBar: ApiCandle = {
  bucketStart: "2026-08-14T00:30:00Z",
  open: "75000.00000000",
  high: "75100.00000000",
  low: "74950.00000000",
  close: "75050.00000000",
  volume: 1000,
};

describe("toChartCandles", () => {
  it("maps OpenAPI decimal candles to unix-second LWC bars", () => {
    expect(toChartCandles([seedBar])).toEqual([
      {
        time: Date.parse("2026-08-14T00:30:00Z") / 1000,
        open: 75000,
        high: 75100,
        low: 74950,
        close: 75050,
      },
    ]);
  });
});

describe("gbmStartPrice", () => {
  it("uses the last history close, else the Samsung mock mid", () => {
    expect(gbmStartPrice([])).toBe(FALLBACK_GBM_PRICE);
    expect(gbmStartPrice(toChartCandles([seedBar]))).toBe(75050);
  });
});

describe("persistableCompleted", () => {
  it("does not persist forming-bar updates", () => {
    const { effects } = applyTick(createAggregateState(), {
      ts: 60_000,
      price: 75000,
    });
    expect(effects[0]?.type).toBe("update");
    expect(persistableCompleted(effects[0]!)).toBeNull();
  });

  it("persists only the completed bar on roll", () => {
    let { state } = applyTick(createAggregateState(), {
      ts: 60_000,
      price: 75000,
    });
    ({ state } = applyTick(state, { ts: 90_000, price: 75100 }));
    const rolled = applyTick(state, { ts: 120_000, price: 75200 });
    expect(rolled.effects[0]?.type).toBe("roll");
    expect(persistableCompleted(rolled.effects[0]!)).toEqual({
      time: 60,
      open: 75000,
      high: 75100,
      low: 75000,
      close: 75100,
    });
  });
});

describe("completedToIngestRequest", () => {
  it("builds a 1-bar POST body with decimal strings and null volume", () => {
    expect(
      completedToIngestRequest({
        time: Date.parse("2026-08-17T01:00:00Z") / 1000,
        open: 75000,
        high: 75100,
        low: 74950,
        close: 75050,
      }),
    ).toEqual({
      symbol: "005930",
      interval: "1m",
      candles: [
        {
          bucketStart: "2026-08-17T01:00:00.000Z",
          open: "75000.00000000",
          high: "75100.00000000",
          low: "74950.00000000",
          close: "75050.00000000",
          volume: null,
        },
      ],
    });
  });
});

describe("canAppendAfterHistory", () => {
  it("drops bars at or before the last hydrated time", () => {
    expect(canAppendAfterHistory(null, 100)).toBe(true);
    expect(canAppendAfterHistory(100, 101)).toBe(true);
    expect(canAppendAfterHistory(100, 100)).toBe(false);
    expect(canAppendAfterHistory(100, 99)).toBe(false);
  });
});

describe("postCompletedBar", () => {
  it("POSTs the completed bar to the same-origin BFF", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ symbol: "005930", interval: "1m", upserted: 1 }),
    });
    await postCompletedBar(
      {
        time: Date.parse("2026-08-17T01:00:00Z") / 1000,
        open: 75000,
        high: 75100,
        low: 74950,
        close: 75050,
      },
      fetchImpl as unknown as typeof fetch,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/candles");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body)) as {
      candles: Array<{ volume: null; open: string }>;
    };
    expect(body.candles).toHaveLength(1);
    expect(body.candles[0]?.volume).toBeNull();
    expect(body.candles[0]?.open).toBe("75000.00000000");
  });
});
