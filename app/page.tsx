import { CandleChartDynamic } from "@/components/chart/CandleChartDynamic";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-4 py-8 dark:bg-zinc-950 sm:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <header>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            실시간 캔들 (Phase 1 Mock)
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            GBM 틱 → 큐 → requestAnimationFrame 집계 → Lightweight Charts
          </p>
        </header>
        <CandleChartDynamic />
      </div>
    </div>
  );
}
