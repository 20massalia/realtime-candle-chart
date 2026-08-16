import {
  BackendError,
  DEFAULT_CANDLE_SYMBOL,
  fetchCandles,
  isCandleInterval,
  type CandleInterval,
} from "@/lib/api/candles";
import { CandleIngestForm } from "@/components/candles/CandleIngestForm";

export default async function CandlesPage({
  searchParams,
}: {
  searchParams: Promise<{
    symbol?: string;
    interval?: string;
    limit?: string;
  }>;
}) {
  const params = await searchParams;
  const symbol = (params.symbol ?? DEFAULT_CANDLE_SYMBOL).toUpperCase();
  const intervalParam = params.interval ?? "1m";
  const interval: CandleInterval = isCandleInterval(intervalParam)
    ? intervalParam
    : "1m";
  const limit = params.limit ? Number(params.limit) : 200;

  const backendUrl = process.env.BACKEND_URL;
  let result:
    | { ok: true; data: Awaited<ReturnType<typeof fetchCandles>> }
    | { ok: false; message: string; code: string };

  if (!backendUrl) {
    result = {
      ok: false,
      code: "BACKEND_UNAVAILABLE",
      message: "BACKEND_URL is not set",
    };
  } else {
    try {
      const data = await fetchCandles({
        baseUrl: backendUrl,
        symbol,
        interval,
        limit: Number.isInteger(limit) ? limit : 200,
      });
      result = { ok: true, data };
    } catch (error) {
      if (error instanceof BackendError) {
        result = {
          ok: false,
          code: error.body?.code ?? "UPSTREAM_ERROR",
          message: error.body?.message ?? error.message,
        };
      } else {
        result = {
          ok: false,
          code: "BACKEND_UNAVAILABLE",
          message: "Failed to reach candles API",
        };
      }
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-4 py-8 dark:bg-zinc-950 sm:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <header>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Candles API 검증
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            GET /api/v1/candles — {symbol} {interval}
          </p>
        </header>
        <CandleIngestForm symbol={symbol} interval={interval} />
        {result.ok ? (
          <table className="w-full border-collapse text-left text-sm text-zinc-800 dark:text-zinc-200">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2 pr-3 font-medium">bucketStart</th>
                <th className="py-2 pr-3 font-medium">open</th>
                <th className="py-2 pr-3 font-medium">high</th>
                <th className="py-2 pr-3 font-medium">low</th>
                <th className="py-2 pr-3 font-medium">close</th>
                <th className="py-2 font-medium">volume</th>
              </tr>
            </thead>
            <tbody>
              {result.data.candles.length === 0 ? (
                <tr>
                  <td className="py-3" colSpan={6}>
                    캔들이 없습니다.
                  </td>
                </tr>
              ) : (
                result.data.candles.map((candle) => (
                  <tr
                    key={candle.bucketStart}
                    className="border-b border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="py-2 pr-3 font-mono">{candle.bucketStart}</td>
                    <td className="py-2 pr-3 font-mono">{candle.open}</td>
                    <td className="py-2 pr-3 font-mono">{candle.high}</td>
                    <td className="py-2 pr-3 font-mono">{candle.low}</td>
                    <td className="py-2 pr-3 font-mono">{candle.close}</td>
                    <td className="py-2 font-mono">
                      {candle.volume === null ? "—" : candle.volume}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <p
            data-testid="candles-error"
            role="alert"
            className="text-sm text-red-700 dark:text-red-400"
          >
            {result.code}: {result.message}
          </p>
        )}
      </div>
    </div>
  );
}
