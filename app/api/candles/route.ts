import { NextResponse } from "next/server";
import {
  BackendError,
  fetchCandles,
  ingestCandles,
  isCandleInterval,
  isCandleSymbol,
  parseErrorResponse,
  type Candle,
  type CandleIngestRequest,
} from "@/lib/api/candles";

function backendUnavailable() {
  return NextResponse.json(
    {
      code: "BACKEND_UNAVAILABLE",
      message: "BACKEND_URL is not set",
      traceId: null,
    },
    { status: 503 },
  );
}

function invalidQuery(message: string) {
  return NextResponse.json(
    {
      code: "INVALID_QUERY",
      message,
      traceId: null,
    },
    { status: 400 },
  );
}

function upstreamError(error: unknown) {
  if (error instanceof BackendError) {
    return NextResponse.json(
      error.body ?? {
        code: "UPSTREAM_ERROR",
        message: error.message,
        traceId: null,
      },
      { status: error.status },
    );
  }
  const parsed = parseErrorResponse(error);
  return NextResponse.json(
    parsed ?? {
      code: "BACKEND_UNAVAILABLE",
      message: "Failed to reach candles API",
      traceId: null,
    },
    { status: 502 },
  );
}

export async function GET(request: Request) {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    return backendUnavailable();
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") ?? "";
  const interval = searchParams.get("interval") ?? "";
  const limitRaw = searchParams.get("limit");

  if (!isCandleSymbol(symbol) || !isCandleInterval(interval)) {
    return invalidQuery("symbol and a valid interval (1m, 5m, 1h, 1d) are required");
  }

  const limit = limitRaw === null ? undefined : Number(limitRaw);
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 1000)) {
    return invalidQuery("limit must be an integer between 1 and 1000");
  }

  try {
    const body = await fetchCandles({
      baseUrl: backendUrl,
      symbol,
      interval,
      limit,
    });
    return NextResponse.json(body);
  } catch (error) {
    return upstreamError(error);
  }
}

function isDecimalString(value: unknown): value is string {
  return typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value);
}

function parseIngestBody(data: unknown): CandleIngestRequest | NextResponse {
  if (typeof data !== "object" || data === null) {
    return invalidQuery("body must be an object");
  }
  const record = data as Record<string, unknown>;
  if (typeof record.symbol !== "string" || typeof record.interval !== "string") {
    return invalidQuery("symbol and a valid interval (1m, 5m, 1h, 1d) are required");
  }
  if (!isCandleInterval(record.interval)) {
    return invalidQuery("symbol and a valid interval (1m, 5m, 1h, 1d) are required");
  }
  if (!isCandleSymbol(record.symbol)) {
    return invalidQuery("symbol must match ^[A-Z0-9.]{1,10}$");
  }
  if (!Array.isArray(record.candles) || record.candles.length < 1 || record.candles.length > 500) {
    return invalidQuery("candles must contain between 1 and 500 bars");
  }

  const candles: Candle[] = [];
  for (const item of record.candles) {
    if (typeof item !== "object" || item === null) {
      return invalidQuery("each candle must be an object");
    }
    const bar = item as Record<string, unknown>;
    if (typeof bar.bucketStart !== "string") {
      return invalidQuery("bucketStart must be a date-time string");
    }
    if (
      !isDecimalString(bar.open) ||
      !isDecimalString(bar.high) ||
      !isDecimalString(bar.low) ||
      !isDecimalString(bar.close)
    ) {
      return invalidQuery("open, high, low, and close must be decimal strings");
    }
    const volume = bar.volume;
    if (volume !== undefined && volume !== null && typeof volume !== "number") {
      return invalidQuery("volume must be an integer or null");
    }
    candles.push({
      bucketStart: bar.bucketStart,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: typeof volume === "number" ? volume : null,
    });
  }

  return {
    symbol: record.symbol,
    interval: record.interval,
    candles,
  };
}

export async function POST(request: Request) {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    return backendUnavailable();
  }

  const raw: unknown = await request.json().catch(() => null);
  const parsed = parseIngestBody(raw);
  if (parsed instanceof NextResponse) {
    return parsed;
  }

  try {
    const body = await ingestCandles({ baseUrl: backendUrl, body: parsed });
    return NextResponse.json(body);
  } catch (error) {
    return upstreamError(error);
  }
}
