import { CandleChartDynamic } from "@/components/chart/CandleChartDynamic";
import {
  BackendError,
  DEFAULT_CANDLE_SYMBOL,
  fetchCandles,
  type Candle,
} from "@/lib/api/candles";
import { CHART_INTERVAL } from "@/lib/chart/db-sync";

async function loadChartHistory(): Promise<{
  candles: Candle[];
  hydrateError: string | null;
}> {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    return { candles: [], hydrateError: "BACKEND_URL is not set" };
  }
  try {
    const data = await fetchCandles({
      baseUrl: backendUrl,
      symbol: DEFAULT_CANDLE_SYMBOL,
      interval: CHART_INTERVAL,
    });
    return { candles: data.candles, hydrateError: null };
  } catch (error) {
    if (error instanceof BackendError) {
      return {
        candles: [],
        hydrateError: error.body?.message ?? error.message,
      };
    }
    return { candles: [], hydrateError: "Failed to reach candles API" };
  }
}

export default async function Home() {
  const { candles, hydrateError } = await loadChartHistory();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-4 py-8 dark:bg-zinc-950 sm:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <header>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            실시간 캔들
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            GET hydrate → 서버 GBM/1m 집계 → WebSocket 스트림
          </p>
          <p className="mt-2 text-sm">
            <a
              className="text-zinc-700 underline dark:text-zinc-300"
              href="/candles"
            >
              Candles API 검증
            </a>
          </p>
        </header>
        <CandleChartDynamic
          initialCandles={candles}
          hydrateError={hydrateError}
        />
      </div>
    </div>
  );
}
