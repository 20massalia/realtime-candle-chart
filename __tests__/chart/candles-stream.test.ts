import { describe, expect, it } from "vitest";
import {
  buildCandleWebSocketUrl,
  boundStreamQueue,
  drainStreamQueue,
  nextReconnectDelayMs,
  parseCandleStreamEvent,
  retainLatestEvent,
} from "@/lib/api/candles-stream";
import { barsForEffect, streamEventToEffects } from "@/lib/chart/stream-map";

const forming = {
  bucketStart: "2026-08-17T01:01:00Z",
  open: "75000.00000000",
  high: "75100.00000000",
  low: "74950.00000000",
  close: "75050.00000000",
  volume: null,
};

const completed = {
  bucketStart: "2026-08-17T01:00:00Z",
  open: "74800.00000000",
  high: "75200.00000000",
  low: "74700.00000000",
  close: "75000.00000000",
  volume: null,
};

describe("parseCandleStreamEvent", () => {
  it("accepts an OpenAPI update fixture with decimal strings", () => {
    const parsed = parseCandleStreamEvent({
      type: "update",
      symbol: "005930",
      interval: "1m",
      candle: forming,
    });
    expect(parsed.type).toBe("update");
    expect(parsed.candle.open).toBe("75000.00000000");
    expect(parsed.completed).toBeUndefined();
  });

  it("requires completed on roll", () => {
    expect(() =>
      parseCandleStreamEvent({
        type: "roll",
        symbol: "005930",
        interval: "1m",
        candle: forming,
      }),
    ).toThrow(/completed/);
    const parsed = parseCandleStreamEvent({
      type: "roll",
      symbol: "005930",
      interval: "1m",
      candle: forming,
      completed,
    });
    expect(parsed.completed?.close).toBe("75000.00000000");
  });

  it("rejects numeric prices", () => {
    expect(() =>
      parseCandleStreamEvent({
        type: "update",
        symbol: "005930",
        interval: "1m",
        candle: { ...forming, open: 75000 },
      }),
    ).toThrow(/decimal string/);
  });
});

describe("buildCandleWebSocketUrl", () => {
  it("appends symbol and interval query params", () => {
    expect(
      buildCandleWebSocketUrl({
        symbol: "005930",
        interval: "1m",
      }),
    ).toBe("ws://localhost:8080/ws/v1/candles?symbol=005930&interval=1m");
  });
});

describe("streamEventToEffects", () => {
  it("maps update to a single LWC bar", () => {
    const effects = streamEventToEffects(
      parseCandleStreamEvent({
        type: "update",
        symbol: "005930",
        interval: "1m",
        candle: forming,
      }),
    );
    expect(effects).toHaveLength(1);
    expect(effects[0]?.type).toBe("update");
    expect(barsForEffect(effects[0]!)).toHaveLength(1);
  });

  it("maps roll to completed then forming bars", () => {
    const effects = streamEventToEffects(
      parseCandleStreamEvent({
        type: "roll",
        symbol: "005930",
        interval: "1m",
        candle: forming,
        completed,
      }),
    );
    expect(effects[0]?.type).toBe("roll");
    const bars = barsForEffect(effects[0]!);
    expect(bars[0]?.time).toBe(Date.parse(completed.bucketStart) / 1000);
    expect(bars[1]?.time).toBe(Date.parse(forming.bucketStart) / 1000);
  });
});

describe("drainStreamQueue", () => {
  it("drains in order and empties the queue", () => {
    const seen: string[] = [];
    const a = parseCandleStreamEvent({
      type: "update",
      symbol: "005930",
      interval: "1m",
      candle: forming,
    });
    const queue = [a];
    drainStreamQueue(queue, (event) => {
      seen.push(event.type);
    });
    expect(seen).toEqual(["update"]);
    expect(queue).toEqual([]);
  });
});

describe("retainLatestEvent", () => {
  it("keeps only the last event when hidden", () => {
    const a = parseCandleStreamEvent({
      type: "update",
      symbol: "005930",
      interval: "1m",
      candle: forming,
    });
    const b = parseCandleStreamEvent({
      type: "update",
      symbol: "005930",
      interval: "1m",
      candle: { ...forming, close: "75100.00000000" },
    });
    expect(retainLatestEvent([a, b])).toEqual([b]);
  });
});

describe("boundStreamQueue", () => {
  it("keeps the full queue while the chart is draining", () => {
    const a = parseCandleStreamEvent({
      type: "update",
      symbol: "005930",
      interval: "1m",
      candle: forming,
    });
    const b = parseCandleStreamEvent({
      type: "update",
      symbol: "005930",
      interval: "1m",
      candle: { ...forming, close: "75100.00000000" },
    });
    expect(boundStreamQueue([a, b], { hidden: false, paused: false })).toEqual([
      a,
      b,
    ]);
  });

  it("keeps only the last event when paused or hidden", () => {
    const a = parseCandleStreamEvent({
      type: "update",
      symbol: "005930",
      interval: "1m",
      candle: forming,
    });
    const b = parseCandleStreamEvent({
      type: "update",
      symbol: "005930",
      interval: "1m",
      candle: { ...forming, close: "75100.00000000" },
    });
    expect(boundStreamQueue([a, b], { hidden: false, paused: true })).toEqual([
      b,
    ]);
    expect(boundStreamQueue([a, b], { hidden: true, paused: false })).toEqual([
      b,
    ]);
  });
});

describe("nextReconnectDelayMs", () => {
  it("caps exponential backoff", () => {
    expect(nextReconnectDelayMs(0)).toBe(500);
    expect(nextReconnectDelayMs(1)).toBe(1000);
    expect(nextReconnectDelayMs(10)).toBe(8000);
  });
});
