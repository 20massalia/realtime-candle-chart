/** Types and fetch helpers derived from docs/specs/api/candles.openapi.yaml */

export type CandleInterval = "1m" | "5m" | "1h" | "1d";

export type Candle = {
  bucketStart: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: number | null;
};

export type CandleListResponse = {
  symbol: string;
  interval: string;
  candles: Candle[];
};

export type CandleIngestRequest = {
  symbol: string;
  interval: CandleInterval;
  candles: Candle[];
};

export type CandleIngestResponse = {
  symbol: string;
  interval: string;
  upserted: number;
};

export type ErrorResponse = {
  code: string;
  message: string;
  traceId: string | null;
};

export class BackendError extends Error {
  readonly status: number;
  readonly body: ErrorResponse | null;

  constructor(message: string, status: number, body: ErrorResponse | null) {
    super(message);
    this.name = "BackendError";
    this.status = status;
    this.body = body;
  }
}

export const DEFAULT_CANDLE_SYMBOL = "005930";

/** OpenAPI `symbol` pattern: `^[A-Z0-9.]{1,10}$` */
export function isCandleSymbol(value: string): boolean {
  return /^[A-Z0-9.]{1,10}$/.test(value);
}

export function isCandleInterval(value: string): value is CandleInterval {
  return value === "1m" || value === "5m" || value === "1h" || value === "1d";
}

export function parseErrorResponse(data: unknown): ErrorResponse | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const record = data as Record<string, unknown>;
  if (typeof record.code !== "string" || typeof record.message !== "string") {
    return null;
  }
  return {
    code: record.code,
    message: record.message,
    traceId: typeof record.traceId === "string" ? record.traceId : null,
  };
}

export function parseCandleListResponse(data: unknown): CandleListResponse {
  if (typeof data !== "object" || data === null) {
    throw new Error("Candle list response must be an object");
  }
  const record = data as Record<string, unknown>;
  if (typeof record.symbol !== "string" || typeof record.interval !== "string") {
    throw new Error("Candle list response is missing symbol or interval");
  }
  if (!Array.isArray(record.candles)) {
    throw new Error("Candle list response is missing candles");
  }
  return {
    symbol: record.symbol,
    interval: record.interval,
    candles: record.candles.map(parseCandle),
  };
}

function parseCandle(data: unknown): Candle {
  if (typeof data !== "object" || data === null) {
    throw new Error("Candle must be an object");
  }
  const record = data as Record<string, unknown>;
  const decimalFields = ["open", "high", "low", "close"] as const;
  for (const field of decimalFields) {
    if (typeof record[field] !== "string") {
      throw new Error(`Candle.${field} must be a decimal string`);
    }
  }
  if (typeof record.bucketStart !== "string") {
    throw new Error("Candle.bucketStart must be a date-time string");
  }
  const volume = record.volume;
  if (volume !== undefined && volume !== null && typeof volume !== "number") {
    throw new Error("Candle.volume must be an integer or null");
  }
  return {
    bucketStart: record.bucketStart,
    open: record.open as string,
    high: record.high as string,
    low: record.low as string,
    close: record.close as string,
    volume: typeof volume === "number" ? volume : null,
  };
}

export async function fetchCandles(options: {
  baseUrl: string;
  symbol: string;
  interval: CandleInterval;
  limit?: number;
}): Promise<CandleListResponse> {
  const url = new URL("/api/v1/candles", options.baseUrl);
  url.searchParams.set("symbol", options.symbol);
  url.searchParams.set("interval", options.interval);
  if (options.limit !== undefined) {
    url.searchParams.set("limit", String(options.limit));
  }

  const res = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new BackendError(
      `candles fetch failed: ${res.status}`,
      res.status,
      parseErrorResponse(payload),
    );
  }
  return parseCandleListResponse(payload);
}

export function parseCandleIngestResponse(data: unknown): CandleIngestResponse {
  if (typeof data !== "object" || data === null) {
    throw new Error("Candle ingest response must be an object");
  }
  const record = data as Record<string, unknown>;
  if (typeof record.symbol !== "string" || typeof record.interval !== "string") {
    throw new Error("Candle ingest response is missing symbol or interval");
  }
  if (typeof record.upserted !== "number" || !Number.isInteger(record.upserted)) {
    throw new Error("Candle ingest response.upserted must be an integer");
  }
  return {
    symbol: record.symbol,
    interval: record.interval,
    upserted: record.upserted,
  };
}

export async function ingestCandles(options: {
  baseUrl: string;
  body: CandleIngestRequest;
}): Promise<CandleIngestResponse> {
  const url = new URL("/api/v1/candles", options.baseUrl);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(options.body),
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
  return parseCandleIngestResponse(payload);
}
