import { describe, expect, it } from "vitest";
import {
  parseCandleIngestResponse,
  parseCandleListResponse,
  parseErrorResponse,
  isCandleSymbol,
  DEFAULT_CANDLE_SYMBOL,
} from "@/lib/api/candles";

const contractFixture = {
  symbol: "005930",
  interval: "1m",
  candles: [
    {
      bucketStart: "2026-08-14T00:30:00Z",
      open: "75000.00000000",
      high: "75100.00000000",
      low: "74950.00000000",
      close: "75050.00000000",
      volume: 1000,
    },
  ],
};

describe("isCandleSymbol", () => {
  it("accepts the Samsung Electronics mock ticker and letter tickers", () => {
    expect(DEFAULT_CANDLE_SYMBOL).toBe("005930");
    expect(isCandleSymbol("005930")).toBe(true);
    expect(isCandleSymbol("AAPL")).toBe(true);
  });

  it("rejects hyphenated or over-long symbols", () => {
    expect(isCandleSymbol("005930-KS")).toBe(false);
    expect(isCandleSymbol("12345678901")).toBe(false);
  });
});

describe("parseCandleListResponse", () => {
  it("accepts a payload shaped like the OpenAPI CandleListResponse", () => {
    const parsed = parseCandleListResponse(contractFixture);
    expect(parsed.symbol).toBe("005930");
    expect(parsed.candles[0]?.open).toBe("75000.00000000");
    expect(parsed.candles[0]?.volume).toBe(1000);
  });

  it("rejects numeric prices (precision must stay a string)", () => {
    expect(() =>
      parseCandleListResponse({
        ...contractFixture,
        candles: [{ ...contractFixture.candles[0], open: 75000 }],
      }),
    ).toThrow(/open must be a decimal string/);
  });
});

describe("parseErrorResponse", () => {
  it("reads the shared ErrorResponse fields", () => {
    expect(
      parseErrorResponse({
        code: "UNKNOWN_SYMBOL",
        message: "Unknown symbol: ZZZZ",
        traceId: "abc",
      }),
    ).toEqual({
      code: "UNKNOWN_SYMBOL",
      message: "Unknown symbol: ZZZZ",
      traceId: "abc",
    });
  });
});

describe("parseCandleIngestResponse", () => {
  it("accepts a payload shaped like the OpenAPI CandleIngestResponse", () => {
    expect(
      parseCandleIngestResponse({
        symbol: "MSFT",
        interval: "1m",
        upserted: 1,
      }),
    ).toEqual({
      symbol: "MSFT",
      interval: "1m",
      upserted: 1,
    });
  });

  it("rejects a missing upserted count", () => {
    expect(() =>
      parseCandleIngestResponse({
        symbol: "MSFT",
        interval: "1m",
      }),
    ).toThrow(/upserted must be an integer/);
  });
});
